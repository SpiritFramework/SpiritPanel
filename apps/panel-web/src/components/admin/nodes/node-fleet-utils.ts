import type { AdminLocationSummary, AdminNodeSummary } from '../../../lib/api';

export type NodeFleetFilter = 'all' | 'online' | 'maintenance' | 'offline';

export type NodeFleetStatus = 'online' | 'maintenance' | 'offline';

export function getNodeFleetStatus(node: AdminNodeSummary): NodeFleetStatus {
  if (node.maintenanceMode) return 'maintenance';
  if (node.online === false) return 'offline';
  return 'online';
}

export function matchesFleetFilter(node: AdminNodeSummary, filter: NodeFleetFilter): boolean {
  const status = getNodeFleetStatus(node);
  if (filter === 'all') return true;
  if (filter === 'online') return status === 'online';
  if (filter === 'maintenance') return status === 'maintenance';
  return status === 'offline';
}

export interface FleetStats {
  total: number;
  online: number;
  maintenance: number;
  offline: number;
  servers: number;
  allocations: number;
  allocatedMemory: number;
  allocatedDisk: number;
  memoryLimit: number;
  diskLimit: number;
}

export function computeFleetStats(nodes: AdminNodeSummary[]): FleetStats {
  return nodes.reduce(
    (acc, node) => {
      const status = getNodeFleetStatus(node);
      const cap = node.capacity;

      return {
        total: acc.total + 1,
        online: acc.online + (status === 'online' ? 1 : 0),
        maintenance: acc.maintenance + (status === 'maintenance' ? 1 : 0),
        offline: acc.offline + (status === 'offline' ? 1 : 0),
        servers: acc.servers + node._count.servers,
        allocations: acc.allocations + node._count.allocations,
        allocatedMemory: acc.allocatedMemory + (cap?.allocatedMemory ?? 0),
        allocatedDisk: acc.allocatedDisk + (cap?.allocatedDisk ?? 0),
        memoryLimit: acc.memoryLimit + (cap?.effectiveMemoryLimit ?? 0),
        diskLimit: acc.diskLimit + (cap?.effectiveDiskLimit ?? 0),
      };
    },
    {
      total: 0,
      online: 0,
      maintenance: 0,
      offline: 0,
      servers: 0,
      allocations: 0,
      allocatedMemory: 0,
      allocatedDisk: 0,
      memoryLimit: 0,
      diskLimit: 0,
    },
  );
}

export interface LocationFleetRow {
  location: Pick<AdminLocationSummary, 'id' | 'short' | 'long' | 'flagUrl'>;
  nodes: AdminNodeSummary[];
  online: number;
}

export function groupNodesByLocation(
  nodes: AdminNodeSummary[],
  locations: AdminLocationSummary[],
): LocationFleetRow[] {
  const byId = new Map<string, AdminNodeSummary[]>();
  for (const node of nodes) {
    const list = byId.get(node.location.id) ?? [];
    list.push(node);
    byId.set(node.location.id, list);
  }

  const rows: LocationFleetRow[] = [];
  for (const location of locations) {
    const group = byId.get(location.id);
    if (!group?.length) continue;
    rows.push({
      location,
      nodes: group,
      online: group.filter((n) => getNodeFleetStatus(n) === 'online').length,
    });
  }

  const known = new Set(locations.map((l) => l.id));
  for (const [locationId, group] of byId) {
    if (known.has(locationId)) continue;
    const sample = group[0]!;
    rows.push({
      location: sample.location,
      nodes: group,
      online: group.filter((n) => getNodeFleetStatus(n) === 'online').length,
    });
  }

  return rows.sort((a, b) => b.nodes.length - a.nodes.length);
}
