import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

function asJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function logActivity(input: {
  event: string;
  actorId?: string | null;
  serverId?: string | null;
  nodeId?: string | null;
  ip?: string | null;
  description?: string | null;
  properties?: Record<string, unknown>;
  batch?: string | null;
}) {
  return prisma.activityLog.create({
    data: {
      event: input.event,
      actorId: input.actorId ?? null,
      serverId: input.serverId ?? null,
      nodeId: input.nodeId ?? null,
      ip: input.ip ?? null,
      description: input.description ?? null,
      properties: asJson(input.properties ?? {}),
      batch: input.batch ?? null,
    },
  });
}

export async function logActivityBatch(
  entries: Array<{
    event: string;
    actor_id?: string;
    server_id?: string;
    node_id?: string;
    ip?: string;
    description?: string;
    properties?: Record<string, unknown>;
    timestamp?: string;
  }>,
) {
  if (!entries.length) return;
  await prisma.activityLog.createMany({
    data: entries.map((e) => ({
      event: e.event,
      actorId: e.actor_id ?? null,
      serverId: e.server_id ?? null,
      nodeId: e.node_id ?? null,
      ip: e.ip ?? null,
      description: e.description ?? null,
      properties: asJson(e.properties ?? {}),
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    })),
  });
}

export interface PaginatedActivityResult<T extends { id: string }> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export async function paginateActivityLogs(
  options: {
    where: Prisma.ActivityLogWhereInput;
    take: number;
    cursor?: string | null;
    include?: Prisma.ActivityLogInclude;
  },
) {
  const limit = Math.min(Math.max(options.take, 1), 50);
  const where = options.where;

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
      include: options.include,
    }),
  ]);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    total,
    hasMore,
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
  };
}
