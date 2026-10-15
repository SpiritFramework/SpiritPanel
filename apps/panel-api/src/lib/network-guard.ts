import { isIP } from 'node:net';
import { promises as dns } from 'node:dns';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function isPrivateOrReservedIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/** Loopback / link-local / metadata — never safe as an outbound query target. */
function isLoopbackOrLinkLocalIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function extractIpv4Mapped(normalized: string): string | null {
  const lower = normalized.toLowerCase();
  // ::ffff:127.0.0.1 or ::ffff:7f00:1
  const dotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = Number.parseInt(hex[1], 16);
    const lo = Number.parseInt(hex[2], 16);
    if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

function isPrivateOrReservedIpv6(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA

  const mapped = extractIpv4Mapped(lower);
  if (mapped) {
    const parts = mapped.split('.').map((n) => Number(n));
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return isPrivateOrReservedIpv4(parts);
    }
  }
  return false;
}

function isLoopbackOrLinkLocalIpv6(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true;

  const mapped = extractIpv4Mapped(lower);
  if (mapped) {
    const parts = mapped.split('.').map((n) => Number(n));
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return isLoopbackOrLinkLocalIpv4(parts);
    }
  }
  return false;
}

function assertIpAllowed(ip: string, label: string): void {
  const ipVersion = isIP(ip);
  if (ipVersion === 4) {
    const parts = ip.split('.').map((n) => Number(n));
    if (isPrivateOrReservedIpv4(parts)) {
      throw Object.assign(new Error(`Private or reserved ${label.toLowerCase()}s are not allowed`), {
        statusCode: 422,
      });
    }
    return;
  }
  if (ipVersion === 6) {
    if (isPrivateOrReservedIpv6(ip)) {
      throw Object.assign(new Error(`Private or reserved ${label.toLowerCase()}s are not allowed`), {
        statusCode: 422,
      });
    }
  }
}

export function assertPublicDatabaseHost(host: string): void {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) {
    throw Object.assign(new Error('Database host is required'), { statusCode: 422 });
  }

  if (BLOCKED_HOSTNAMES.has(trimmed)) {
    throw Object.assign(new Error('That database host is not allowed'), { statusCode: 422 });
  }

  const ipVersion = isIP(trimmed);
  if (ipVersion === 4 || ipVersion === 6) {
    assertIpAllowed(trimmed, 'Database host');
    return;
  }

  // Hostname — disallow obvious local names; operators should use public FQDNs reachable from the panel.
  if (trimmed.endsWith('.local') || trimmed.endsWith('.internal')) {
    throw Object.assign(new Error('Local network database hostnames are not allowed'), {
      statusCode: 422,
    });
  }
}

/** Resolve hostname and reject if any A/AAAA is private/reserved (SSRF hardening). */
export async function assertPublicDatabaseHostResolved(host: string): Promise<void> {
  assertPublicDatabaseHost(host);
  const trimmed = host.trim().toLowerCase();
  if (isIP(trimmed)) return;

  let addresses: string[] = [];
  try {
    const [v4, v6] = await Promise.all([
      dns.resolve4(trimmed).catch(() => [] as string[]),
      dns.resolve6(trimmed).catch(() => [] as string[]),
    ]);
    addresses = [...v4, ...v6];
  } catch {
    throw Object.assign(new Error('Could not resolve database host'), { statusCode: 422 });
  }

  if (addresses.length === 0) {
    throw Object.assign(new Error('Could not resolve database host'), { statusCode: 422 });
  }

  for (const addr of addresses) {
    assertIpAllowed(addr, 'Database host');
  }
}

/** Block private/reserved hosts for outbound panel connections (SMTP, etc.). */
export function assertPublicOutboundHost(host: string, label = 'Host'): void {
  try {
    assertPublicDatabaseHost(host);
  } catch (err) {
    if (err instanceof Error && typeof (err as { statusCode?: number }).statusCode === 'number') {
      const statusCode = (err as unknown as { statusCode: number }).statusCode;
      const message = err.message
        .replace('Database host', label)
        .replace('database host', label.toLowerCase());
      throw Object.assign(new Error(message), { statusCode });
    }
    throw err;
  }
}

export async function assertPublicOutboundHostResolved(host: string, label = 'Host'): Promise<void> {
  try {
    await assertPublicDatabaseHostResolved(host);
  } catch (err) {
    if (err instanceof Error && typeof (err as { statusCode?: number }).statusCode === 'number') {
      const statusCode = (err as unknown as { statusCode: number }).statusCode;
      const message = err.message
        .replace('Database host', label)
        .replace('database host', label.toLowerCase());
      throw Object.assign(new Error(message), { statusCode });
    }
    throw err;
  }
}

/**
 * Game player queries may target RFC1918 allocation IPs on the node LAN.
 * Still block loopback, link-local, and cloud metadata hostnames (SSRF).
 */
export function isUnsafeGameQueryHost(host: string): boolean {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return true;
  if (BLOCKED_HOSTNAMES.has(trimmed)) return true;
  if (trimmed.endsWith('.local') || trimmed.endsWith('.internal')) return true;

  const ipVersion = isIP(trimmed);
  if (ipVersion === 4) {
    const parts = trimmed.split('.').map((n) => Number(n));
    return isLoopbackOrLinkLocalIpv4(parts);
  }
  if (ipVersion === 6) {
    return isLoopbackOrLinkLocalIpv6(trimmed);
  }
  return false;
}
