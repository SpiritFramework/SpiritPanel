import type { AlertMetric, Server } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { WingsResourceStats } from './server-stats.js';

const EVENT_RETENTION_DAYS = 30;

export type AlertMetricId = AlertMetric;

/** Built-in watches — always on for every relevant inbox. */
export const DEFAULT_WATCHES: Record<
  AlertMetricId,
  { cooldownSec: number; thresholdPct: number }
> = {
  cpu: { cooldownSec: 900, thresholdPct: 85 },
  memory: { cooldownSec: 900, thresholdPct: 90 },
  disk: { cooldownSec: 1800, thresholdPct: 90 },
  server_crashed: { cooldownSec: 600, thresholdPct: 0 },
  server_offline: { cooldownSec: 900, thresholdPct: 0 },
  install_failed: { cooldownSec: 1800, thresholdPct: 0 },
  account_login_failed: { cooldownSec: 300, thresholdPct: 0 },
  account_login: { cooldownSec: 1800, thresholdPct: 0 },
  account_password_changed: { cooldownSec: 60, thresholdPct: 0 },
  account_2fa_changed: { cooldownSec: 60, thresholdPct: 0 },
  account_api_key: { cooldownSec: 60, thresholdPct: 0 },
  server_subuser: { cooldownSec: 60, thresholdPct: 0 },
  node_offline: { cooldownSec: 600, thresholdPct: 0 },
};

const STOPPED_STATES = new Set(['offline', 'stopped']);
const LIVE_RESOURCE_STATES = new Set(['running', 'starting']);
const RESOURCE_BREACH_STREAK_REQUIRED = 2;
const resourceBreachStreak = new Map<string, number>();

function pctOfLimit(used: number, limit: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.min(999, (used / limit) * 100);
}

function normalizeState(state: string | undefined | null): string {
  return (state ?? '').trim().toLowerCase();
}

function noteBreach(key: string, breached: boolean): number {
  if (!breached) {
    resourceBreachStreak.delete(key);
    return 0;
  }
  const next = (resourceBreachStreak.get(key) ?? 0) + 1;
  resourceBreachStreak.set(key, next);
  return next;
}

async function cooldownReady(
  userId: string,
  metric: AlertMetricId,
  serverId?: string | null,
  nodeId?: string | null,
): Promise<boolean> {
  const cooldownSec = DEFAULT_WATCHES[metric]?.cooldownSec ?? 900;
  const since = new Date(Date.now() - Math.max(60, cooldownSec) * 1000);
  const recent = await prisma.alertEvent.findFirst({
    where: {
      userId,
      metric,
      createdAt: { gte: since },
      ...(serverId ? { serverId } : {}),
      ...(nodeId ? { nodeId } : {}),
    },
    select: { id: true },
  });
  return !recent;
}

async function deliverInboxAlert(input: {
  userId: string;
  metric: AlertMetricId;
  title: string;
  message: string;
  severity?: string;
  serverId?: string | null;
  nodeId?: string | null;
  valuePct?: number | null;
}) {
  if (!(await cooldownReady(input.userId, input.metric, input.serverId, input.nodeId))) return;
  await prisma.alertEvent.create({
    data: {
      userId: input.userId,
      serverId: input.serverId ?? null,
      nodeId: input.nodeId ?? null,
      metric: input.metric,
      severity: input.severity ?? 'warning',
      title: input.title,
      message: input.message,
      valuePct: input.valuePct ?? null,
    },
  });
}

async function listServerInboxUserIds(serverId: string, ownerId?: string | null) {
  const ids = new Set<string>();
  if (ownerId) ids.add(ownerId);
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      ownerId: true,
      subusers: { select: { userId: true } },
    },
  });
  if (server) {
    ids.add(server.ownerId);
    for (const su of server.subusers) ids.add(su.userId);
  }
  return [...ids];
}

async function listAdminInboxUserIds() {
  const admins = await prisma.user.findMany({
    where: {
      enabled: true,
      OR: [{ role: 'admin' }, { rootAdmin: true }],
    },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

async function deliverToUsers(
  userIds: string[],
  input: {
    metric: AlertMetricId;
    title: string;
    message: string;
    severity?: string;
    serverId?: string | null;
    nodeId?: string | null;
    valuePct?: number | null;
  },
) {
  for (const userId of userIds) {
    try {
      await deliverInboxAlert({ ...input, userId });
    } catch {
      /* one inbox must not block the rest */
    }
  }
}

/** Fire lifecycle alerts when container state changes (edge-triggered). */
export async function evaluateServerLifecycleTransition(
  server: Pick<Server, 'id' | 'name' | 'suspended'> & { ownerId?: string | null },
  fromState: string,
  toState: string,
) {
  const prev = normalizeState(fromState);
  const next = normalizeState(toState);
  if (prev === next) return;

  const userIds = await listServerInboxUserIds(server.id, server.ownerId);
  if (userIds.length === 0) return;

  if (next === 'crashed') {
    await deliverToUsers(userIds, {
      metric: 'server_crashed',
      title: `${server.name}: server crashed`,
      message: 'The container reported a crash. Check the console for the last lines before exit.',
      severity: 'critical',
      serverId: server.id,
    });
  }

  if (
    STOPPED_STATES.has(next) &&
    !STOPPED_STATES.has(prev) &&
    prev !== 'installing' &&
    prev !== 'install_failed' &&
    prev !== 'stopping' &&
    !server.suspended
  ) {
    await deliverToUsers(userIds, {
      metric: 'server_offline',
      title: `${server.name}: server stopped`,
      message: `The server is ${next}. Start it again from the console if this was unexpected.`,
      severity: 'warning',
      serverId: server.id,
    });
  }

  if (next === 'install_failed') {
    await deliverToUsers(userIds, {
      metric: 'install_failed',
      title: `${server.name}: install failed`,
      message: 'The install / reinstall script failed. Open install logs for details.',
      severity: 'critical',
      serverId: server.id,
    });
  }
}

/** Evaluate CPU / memory / disk after a live stats sample. */
export async function evaluateServerResourceAlerts(
  server: Pick<Server, 'id' | 'name' | 'ownerId' | 'memory' | 'disk' | 'cpu'>,
  live: WingsResourceStats,
) {
  const state = normalizeState(live.state);
  const cpuAbs = live.cpu_absolute ?? 0;
  const memBytes = live.memory_bytes ?? 0;
  const diskBytes = live.disk_bytes ?? 0;

  const memoryLimitBytes = (server.memory > 0 ? server.memory : 0) * 1024 * 1024;
  const diskLimitBytes = (server.disk > 0 ? server.disk : 0) * 1024 * 1024;
  const cpuLimit = server.cpu > 0 ? server.cpu : 0;

  const values: Partial<Record<'cpu' | 'memory' | 'disk', number | null>> = {
    cpu: cpuLimit > 0 ? Math.min(999, (cpuAbs / cpuLimit) * 100) : null,
    memory: pctOfLimit(memBytes, memoryLimitBytes),
    disk: pctOfLimit(diskBytes, diskLimitBytes),
  };

  const userIds = await listServerInboxUserIds(server.id, server.ownerId);
  if (userIds.length === 0) return;

  for (const metric of ['cpu', 'memory', 'disk'] as const) {
    try {
      if ((metric === 'cpu' || metric === 'memory') && !LIVE_RESOURCE_STATES.has(state)) {
        noteBreach(`${server.id}:${metric}`, false);
        continue;
      }

      const value = values[metric];
      const watch = DEFAULT_WATCHES[metric];
      if (value == null || !Number.isFinite(value)) {
        noteBreach(`${server.id}:${metric}`, false);
        continue;
      }

      const breached = value >= watch.thresholdPct;
      const streak = noteBreach(`${server.id}:${metric}`, breached);
      if (!breached) continue;

      const needsStreak = metric === 'cpu' || metric === 'memory';
      if (needsStreak && streak < RESOURCE_BREACH_STREAK_REQUIRED) continue;

      const label = metric === 'cpu' ? 'CPU' : metric === 'memory' ? 'Memory' : 'Disk';
      await deliverToUsers(userIds, {
        metric,
        title: `${server.name}: ${label} above ${watch.thresholdPct}%`,
        message: `${label} is at ${value.toFixed(1)}% of allocation (threshold ${watch.thresholdPct}%).`,
        severity: value >= Math.min(100, watch.thresholdPct + 10) ? 'critical' : 'warning',
        valuePct: value,
        serverId: server.id,
      });
      noteBreach(`${server.id}:${metric}`, false);
    } catch {
      /* one metric must not block the rest */
    }
  }
}

/** Notify every admin when a node goes online → offline. */
export async function evaluateNodeOfflineAlerts(node: { id: string; name: string }) {
  const userIds = await listAdminInboxUserIds();
  await deliverToUsers(userIds, {
    metric: 'node_offline',
    title: `Node offline: ${node.name}`,
    message: `${node.name} stopped responding to health checks.`,
    severity: 'critical',
    nodeId: node.id,
  });
}

export async function listAlertEventsForUser(userId: string, opts?: { unreadOnly?: boolean; take?: number }) {
  return prisma.alertEvent.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.take ?? 50,
    include: {
      server: { select: { id: true, name: true, uuidShort: true } },
    },
  });
}

export async function countUnreadAlerts(userId: string) {
  return prisma.alertEvent.count({ where: { userId, readAt: null } });
}

export async function markAlertRead(userId: string, eventId: string) {
  return prisma.alertEvent.updateMany({
    where: { id: eventId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllAlertsRead(userId: string) {
  return prisma.alertEvent.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function deleteAlertEvent(userId: string, eventId: string) {
  return prisma.alertEvent.deleteMany({
    where: { id: eventId, userId },
  });
}

export async function deleteAllAlertEvents(userId: string) {
  return prisma.alertEvent.deleteMany({
    where: { userId },
  });
}

export async function pruneOldAlertEvents() {
  const cutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.alertEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

/** Always-on account / server-security notice for a specific user. */
export async function notifyUserAlertMetric(
  userId: string,
  metric: AlertMetricId,
  input: {
    title: string;
    message: string;
    severity?: string;
    serverId?: string | null;
    valuePct?: number | null;
  },
) {
  await deliverInboxAlert({
    userId,
    metric,
    title: input.title,
    message: input.message,
    severity: input.severity ?? 'warning',
    serverId: input.serverId ?? null,
    valuePct: input.valuePct ?? null,
  });
}
