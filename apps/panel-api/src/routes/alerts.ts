import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSession, requireAdmin } from '../middleware/auth.js';
import { getServerAccess } from '../lib/client-server.js';
import {
  ALERT_PRESETS,
  ACCOUNT_ALERT_METRICS,
  applyAlertPreset,
  countUnreadAlerts,
  createAlertRule,
  listAlertEventsForUser,
  markAlertRead,
  markAllAlertsRead,
  type AlertPresetId,
} from '../services/alerts.js';

const metricSchema = z.enum([
  'cpu',
  'memory',
  'disk',
  'node_offline',
  'server_offline',
  'server_crashed',
  'install_failed',
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
]);
const presetSchema = z.enum([
  'essential',
  'performance',
  'storage',
  'security',
  'server_security',
  'full',
  'node_health',
]);
const LIFECYCLE_METRICS = new Set([
  'node_offline',
  'server_offline',
  'server_crashed',
  'install_failed',
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
]);

function serializeRule(rule: {
  id: string;
  userId: string;
  serverId: string | null;
  nodeId: string | null;
  metric: string;
  thresholdPct: number;
  enabled: boolean;
  cooldownSec: number;
  lastFiredAt: Date | null;
  createdAt: Date;
  server?: { id: string; name: string; uuidShort: string } | null;
}) {
  return {
    id: rule.id,
    userId: rule.userId,
    serverId: rule.serverId,
    nodeId: rule.nodeId,
    metric: rule.metric,
    thresholdPct: rule.thresholdPct,
    enabled: rule.enabled,
    cooldownSec: rule.cooldownSec,
    lastFiredAt: rule.lastFiredAt?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    server: rule.server
      ? { id: rule.server.id, name: rule.server.name, uuidShort: rule.server.uuidShort }
      : null,
  };
}

function serializeEvent(event: {
  id: string;
  ruleId: string | null;
  userId: string;
  serverId: string | null;
  nodeId: string | null;
  metric: string;
  severity: string;
  title: string;
  message: string;
  valuePct: number | null;
  readAt: Date | null;
  createdAt: Date;
  server?: { id: string; name: string; uuidShort: string } | null;
}) {
  return {
    id: event.id,
    ruleId: event.ruleId,
    userId: event.userId,
    serverId: event.serverId,
    nodeId: event.nodeId,
    metric: event.metric,
    severity: event.severity,
    title: event.title,
    message: event.message,
    valuePct: event.valuePct,
    readAt: event.readAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    server: event.server
      ? { id: event.server.id, name: event.server.name, uuidShort: event.server.uuidShort }
      : null,
  };
}

async function assertCanManageServerAlerts(userId: string, serverId: string, isAdmin: boolean) {
  if (isAdmin) {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, ownerId: true },
    });
    if (!server) throw Object.assign(new Error('Server not found'), { statusCode: 404 });
    return server;
  }
  const access = await getServerAccess(serverId, userId);
  if (!access) throw Object.assign(new Error('Server not found'), { statusCode: 404 });
  if (!access.isOwner && !access.isAdminSupport) {
    throw Object.assign(new Error('Only the server owner can manage alert rules'), { statusCode: 403 });
  }
  return access.server;
}

export async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/alerts/summary', async (request) => {
    const unread = await countUnreadAlerts(request.user!.id);
    return { unread };
  });

  app.get('/alerts/presets', async (request) => {
    const user = request.user!;
    const isAdmin = user.role === 'admin' || user.rootAdmin;
    return {
      presets: Object.values(ALERT_PRESETS)
        .filter((p) => !('adminOnly' in p && p.adminOnly) || isAdmin)
        .map((p) => ({
          id: p.id,
          label: p.label,
          description: p.description,
          adminOnly: 'adminOnly' in p && Boolean(p.adminOnly),
          ruleCount: p.rules.length,
        })),
    };
  });

  app.post('/alerts/presets/apply', async (request, reply) => {
    const user = request.user!;
    const isAdmin = user.role === 'admin' || user.rootAdmin;
    const body = z
      .object({
        presetId: presetSchema,
        serverId: z.string().min(1).optional().nullable(),
      })
      .parse(request.body);

    if (body.presetId !== 'node_health' && body.presetId !== 'security') {
      if (!body.serverId) return reply.status(400).send({ error: 'Pick a server' });
      try {
        await assertCanManageServerAlerts(user.id, body.serverId, isAdmin);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        return reply.status(status).send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    }

    try {
      const result = await applyAlertPreset({
        userId: user.id,
        presetId: body.presetId as AlertPresetId,
        serverId: body.serverId ?? null,
        isAdmin,
      });
      return result;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.status(status).send({ error: err instanceof Error ? err.message : 'Failed' });
    }
  });

  app.get('/alerts/events', async (request) => {
    const query = z
      .object({
        unreadOnly: z
          .string()
          .optional()
          .transform((v) => v === '1' || v === 'true'),
      })
      .parse(request.query);
    const events = await listAlertEventsForUser(request.user!.id, {
      unreadOnly: query.unreadOnly,
      take: 75,
    });
    return { events: events.map(serializeEvent) };
  });

  app.post('/alerts/events/read-all', async (request) => {
    await markAllAlertsRead(request.user!.id);
    return { ok: true };
  });

  app.post('/alerts/events/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await markAlertRead(request.user!.id, id);
    if (result.count === 0) return reply.status(404).send({ error: 'Alert not found' });
    return { ok: true };
  });

  app.get('/alerts/rules', async (request) => {
    const user = request.user!;
    const rules = await prisma.alertRule.findMany({
      where: { userId: user.id },
      include: { server: { select: { id: true, name: true, uuidShort: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { rules: rules.map(serializeRule) };
  });

  app.post('/alerts/rules', async (request, reply) => {
    const user = request.user!;
    const isAdmin = user.role === 'admin' || user.rootAdmin;
    const body = z
      .object({
        metric: metricSchema,
        serverId: z.string().min(1).optional().nullable(),
        nodeId: z.string().min(1).optional().nullable(),
        thresholdPct: z.number().int().min(0).max(100).optional(),
        cooldownSec: z.number().int().min(60).max(86_400).optional(),
        enabled: z.boolean().optional(),
      })
      .parse(request.body);

    if (body.metric === 'node_offline') {
      if (!isAdmin) return reply.status(403).send({ error: 'Only admins can create node offline alerts' });
      const rule = await createAlertRule({
        userId: user.id,
        metric: 'node_offline',
        nodeId: body.nodeId ?? null,
        thresholdPct: 0,
        cooldownSec: body.cooldownSec,
        enabled: body.enabled,
      });
      return serializeRule(rule);
    }

    if (ACCOUNT_ALERT_METRICS.has(body.metric)) {
      const rule = await createAlertRule({
        userId: user.id,
        metric: body.metric,
        thresholdPct: 0,
        cooldownSec: body.cooldownSec,
        enabled: body.enabled,
      });
      return serializeRule(rule);
    }

    if (!body.serverId) return reply.status(400).send({ error: 'serverId is required for this alert' });
    try {
      await assertCanManageServerAlerts(user.id, body.serverId, isAdmin);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.status(status).send({ error: err instanceof Error ? err.message : 'Failed' });
    }

    const rule = await createAlertRule({
      userId: user.id,
      serverId: body.serverId,
      metric: body.metric,
      thresholdPct: LIFECYCLE_METRICS.has(body.metric) ? 0 : (body.thresholdPct ?? 90),
      cooldownSec: body.cooldownSec,
      enabled: body.enabled,
    });
    return serializeRule(rule);
  });

  app.patch('/alerts/rules/:id', async (request, reply) => {
    const user = request.user!;
    const isAdmin = user.role === 'admin' || user.rootAdmin;
    const { id } = request.params as { id: string };
    const body = z
      .object({
        thresholdPct: z.number().int().min(1).max(100).optional(),
        cooldownSec: z.number().int().min(60).max(86_400).optional(),
        enabled: z.boolean().optional(),
      })
      .parse(request.body);

    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Rule not found' });
    if (existing.userId !== user.id && !isAdmin) return reply.status(403).send({ error: 'Forbidden' });

    const updated = await prisma.alertRule.update({
      where: { id },
      data: {
        ...(body.thresholdPct !== undefined ? { thresholdPct: body.thresholdPct } : {}),
        ...(body.cooldownSec !== undefined ? { cooldownSec: body.cooldownSec } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      },
      include: { server: { select: { id: true, name: true, uuidShort: true } } },
    });
    return serializeRule(updated);
  });

  app.delete('/alerts/rules/:id', async (request, reply) => {
    const user = request.user!;
    const isAdmin = user.role === 'admin' || user.rootAdmin;
    const { id } = request.params as { id: string };
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Rule not found' });
    if (existing.userId !== user.id && !isAdmin) return reply.status(403).send({ error: 'Forbidden' });
    await prisma.alertRule.delete({ where: { id } });
    return { ok: true };
  });
}

/** Admin-only listing of all open alerts across users (fleet view). */
export async function adminAlertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAdmin);

  app.get('/alerts/events', async (request) => {
    const events = await prisma.alertEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        server: { select: { id: true, name: true, uuidShort: true } },
        user: { select: { id: true, username: true, email: true } },
      },
    });
    return {
      events: events.map((e) => ({
        ...serializeEvent(e),
        user: { id: e.user.id, username: e.user.username, email: e.user.email },
      })),
    };
  });
}
