export interface AllocationAddressInput {
  ip: string;
  port: number;
  alias?: string | null;
}

export interface NodeAddressInput {
  fqdn: string;
}

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
