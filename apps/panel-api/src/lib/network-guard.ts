import { isIP } from 'node:net';

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

export function assertPublicDatabaseHost(host: string): void {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) {
    throw Object.assign(new Error('Database host is required'), { statusCode: 422 });
  }

  if (BLOCKED_HOSTNAMES.has(trimmed)) {
    throw Object.assign(new Error('That database host is not allowed'), { statusCode: 422 });
  }

  const ipVersion = isIP(trimmed);
  if (ipVersion === 4) {
    const parts = trimmed.split('.').map((n) => Number(n));
    if (isPrivateOrReservedIpv4(parts)) {
      throw Object.assign(new Error('Private or reserved database hosts are not allowed'), {
        statusCode: 422,
      });
    }
    return;
  }

  if (ipVersion === 6) {
    if (isPrivateOrReservedIpv6(trimmed)) {
      throw Object.assign(new Error('Private or reserved database hosts are not allowed'), {
        statusCode: 422,
      });
    }
    return;
  }

  // Hostname — disallow obvious local names; operators should use public FQDNs reachable from the panel.
  if (trimmed.endsWith('.local') || trimmed.endsWith('.internal')) {
    throw Object.assign(new Error('Local network database hostnames are not allowed'), {
      statusCode: 422,
    });
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
