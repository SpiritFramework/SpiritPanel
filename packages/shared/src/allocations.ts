export interface AllocationAddressInput {
  ip: string;
  port: number;
  alias?: string | null;
}

export interface NodeAddressInput {
  fqdn: string;
}

/** Player-facing host for an allocation (FQDN when bind IP is 0.0.0.0). */
export function resolveAllocationHost(
  allocation: AllocationAddressInput,
  node: NodeAddressInput,
): string {
  if (allocation.alias?.trim()) return allocation.alias.trim();
  if (allocation.ip === '0.0.0.0') return node.fqdn;
  return allocation.ip;
}

export function formatAllocationAddress(
  allocation: AllocationAddressInput,
  node: NodeAddressInput,
): string {
  return `${resolveAllocationHost(allocation, node)}:${allocation.port}`;
}

/** SFTP username format expected by FeatherWings (username.serverShortId). */
export function formatSftpUsername(panelUsername: string, serverUuidShort: string): string {
  return `${panelUsername}.${serverUuidShort}`;
}

/** Bind IP sent to Wings — defaults to 0.0.0.0 when empty; public IPs are allowed. */
export function normalizeAllocationBindIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed || '0.0.0.0';
}

const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** Accepts IPv4 (incl. 0.0.0.0) or anything containing a colon (IPv6). */
export function isValidBindIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!trimmed) return false;
  if (IPV4_PATTERN.test(trimmed)) return true;
  // Lenient IPv6 check — must contain a colon and only hex/colon characters.
  return trimmed.includes(':') && /^[0-9a-f:]+$/i.test(trimmed);
}

export const MAX_ALLOCATION_PORTS_PER_REQUEST = 2000;
export const MIN_ALLOCATION_PORT = 1;
export const MAX_ALLOCATION_PORT = 65535;

/**
 * Parse Pterodactyl-style port input into a sorted list of unique ports.
 * Each entry may be a number, a single port (`"25565"`), an inclusive range
 * (`"25565-25570"`), or a comma-separated combination (`"25565,25570-25575"`).
 */
export function parseAllocationPorts(input: Array<number | string>): number[] {
  const ports = new Set<number>();

  const addPort = (value: number) => {
    if (!Number.isInteger(value) || value < MIN_ALLOCATION_PORT || value > MAX_ALLOCATION_PORT) {
      throw new Error(`Invalid port: ${value}. Ports must be between ${MIN_ALLOCATION_PORT} and ${MAX_ALLOCATION_PORT}.`);
    }
    ports.add(value);
  };

  for (const entry of input) {
    if (typeof entry === 'number') {
      addPort(entry);
      continue;
    }

    for (const token of entry.split(',')) {
      const piece = token.trim();
      if (!piece) continue;

      const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start > end) {
          throw new Error(`Invalid port range: ${piece} (start is greater than end).`);
        }
        if (end - start + 1 > MAX_ALLOCATION_PORTS_PER_REQUEST) {
          throw new Error(`Port range too large: ${piece} (max ${MAX_ALLOCATION_PORTS_PER_REQUEST} ports per request).`);
        }
        for (let port = start; port <= end; port++) addPort(port);
        continue;
      }

      if (!/^\d+$/.test(piece)) {
        throw new Error(`Invalid port value: "${piece}".`);
      }
      addPort(Number(piece));
    }
  }

  if (ports.size === 0) {
    throw new Error('No valid ports were provided.');
  }
  if (ports.size > MAX_ALLOCATION_PORTS_PER_REQUEST) {
    throw new Error(`Too many ports (${ports.size}). Maximum is ${MAX_ALLOCATION_PORTS_PER_REQUEST} per request.`);
  }

  return [...ports].sort((a, b) => a - b);
}
