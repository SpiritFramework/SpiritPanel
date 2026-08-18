import type { FastifyInstance } from 'fastify';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import { isPanelAdmin } from '../lib/client-server.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin, requireSession } from '../middleware/auth.js';
import { logAdminActivity } from '../lib/admin-activity.js';
import { deleteTicketAttachments } from '../lib/ticket-attachments.js';
import { TICKET_CATEGORIES } from '../lib/ticket-categories.js';
import {
  assertTicketsEnabledForClients,
  getTicketsSettings,
} from '../lib/panel-settings.js';
import {
  createTicketMessage,
  loadTicketAttachmentForUser,
  parseTicketMessageRequest,
  reloadTicketDetail,
} from '../services/ticket-messages.js';
import { notifyTicketDiscordEvent } from '../services/ticket-discord.js';
import {
  assertAssigneeIsStaff,
  assertUserCanAccessServerForTicket,
  countOpenTicketsForUser,
  nextStatusAfterStaffReply,
  nextStatusAfterUserReply,
  serializeTicketMessage,
  serializeTicketSummary,
  ticketDetailInclude,
  ticketInclude,
  validateTicketCategory,
} from '../services/tickets.js';

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(32),
  serverId: z.string().cuid().optional().nullable(),
  message: z.string().trim().min(1).max(10000),
  priority: z.nativeEnum(TicketPriority).optional().default('normal'),
});

const clientListQuery = z.object({
  status: z.enum(['open', 'closed', 'all']).optional().default('all'),
});

function ticketError(reply: import('fastify').FastifyReply, err: unknown) {
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  const message = err instanceof Error ? err.message : 'Request failed';
  return reply.status(statusCode).send({ error: message });
}

function serializeTicketDetail(ticket: Awaited<ReturnType<typeof reloadTicketDetail>>) {
  return {
    ...serializeTicketSummary({ ...ticket, messages: ticket.messages.slice(-1) }),
    messages: ticket.messages.map(serializeTicketMessage),
  };
}

async function handleMessageError(reply: import('fastify').FastifyReply, err: unknown) {
  if (err instanceof z.ZodError) {
    return reply.status(422).send({ error: err.flatten().fieldErrors });
  }
  return ticketError(reply, err);
}

export async function clientTicketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/tickets/meta', async (_request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const settings = await getTicketsSettings();
      return {
        categories: TICKET_CATEGORIES,
        allowServerTickets: settings.allowServerTickets,
        requireServer: settings.requireServer,
        maxOpenPerUser: settings.maxOpenPerUser,
      };
    } catch (err) {
      return ticketError(reply, err);
    }
  });

  app.get('/tickets', async (request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const query = clientListQuery.parse(request.query);
      const userId = request.user!.id;

      const statusFilter =
        query.status === 'open'
          ? { in: ['open', 'awaiting_reply', 'in_progress'] as TicketStatus[] }
          : query.status === 'closed'
            ? { in: ['resolved', 'closed'] as TicketStatus[] }
            : undefined;

      const tickets = await prisma.supportTicket.findMany({
        where: {
          userId,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: ticketInclude,
        orderBy: { updatedAt: 'desc' },
      });

      return { items: tickets.map(serializeTicketSummary) };
    } catch (err) {
      return ticketError(reply, err);
    }
  });

  app.post('/tickets', async (request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const body = createTicketSchema.parse(request.body);
      const settings = await getTicketsSettings();
      const userId = request.user!.id;

      validateTicketCategory(body.category);

      if (settings.requireServer && !body.serverId) {
        return reply.status(422).send({ error: 'A server must be selected for support tickets' });
      }

      if (!settings.allowServerTickets && body.serverId) {
        return reply.status(422).send({ error: 'Server-specific tickets are not enabled' });
      }

      if (body.serverId) {
        await assertUserCanAccessServerForTicket(userId, body.serverId);
      }

      const openCount = await countOpenTicketsForUser(userId);
      if (openCount >= settings.maxOpenPerUser) {
        return reply.status(429).send({
          error: `You can have at most ${settings.maxOpenPerUser} open support tickets`,
        });
      }

      const ticket = await prisma.$transaction(async (tx) => {
        const created = await tx.supportTicket.create({
          data: {
            subject: body.subject,
            category: body.category,
            userId,
            serverId: body.serverId ?? null,
            status: 'open',
            priority: body.priority,
          },
        });

        await tx.ticketMessage.create({
          data: {
            ticketId: created.id,
            authorId: userId,
            body: body.message,
            isStaff: false,
          },
        });

        return tx.supportTicket.findUniqueOrThrow({
          where: { id: created.id },
          include: ticketDetailInclude,
        });
      });

      void notifyTicketDiscordEvent(request.log, 'opened', ticket, body.message, 0).catch(() => {});

      return reply.status(201).send({
        ...serializeTicketSummary({ ...ticket, messages: ticket.messages.slice(-1) }),
        messages: ticket.messages.map(serializeTicketMessage),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: err.flatten().fieldErrors });
      }
      return ticketError(reply, err);
    }
  });

  app.get('/tickets/:id', async (request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      const ticket = await prisma.supportTicket.findFirst({
        where: { id, userId },
        include: ticketDetailInclude,
      });
      if (!ticket) return reply.status(404).send({ error: 'Not found' });

      return {
        ...serializeTicketSummary({ ...ticket, messages: ticket.messages.slice(-1) }),
        messages: ticket.messages.map(serializeTicketMessage),
      };
    } catch (err) {
      return ticketError(reply, err);
    }
  });

  app.get('/tickets/attachments/:attachmentId', async (request, reply) => {
    try {
      const { attachmentId } = request.params as { attachmentId: string };
      const user = request.user!;
      if (!isPanelAdmin(user)) {
        await assertTicketsEnabledForClients();
      }
      const file = await loadTicketAttachmentForUser(attachmentId, user.id, user);
      if (!file) return reply.status(404).send({ error: 'Not found' });
      return reply
        .header('Content-Type', file.mimeType)
        .header('Content-Disposition', `inline; filename="${file.filename}"`)
        .send(file.data);
    } catch (err) {
      return ticketError(reply, err);
    }
  });

  app.post('/tickets/:id/messages', async (request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      const ticket = await prisma.supportTicket.findFirst({ where: { id, userId } });
      if (!ticket) return reply.status(404).send({ error: 'Not found' });
      if (ticket.status === 'closed') {
        return reply.status(409).send({ error: 'This ticket is closed' });
      }

      const payload = await parseTicketMessageRequest(request);
      const nextStatus = nextStatusAfterUserReply(ticket.status);

      await createTicketMessage(id, userId, false, payload);
      const updated = await prisma.supportTicket.update({
        where: { id },
        data: { status: nextStatus },
        include: ticketDetailInclude,
      });

      void notifyTicketDiscordEvent(
        request.log,
        'user_reply',
        updated,
        payload.body,
        payload.images.length,
      ).catch(() => {});

      return serializeTicketDetail(updated);
    } catch (err) {
      return handleMessageError(reply, err);
    }
  });

  app.post('/tickets/:id/close', async (request, reply) => {
    try {
      await assertTicketsEnabledForClients();
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      const ticket = await prisma.supportTicket.findFirst({ where: { id, userId } });
      if (!ticket) return reply.status(404).send({ error: 'Not found' });
      if (ticket.status === 'closed') {
        return reply.status(409).send({ error: 'This ticket is already closed' });
      }

      const updated = await prisma.supportTicket.update({
        where: { id },
        data: { status: 'closed', closedAt: new Date() },
        include: ticketDetailInclude,
      });

      return {
        ...serializeTicketSummary({ ...updated, messages: updated.messages.slice(-1) }),
        messages: updated.messages.map(serializeTicketMessage),
      };
    } catch (err) {
      return ticketError(reply, err);
    }
  });
}

const adminListQuery = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  search: z.string().trim().max(120).optional(),
  assigneeId: z.string().cuid().optional(),
});

const adminPatchSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export async function adminTicketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);
  app.addHook('preHandler', requireAdmin);

  app.get('/tickets', async (request) => {
    const query = adminListQuery.parse(request.query);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' as const } },
              { user: { username: { contains: query.search, mode: 'insensitive' as const } } },
              { user: { email: { contains: query.search, mode: 'insensitive' as const } } },
              ...(Number.isFinite(Number(query.search))
                ? [{ number: Number(query.search) }]
                : []),
            ],
          }
        : {}),
    };

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    return { items: tickets.map(serializeTicketSummary) };
  });

  app.get('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: ticketDetailInclude,
    });
    if (!ticket) return reply.status(404).send({ error: 'Not found' });

    return {
      ...serializeTicketSummary({ ...ticket, messages: ticket.messages.slice(-1) }),
      messages: ticket.messages.map(serializeTicketMessage),
    };
  });

  app.patch('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = adminPatchSchema.parse(request.body);

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    if (body.assigneeId) {
      await assertAssigneeIsStaff(body.assigneeId);
    }

    const closedAt =
      body.status === 'closed' || body.status === 'resolved'
        ? new Date()
        : body.status && ['open', 'awaiting_reply', 'in_progress'].includes(body.status)
          ? null
          : undefined;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
        ...(closedAt !== undefined ? { closedAt } : {}),
      },
      include: ticketDetailInclude,
    });

    await logAdminActivity(request, {
      event: 'admin.ticket.updated',
      description: `Updated ticket #${updated.number} (${updated.status}, ${updated.priority})`,
    });

    return {
      ...serializeTicketSummary({ ...updated, messages: updated.messages.slice(-1) }),
      messages: updated.messages.map(serializeTicketMessage),
    };
  });

  app.get('/tickets/attachments/:attachmentId', async (request, reply) => {
    const { attachmentId } = request.params as { attachmentId: string };
    const user = request.user!;
    const file = await loadTicketAttachmentForUser(attachmentId, user.id, user);
    if (!file) return reply.status(404).send({ error: 'Not found' });
    return reply
      .header('Content-Type', file.mimeType)
      .header('Content-Disposition', `inline; filename="${file.filename}"`)
      .send(file.data);
  });

  app.post('/tickets/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const staffId = request.user!.id;

      const ticket = await prisma.supportTicket.findUnique({ where: { id } });
      if (!ticket) return reply.status(404).send({ error: 'Not found' });
      if (ticket.status === 'closed') {
        return reply.status(409).send({ error: 'This ticket is closed' });
      }

      const payload = await parseTicketMessageRequest(request);
      const nextStatus = nextStatusAfterStaffReply(ticket.status);

      await createTicketMessage(id, staffId, true, payload);
      const updated = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          assigneeId: ticket.assigneeId ?? staffId,
        },
        include: ticketDetailInclude,
      });

      return serializeTicketDetail(updated);
    } catch (err) {
      return handleMessageError(reply, err);
    }
  });

  app.delete('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.supportTicket.findUnique({ where: { id }, select: { number: true } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    await prisma.supportTicket.delete({ where: { id } });
    await deleteTicketAttachments(id);

    await logAdminActivity(request, {
      event: 'admin.ticket.deleted',
      description: `Deleted ticket #${existing.number}`,
    });

    return { deleted: true };
  });
}
