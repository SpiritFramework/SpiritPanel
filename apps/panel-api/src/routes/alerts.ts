import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSession, requireAdmin } from '../middleware/auth.js';
import {
  countUnreadAlerts,
  deleteAlertEvent,
  deleteAllAlertEvents,
  listAlertEventsForUser,
  markAlertRead,
  markAllAlertsRead,
} from '../services/alerts.js';

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

export async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/alerts/summary', async (request) => {
    const unread = await countUnreadAlerts(request.user!.id);
    return { unread };
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

  app.delete('/alerts/events', async (request) => {
    const result = await deleteAllAlertEvents(request.user!.id);
    return { ok: true, deleted: result.count };
  });

  app.delete('/alerts/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await deleteAlertEvent(request.user!.id, id);
    if (result.count === 0) return reply.status(404).send({ error: 'Alert not found' });
    return { ok: true };
  });

  app.post('/alerts/events/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await markAlertRead(request.user!.id, id);
    if (result.count === 0) return reply.status(404).send({ error: 'Alert not found' });
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
