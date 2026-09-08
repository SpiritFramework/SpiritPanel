import type { Allocation, Node, Server } from '@prisma/client';
import { formatAllocationAddress, normalizeAllocationBindIp, resolveAllocationHost } from '@spirit/shared';
import { prisma } from '../lib/prisma.js';
import { getServerFull, getServerFullById } from './server-helpers.js';

export type ServerWithNode = Server & {
  node: Node;
  defaultAllocation: Allocation;
  extraAllocations?: Allocation[];
};

export function serializeAllocation(
  allocation: Allocation,
  node: Node,
  isDefault: boolean,
) {
  return {
    id: allocation.id,
    ip: allocation.ip,
    port: allocation.port,
    alias: allocation.alias,
    notes: allocation.notes,
    assigned: allocation.assigned,
    isDefault,
    displayHost: resolveAllocationHost(allocation, node),
    address: formatAllocationAddress(allocation, node),
    bindAddress: `${allocation.ip}:${allocation.port}`,
  };
}

export function listServerAllocations(server: ServerWithNode) {
  const extras = server.extraAllocations ?? [];
  const secondary = extras.filter((a) => a.id !== server.defaultAllocation.id);
  const allocations = [
    serializeAllocation(server.defaultAllocation, server.node, true),
    ...secondary.map((a) => serializeAllocation(a, server.node, false)),
  ];
  const used = allocations.length;
  const limit = server.allocationLimit ?? 0;
  const canCreate = used < limit;

  return { allocations, limit, used, canCreate };
}

export function countServerAllocations(server: Pick<Server, 'allocationId'> & { extraAllocations?: Allocation[] }) {
  const secondaryCount = (server.extraAllocations ?? []).filter((a) => a.id !== server.allocationId).length;
  return 1 + secondaryCount;
}

export function canAddAllocation(server: Pick<Server, 'allocationLimit'> & { extraAllocations?: Allocation[]; allocationId: string }) {
  const used = countServerAllocations(server);
  const limit = server.allocationLimit ?? 0;
  return used < limit;
}

export async function findFreeAllocation(nodeId: string, excludeIds: string[] = []) {
  return prisma.allocation.findFirst({
    where: {
      nodeId,
      assigned: false,
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: [{ ip: 'asc' }, { port: 'asc' }],
  });
}

export async function resolveAllocationForCreate(nodeId: string, allocationId?: string) {
  if (allocationId) {
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation) throw new Error('Invalid allocation');
    if (allocation.nodeId !== nodeId) throw new Error('Allocation does not belong to node');
    if (allocation.assigned) throw new Error('Allocation already assigned');
    return allocation;
  }

  const allocation = await findFreeAllocation(nodeId);
  if (!allocation) throw new Error('No free allocations on this node');
  return allocation;
}

export async function assignSecondaryAllocation(serverId: string, allocationId: string) {
  const server = await getServerFullById(prisma, serverId);
  if (!server) throw new Error('Server not found');

  if (!canAddAllocation(server)) {
    throw new Error('Server has reached its allocation limit');
  }

  const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new Error('Allocation not found');
  if (allocation.nodeId !== server.nodeId) throw new Error('Allocation does not belong to this node');
  if (allocation.assigned) throw new Error('Allocation is already assigned');
  if (allocation.id === server.allocationId) throw new Error('Allocation is already the primary port');

  await prisma.allocation.update({
    where: { id: allocation.id },
    data: { assigned: true, serverId: server.id },
  });

  return getServerFull(prisma, server.uuid);
}

export async function autoAssignAllocation(serverId: string) {
  const server = await getServerFullById(prisma, serverId);
  if (!server) throw new Error('Server not found');
  if (!canAddAllocation(server)) throw new Error('Server has reached its allocation limit');

  const allocation = await findFreeAllocation(server.nodeId);
  if (!allocation) throw new Error('No free allocations on this node');

  return assignSecondaryAllocation(serverId, allocation.id);
}

export async function setPrimaryAllocation(serverId: string, allocationId: string) {
  const server = await getServerFullById(prisma, serverId);
  if (!server) throw new Error('Server not found');
  if (allocationId === server.allocationId) return server;

  const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new Error('Allocation not found');
  if (allocation.nodeId !== server.nodeId) throw new Error('Allocation does not belong to this node');

  const isCurrentPrimary = allocation.id === server.allocationId;
  const isCurrentSecondary = allocation.serverId === server.id;
  if (!isCurrentPrimary && !isCurrentSecondary) {
    throw new Error('Allocation is not assigned to this server');
  }

  const previousPrimaryId = server.allocationId;

  await prisma.$transaction(async (tx) => {
    await tx.server.update({
      where: { id: server.id },
      data: { allocationId: allocation.id },
    });

    if (isCurrentSecondary) {
      await tx.allocation.update({
        where: { id: allocation.id },
        data: { serverId: null, assigned: true },
      });
    }

    if (previousPrimaryId !== allocation.id) {
      await tx.allocation.update({
        where: { id: previousPrimaryId },
        data: { assigned: true, serverId: server.id },
      });
    }
  });

  return getServerFull(prisma, server.uuid);
}

export async function unassignSecondaryAllocation(serverId: string, allocationId: string) {
  const server = await getServerFullById(prisma, serverId);
  if (!server) throw new Error('Server not found');
  if (allocationId === server.allocationId) {
    throw new Error('Cannot remove the primary allocation');
  }

  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, serverId: server.id },
  });
  if (!allocation) throw new Error('Allocation is not assigned to this server');

  await prisma.allocation.update({
    where: { id: allocation.id },
    data: { assigned: false, serverId: null },
  });

  return getServerFull(prisma, server.uuid);
}

export async function releaseServerAllocations(serverId: string, primaryAllocationId: string) {
  await prisma.allocation.updateMany({
    where: {
      OR: [{ serverId }, { id: primaryAllocationId }],
    },
    data: { assigned: false, serverId: null },
  });
  // Subdomain FQDN is mirrored on the primary allocation; clear it when the server is removed.
  await prisma.allocation
    .update({
      where: { id: primaryAllocationId },
      data: { alias: null },
    })
    .catch(() => undefined);
}

export function validateAllocationPorts(ports: number[]) {
  for (const port of ports) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${port}`);
    }
  }
}

export function normalizeAllocationIp(ip?: string) {
  return normalizeAllocationBindIp(ip?.trim() || '0.0.0.0');
}

export async function bulkDeleteNodeAllocations(
  nodeId: string,
  filter: { ip?: string; ids?: string[] },
): Promise<{ deleted: number; skippedAssigned: number }> {
  if (!filter.ip && (!filter.ids || filter.ids.length === 0)) {
    throw new Error('Specify an IP or allocation IDs to delete.');
  }

  const ip = filter.ip ? normalizeAllocationIp(filter.ip) : undefined;
  const idFilter = filter.ids?.length ? { id: { in: filter.ids } } : {};

  const skippedAssigned = await prisma.allocation.count({
    where: {
      nodeId,
      assigned: true,
      ...(ip ? { ip } : {}),
      ...idFilter,
    },
  });

  const toDelete = await prisma.allocation.findMany({
    where: {
      nodeId,
      assigned: false,
      ...(ip ? { ip } : {}),
      ...idFilter,
    },
    select: { id: true, ip: true, port: true },
  });

  if (toDelete.length === 0) {
    if (skippedAssigned > 0) {
      throw new Error(
        `${skippedAssigned} matching allocation(s) are assigned to servers and cannot be deleted.`,
      );
    }
    throw new Error('No matching unassigned allocations found.');
  }

  await prisma.allocation.deleteMany({
    where: { id: { in: toDelete.map((row) => row.id) } },
  });

  return { deleted: toDelete.length, skippedAssigned };
}
