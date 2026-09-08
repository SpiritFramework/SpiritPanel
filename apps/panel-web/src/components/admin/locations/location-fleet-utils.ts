import type { AdminLocationSummary, AdminNodeSummary } from '../../../lib/api';
import { getNodeFleetStatus } from '../nodes/node-fleet-utils';

export type LocationFleetFilter = 'all' | 'in_use' | 'empty';

export interface LocationFleetMetrics {
  location: AdminLocationSummary;
  nodeCount: number;
  serverCount: number;
  allocationCount: number;
  onlineNodes: number;
  maintenanceNodes: number;
  offlineNodes: number;
}

export interface LocationFleetStats {
  total: number;
  inUse: number;
  empty: number;
  nodes: number;
  servers: number;
  allocations: number;
}

export function computeLocationFleetStats(
  locations: AdminLocationSummary[],
  nodes: AdminNodeSummary[],
): LocationFleetStats {
  return {
    total: locations.length,
    inUse: locations.filter((l) => l._count.nodes > 0).length,
    empty: locations.filter((l) => l._count.nodes === 0).length,
    nodes: nodes.length,
    servers: nodes.reduce((n, node) => n + node._count.servers, 0),
    allocations: nodes.reduce((n, node) => n + node._count.allocations, 0),
  };
}

export function buildLocationMetrics(
  locations: AdminLocationSummary[],
  nodes: AdminNodeSummary[],
): LocationFleetMetrics[] {
  const byLocation = new Map<string, AdminNodeSummary[]>();
  for (const node of nodes) {
    const list = byLocation.get(node.location.id) ?? [];
    list.push(node);
    byLocation.set(node.location.id, list);
  }

  return locations.map((location) => {
    const group = byLocation.get(location.id) ?? [];
    let onlineNodes = 0;
    let maintenanceNodes = 0;
    let offlineNodes = 0;
    let serverCount = 0;
    let allocationCount = 0;

    for (const node of group) {
      const status = getNodeFleetStatus(node);
      if (status === 'online') onlineNodes++;
      else if (status === 'maintenance') maintenanceNodes++;
      else offlineNodes++;
      serverCount += node._count.servers;
      allocationCount += node._count.allocations;
    }

    return {
      location,
      nodeCount: location._count.nodes,
      serverCount,
      allocationCount,
      onlineNodes,
      maintenanceNodes,
      offlineNodes,
    };
  });
}

export function matchesLocationFilter(
  metrics: LocationFleetMetrics,
  filter: LocationFleetFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'in_use') return metrics.nodeCount > 0;
  return metrics.nodeCount === 0;
}

export function matchesLocationSearch(metrics: LocationFleetMetrics, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { location } = metrics;
  return (
    location.short.toLowerCase().includes(q) ||
    location.long.toLowerCase().includes(q) ||
    location.uuid.toLowerCase().includes(q) ||
    location.id.toLowerCase().includes(q)
  );
}
