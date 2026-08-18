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
    /** FeatherWings activity payload uses `user` + `server` (UUIDs). */
    user?: string | null;
    server?: string | null;
    actor_id?: string | null;
    server_id?: string | null;
    node_id?: string | null;
    ip?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    properties?: Record<string, unknown> | null;
    timestamp?: string | null;
  }>,
  opts?: { nodeId?: string; maxEntries?: number },
) {
  if (!entries.length) return;

  const max = Math.min(Math.max(opts?.maxEntries ?? 100, 1), 200);
  const slice = entries.slice(0, max);
  const nodeId = opts?.nodeId;

  const serverUuids = [
    ...new Set(
      slice
        .map((e) => (typeof e.server === 'string' ? e.server.trim() : ''))
        .filter((v) => v.length > 0),
    ),
  ];
  const userUuids = [
    ...new Set(
      slice
        .map((e) => {
          const raw = e.user;
          if (typeof raw === 'string') return raw.trim();
          if (raw && typeof raw === 'object' && 'String' in (raw as object)) {
            return String((raw as { String?: string }).String ?? '').trim();
          }
          return '';
        })
        .filter((v) => v.length > 0),
    ),
  ];

  const [servers, users] = await Promise.all([
    serverUuids.length
      ? prisma.server.findMany({
          where: {
            uuid: { in: serverUuids },
            ...(nodeId ? { nodeId } : {}),
          },
          select: { id: true, uuid: true, nodeId: true },
        })
      : Promise.resolve([] as Array<{ id: string; uuid: string; nodeId: string }>),
    userUuids.length
      ? prisma.user.findMany({
          where: { uuid: { in: userUuids } },
          select: { id: true, uuid: true },
        })
      : Promise.resolve([] as Array<{ id: string; uuid: string }>),
  ]);

  const serverByUuid = new Map(servers.map((s) => [s.uuid, s]));
  const userByUuid = new Map(users.map((u) => [u.uuid, u.id]));

  const rows = slice
    .map((e) => {
      const serverUuid = typeof e.server === 'string' ? e.server.trim() : '';
      const server = serverUuid ? serverByUuid.get(serverUuid) : undefined;
      // Drop entries for servers not on this node (or unknown) when node-scoped.
      if (nodeId && serverUuid && !server) return null;

      let actorId = e.actor_id ?? null;
      if (!actorId && e.user) {
        const userUuid =
          typeof e.user === 'string'
            ? e.user.trim()
            : String((e.user as { String?: string })?.String ?? '').trim();
        actorId = userByUuid.get(userUuid) ?? null;
      }

      return {
        event: e.event,
        actorId,
        serverId: server?.id ?? e.server_id ?? null,
        nodeId: server?.nodeId ?? e.node_id ?? nodeId ?? null,
        ip: e.ip ?? null,
        description: e.description ?? null,
        properties: asJson(
          (e.properties ?? e.metadata ?? {}) as Record<string, unknown>,
        ),
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return;
  await prisma.activityLog.createMany({ data: rows });
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

/** Default retention for activity logs (server, auth, and admin events). */
export const ACTIVITY_RETENTION_DAYS = 30;

export async function deleteServerActivityLogs(serverId: string) {
  return prisma.activityLog.deleteMany({ where: { serverId } });
}

export async function deleteActivityLogs(where: Prisma.ActivityLogWhereInput) {
  return prisma.activityLog.deleteMany({ where });
}

export async function pruneOldActivityLogs(retentionDays = ACTIVITY_RETENTION_DAYS) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.activityLog.deleteMany({
    where: { timestamp: { lt: cutoff } },
  });
  if (result.count > 0) {
    console.log(`[activity] Pruned ${result.count} log(s) older than ${retentionDays} days`);
  }
  return result;
}
