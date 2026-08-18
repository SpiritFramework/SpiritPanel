import type { Node } from '@prisma/client';
import { wingsForNode } from '../services/wings-client.js';

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

  let snapshot: NodeHealthSnapshot;
  try {
    const sys = await wingsForNode(node).getSystem();
    snapshot = { ...base, online: true, version: sys.version };
  } catch {
    snapshot = { ...base, online: false, version: null };
  }

  cache.set(node.id, { expiresAt: Date.now() + CACHE_MS, snapshot });
  return snapshot;
}

export function clearNodeHealthCache(): void {
  cache.clear();
}
