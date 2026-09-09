import type { AlertMetric, AlertRule, Server } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { WingsResourceStats } from './server-stats.js';

const DEFAULT_COOLDOWN_SEC = 900;
const EVENT_RETENTION_DAYS = 30;

export type AlertMetricId = AlertMetric;

function cooldownElapsed(rule: AlertRule, now = new Date()): boolean {
  if (!rule.lastFiredAt) return true;
  const elapsed = (now.getTime() - rule.lastFiredAt.getTime()) / 1000;
  return elapsed >= Math.max(60, rule.cooldownSec || DEFAULT_COOLDOWN_SEC);
}

async function fireRule(
  rule: AlertRule,
  input: {
    title: string;
    message: string;
    severity?: string;
    valuePct?: number | null;
    serverId?: string | null;
    nodeId?: string | null;
  },
) {
  const now = new Date();
  await prisma.$transaction([
    prisma.alertEvent.create({
      data: {
        ruleId: rule.id,
        userId: rule.userId,
        serverId: input.serverId ?? rule.serverId,
        nodeId: input.nodeId ?? rule.nodeId,
        metric: rule.metric,
        severity: input.severity ?? 'warning',
        title: input.title,
        message: input.message,
        valuePct: input.valuePct ?? null,
      },
    }),
    prisma.alertRule.update({
      where: { id: rule.id },
      data: { lastFiredAt: now },
    }),
  ]);
}

function pctOfLimit(used: number, limit: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.min(999, (used / limit) * 100);
}

/** Evaluate resource threshold rules after a live stats sample. */
export async function evaluateServerResourceAlerts(
  server: Pick<Server, 'id' | 'name' | 'ownerId' | 'memory' | 'disk' | 'cpu'>,
  live: WingsResourceStats,
) {
  const cpuAbs = live.cpu_absolute ?? 0;
  const memBytes = live.memory_bytes ?? 0;
  const diskBytes = live.disk_bytes ?? 0;

  const memoryLimitBytes = (server.memory > 0 ? server.memory : 0) * 1024 * 1024;
  const diskLimitBytes = (server.disk > 0 ? server.disk : 0) * 1024 * 1024;
  // Panel CPU limit is percent of one core * allocation (same as analytics charts).
  const cpuLimit = server.cpu > 0 ? server.cpu : 0;

  const values: Partial<Record<'cpu' | 'memory' | 'disk', number | null>> = {
    cpu: cpuLimit > 0 ? Math.min(999, (cpuAbs / cpuLimit) * 100) : null,
    memory: pctOfLimit(memBytes, memoryLimitBytes),
    disk: pctOfLimit(diskBytes, diskLimitBytes),
  };

  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      serverId: server.id,
      metric: { in: ['cpu', 'memory', 'disk'] },
    },
  });

  for (const rule of rules) {
    if (rule.metric === 'node_offline') continue;
    const value = values[rule.metric];
    if (value == null || !Number.isFinite(value)) continue;
    if (value < rule.thresholdPct) continue;
    if (!cooldownElapsed(rule)) continue;

    const label = rule.metric === 'cpu' ? 'CPU' : rule.metric === 'memory' ? 'Memory' : 'Disk';
    await fireRule(rule, {
      title: `${server.name}: ${label} above ${rule.thresholdPct}%`,
      message: `${label} is at ${value.toFixed(1)}% of allocation (threshold ${rule.thresholdPct}%).`,
      severity: value >= Math.min(100, rule.thresholdPct + 10) ? 'critical' : 'warning',
      valuePct: value,
      serverId: server.id,
    });
  }
}

/** Fire admin node_offline rules when a node transitions online → offline. */
export async function evaluateNodeOfflineAlerts(node: { id: string; name: string }) {
  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      metric: 'node_offline',
      OR: [{ nodeId: null }, { nodeId: node.id }],
    },
  });

  for (const rule of rules) {
    if (!cooldownElapsed(rule)) continue;
    await fireRule(rule, {
      title: `Node offline: ${node.name}`,
      message: `${node.name} stopped responding to health checks.`,
      severity: 'critical',
      nodeId: node.id,
    });
  }
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

export async function pruneOldAlertEvents() {
  const cutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.alertEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export type AlertRuleCreateInput = {
  userId: string;
  serverId?: string | null;
  nodeId?: string | null;
  metric: AlertMetricId;
  thresholdPct?: number;
  cooldownSec?: number;
  enabled?: boolean;
};

export async function createAlertRule(input: AlertRuleCreateInput) {
  return prisma.alertRule.create({
    data: {
      userId: input.userId,
      serverId: input.serverId ?? null,
      nodeId: input.nodeId ?? null,
      metric: input.metric,
      thresholdPct: input.thresholdPct ?? 90,
      cooldownSec: input.cooldownSec ?? DEFAULT_COOLDOWN_SEC,
      enabled: input.enabled ?? true,
    },
  });
}
