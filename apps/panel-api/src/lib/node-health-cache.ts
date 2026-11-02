import type { Node } from '@prisma/client';
import { probeNodeHealth } from './node-health.js';

export interface NodeHealthSnapshot {
  id: string;
  name: string;
  fqdn: string;
  location: string;
  online: boolean;
  version: string | null;
  maintenanceMode: boolean;
  memory: number;
  disk: number;
  serverCount: number;
  allocationCount: number;
  capacity: unknown;
}

const CACHE_MS = 45_000;
const cache = new Map<string, { expiresAt: number; snapshot: NodeHealthSnapshot }>();

export async function getNodeHealthSnapshot(
  node: Node & {
    location: { short: string };
    _count: { servers: number; allocations: number };
  },
  capacity: unknown,
): Promise<NodeHealthSnapshot> {
  const cached = cache.get(node.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const base = {
    id: node.id,
    name: node.name,
    fqdn: node.fqdn,
    location: node.location.short,
    maintenanceMode: node.maintenanceMode,
    memory: node.memory,
    disk: node.disk,
    serverCount: node._count.servers,
    allocationCount: node._count.allocations,
    capacity,
  };

  const health = await probeNodeHealth(node);
  const snapshot: NodeHealthSnapshot = {
    ...base,
    online: health.online,
    version: health.wingsVersion,
  };

  // Pin successes so the dashboard does not call Wings on every refresh.
  // Do not pin a failure — that held the badge offline for the whole cache window
  // after a single timeout, then flipped back online on the next window.
  if (health.online) {
    cache.set(node.id, { expiresAt: Date.now() + CACHE_MS, snapshot });
  } else {
    cache.delete(node.id);
  }
  return snapshot;
}

export function clearNodeHealthCache(): void {
  cache.clear();
}

export function clearNodeHealthCacheForNode(nodeId: string): void {
  cache.delete(nodeId);
}
