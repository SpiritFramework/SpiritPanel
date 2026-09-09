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

function isPrivateOrReservedIpv6(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
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
