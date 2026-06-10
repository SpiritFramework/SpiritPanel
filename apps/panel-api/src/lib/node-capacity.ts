import type { PrismaClient } from '@prisma/client';
import { serverResourceContribution } from './server-resources.js';

export interface NodeCapacityStats {
  allocatedMemory: number;
  allocatedDisk: number;
  effectiveMemoryLimit: number;
  effectiveDiskLimit: number;
  memoryFree: number;
  diskFree: number;
  memoryUsedPercent: number;
  diskUsedPercent: number;
}

export function effectiveResourceLimit(base: number, overallocate: number): number {
  if (base <= 0) return 0;
  return base + Math.floor((base * overallocate) / 100);
}

export function computeNodeCapacity(
  node: { memory: number; disk: number; memoryOverallocate?: number; diskOverallocate?: number },
  allocated: { memory: number; disk: number },
): NodeCapacityStats {
  const effectiveMemoryLimit = effectiveResourceLimit(node.memory, node.memoryOverallocate ?? 0);
  const effectiveDiskLimit = effectiveResourceLimit(node.disk, node.diskOverallocate ?? 0);
  const allocatedMemory = allocated.memory;
  const allocatedDisk = allocated.disk;
  const memoryFree = Math.max(0, effectiveMemoryLimit - allocatedMemory);
  const diskFree = Math.max(0, effectiveDiskLimit - allocatedDisk);
  const memoryUsedPercent =
    effectiveMemoryLimit > 0
      ? Math.min(100, Math.round((allocatedMemory / effectiveMemoryLimit) * 100))
      : 0;
  const diskUsedPercent =
    effectiveDiskLimit > 0 ? Math.min(100, Math.round((allocatedDisk / effectiveDiskLimit) * 100)) : 0;

  return {
    allocatedMemory,
    allocatedDisk,
    effectiveMemoryLimit,
    effectiveDiskLimit,
    memoryFree,
    diskFree,
    memoryUsedPercent,
    diskUsedPercent,
  };
}

export type NodeAllocationMap = Map<string, { memory: number; disk: number }>;

export async function loadNodeAllocationTotals(prisma: PrismaClient): Promise<NodeAllocationMap> {
  const servers = await prisma.server.findMany({
    select: { nodeId: true, memory: true, disk: true },
  });
  const map: NodeAllocationMap = new Map();
  for (const row of servers) {
    const prev = map.get(row.nodeId) ?? { memory: 0, disk: 0 };
    map.set(row.nodeId, {
      memory: prev.memory + serverResourceContribution(row.memory),
      disk: prev.disk + serverResourceContribution(row.disk),
    });
  }
  return map;
}
