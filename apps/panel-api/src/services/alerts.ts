import type { AlertMetric, AlertRule, Server } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { WingsResourceStats } from './server-stats.js';

const DEFAULT_COOLDOWN_SEC = 900;
const EVENT_RETENTION_DAYS = 30;

export type AlertMetricId = AlertMetric;

export const ALERT_PRESETS = {
  essential: {
    id: 'essential',
    label: 'Essential',
    description: 'Crash, unexpected stop, and nearly full disk.',
    rules: [
      { metric: 'server_crashed' as const, thresholdPct: 0, cooldownSec: 600 },
      { metric: 'server_offline' as const, thresholdPct: 0, cooldownSec: 900 },
      { metric: 'disk' as const, thresholdPct: 90, cooldownSec: 1800 },
    ],
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: 'High CPU or memory pressure on the allocation.',
    rules: [
      { metric: 'cpu' as const, thresholdPct: 85, cooldownSec: 900 },
      { metric: 'memory' as const, thresholdPct: 90, cooldownSec: 900 },
    ],
  },
  storage: {
    id: 'storage',
    label: 'Storage',
    description: 'Warn early and again when disk is almost full.',
    rules: [
      { metric: 'disk' as const, thresholdPct: 80, cooldownSec: 1800 },
      { metric: 'disk' as const, thresholdPct: 95, cooldownSec: 900 },
    ],
  },
  full: {
    id: 'full',
    label: 'Full watch',
    description: 'Essential + performance + install failures.',
    rules: [
      { metric: 'server_crashed' as const, thresholdPct: 0, cooldownSec: 600 },
      { metric: 'server_offline' as const, thresholdPct: 0, cooldownSec: 900 },
      { metric: 'install_failed' as const, thresholdPct: 0, cooldownSec: 1800 },
      { metric: 'cpu' as const, thresholdPct: 85, cooldownSec: 900 },
      { metric: 'memory' as const, thresholdPct: 90, cooldownSec: 900 },
      { metric: 'disk' as const, thresholdPct: 90, cooldownSec: 1800 },
    ],
  },
  node_health: {
    id: 'node_health',
    label: 'Node health',
    description: 'Admin only — notify when any Wings node goes offline.',
    adminOnly: true,
    rules: [{ metric: 'node_offline' as const, thresholdPct: 0, cooldownSec: 600 }],
  },
} as const;

export type AlertPresetId = keyof typeof ALERT_PRESETS;

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

function normalizeState(state: string | undefined | null): string {
  return (state ?? '').trim().toLowerCase();
}

const STOPPED_STATES = new Set(['offline', 'stopped']);

/** Fire lifecycle alerts when container state changes (edge-triggered). */
export async function evaluateServerLifecycleTransition(
  server: Pick<Server, 'id' | 'name' | 'suspended'>,
  fromState: string,
  toState: string,
) {
  const prev = normalizeState(fromState);
  const next = normalizeState(toState);
  if (prev === next) return;

  const metrics: AlertMetricId[] = [];
  if (next === 'crashed') metrics.push('server_crashed');
  if (
    STOPPED_STATES.has(next) &&
    !STOPPED_STATES.has(prev) &&
    prev !== 'installing' &&
    prev !== 'install_failed'
  ) {
    metrics.push('server_offline');
  }
  if (next === 'install_failed') metrics.push('install_failed');
  if (metrics.length === 0) return;

  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      serverId: server.id,
      metric: { in: metrics },
    },
  });

  for (const rule of rules) {
    if (!cooldownElapsed(rule)) continue;
    if (rule.metric === 'server_crashed') {
      await fireRule(rule, {
        title: `${server.name}: server crashed`,
        message: 'The container reported a crash. Check the console for the last lines before exit.',
        severity: 'critical',
        serverId: server.id,
      });
    } else if (rule.metric === 'server_offline') {
      if (server.suspended) continue;
      await fireRule(rule, {
        title: `${server.name}: server stopped`,
        message: `The server is ${next}. Start it again from the console if this was unexpected.`,
        severity: 'warning',
        serverId: server.id,
      });
    } else if (rule.metric === 'install_failed') {
      await fireRule(rule, {
        title: `${server.name}: install failed`,
        message: 'The install / reinstall script failed. Open install logs for details.',
        severity: 'critical',
        serverId: server.id,
      });
    }
  }
}

/** Evaluate CPU / memory / disk threshold rules after a live stats sample. */
export async function evaluateServerResourceAlerts(
  server: Pick<Server, 'id' | 'name' | 'ownerId' | 'memory' | 'disk' | 'cpu'>,
  live: WingsResourceStats,
) {
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

  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      serverId: server.id,
      metric: { in: ['cpu', 'memory', 'disk'] },
    },
  });

  for (const rule of rules) {
    if (!cooldownElapsed(rule)) continue;
    if (rule.metric !== 'cpu' && rule.metric !== 'memory' && rule.metric !== 'disk') continue;
    const value = values[rule.metric];
    if (value == null || !Number.isFinite(value)) continue;
    if (value < rule.thresholdPct) continue;
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

/** Apply a named preset: skip duplicates (same metric+threshold+server). */
export async function applyAlertPreset(input: {
  userId: string;
  presetId: AlertPresetId;
  serverId?: string | null;
  isAdmin: boolean;
}) {
  const preset = ALERT_PRESETS[input.presetId];
  if (!preset) throw Object.assign(new Error('Unknown preset'), { statusCode: 400 });
  if ('adminOnly' in preset && preset.adminOnly && !input.isAdmin) {
    throw Object.assign(new Error('This preset is for admins only'), { statusCode: 403 });
  }

  const needsServer = preset.rules.some((r) => r.metric !== 'node_offline');
  if (needsServer && !input.serverId) {
    throw Object.assign(new Error('Pick a server for this preset'), { statusCode: 400 });
  }

  const created = [];
  for (const spec of preset.rules) {
    const serverId = spec.metric === 'node_offline' ? null : input.serverId!;
    const existing = await prisma.alertRule.findFirst({
      where: {
        userId: input.userId,
        serverId,
        metric: spec.metric,
        thresholdPct: spec.thresholdPct,
      },
    });
    if (existing) {
      if (!existing.enabled) {
        created.push(
          await prisma.alertRule.update({
            where: { id: existing.id },
            data: { enabled: true, cooldownSec: spec.cooldownSec },
          }),
        );
      }
      continue;
    }
    created.push(
      await createAlertRule({
        userId: input.userId,
        serverId,
        metric: spec.metric,
        thresholdPct: spec.thresholdPct,
        cooldownSec: spec.cooldownSec,
      }),
    );
  }
  return { created: created.length, presetId: input.presetId };
}
