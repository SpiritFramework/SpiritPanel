import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyApiKeyDetailed } from '../lib/auth.js';
import { API_KEY_TYPE_APPLICATION } from '../lib/api-keys.js';
import { getPasswordMinLength } from '../lib/password-policy.js';
import { getConfig } from '../lib/env.js';
import { createServerOnPanel, deleteServerFromPanel, syncServerToWings } from '../services/server-lifecycle.js';
import { isMailEnabled, sendServerCreatedEmail } from '../lib/mailer.js';

const APPLICATION_RATE_LIMIT = {
  rateLimit: {
    max: getConfig().isProduction ? 60 : 120,
    timeWindow: '1 minute',
  },
};

async function requireApplicationKey(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return reply.status(401).send({ error: 'Unauthorized' });
  const identifier = token.slice(0, dotIndex);
  const secret = token.slice(dotIndex + 1);
  const result = await verifyApiKeyDetailed(identifier, secret);
  if (!result || result.keyType !== API_KEY_TYPE_APPLICATION) {
    return reply.status(403).send({ error: 'Application API key required' });
  }
  const user = result.user;
  if (!user.enabled || (user.role !== 'admin' && !user.rootAdmin)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.user = user;
}

export async function applicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireApplicationKey);

  app.get('/users', { config: APPLICATION_RATE_LIMIT }, async (request) => {
    const q = (request.query as { email?: string }).email;
    return prisma.user.findMany({
      where: q ? { email: q } : undefined,
      select: { id: true, uuid: true, email: true, username: true, createdAt: true },
    });
  });

  app.post('/users', { config: APPLICATION_RATE_LIMIT }, async (request) => {
    const minPasswordLength = await getPasswordMinLength();
    const body = z
      .object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(minPasswordLength),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .parse(request.body);

    return prisma.user.create({
      data: {
        ...body,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, uuid: true, email: true, username: true },
    });
  });

  app.get('/servers', { config: APPLICATION_RATE_LIMIT }, async () =>
    prisma.server.findMany({
      include: { owner: { select: { email: true } }, defaultAllocation: true },
    }),
  );

  app.post('/servers', { config: APPLICATION_RATE_LIMIT }, async (request, reply) => {
    const body = z
      .object({
        ownerId: z.string(),
        nodeId: z.string(),
        eggId: z.string(),
        allocationId: z.string().optional(),
        name: z.string(),
        memory: z.number().int().min(0).default(1024),
        disk: z.number().int().min(0).default(10240),
        cpu: z.number().int().min(0).default(100),
        environment: z.record(z.string()).optional(),
        allocationLimit: z.number().int().min(0).default(0),
        backupLimit: z.number().int().min(0).default(0),
        databaseLimit: z.number().int().min(0).default(0),
      })
      .parse(request.body);

    try {
      const server = await createServerOnPanel(body);
      const owner = await prisma.user.findUnique({
        where: { id: body.ownerId },
        select: { email: true, username: true },
      });
      if (await isMailEnabled() && owner) {
        try {
          await sendServerCreatedEmail({
            id: server.id,
            name: server.name,
            owner,
            node: server.node,
            egg: server.egg,
            defaultAllocation: server.defaultAllocation,
          });
        } catch (err) {
          request.log.error({ err }, 'Failed to send server created email');
        }
      }
      return server;
    } catch (e) {
      return reply.status(422).send({ error: String(e) });
    }
  });

  app.get('/servers/:id', { config: APPLICATION_RATE_LIMIT }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findFirst({
      where: { OR: [{ id }, { uuid: id }] },
      include: { defaultAllocation: true, owner: true },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return server;
  });

  app.post('/servers/:id/suspend', { config: APPLICATION_RATE_LIMIT }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const updated = await prisma.server.update({
      where: { id: server.id },
      data: { suspended: true, status: 'suspended' },
    });
    await syncServerToWings(server.uuid).catch(() => {});
    return updated;
  });

  app.post('/servers/:id/unsuspend', { config: APPLICATION_RATE_LIMIT }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const updated = await prisma.server.update({
      where: { id: server.id },
      data: { suspended: false, status: 'normal' },
    });
    await syncServerToWings(server.uuid).catch(() => {});
    return updated;
  });

  app.delete('/servers/:id', { config: APPLICATION_RATE_LIMIT }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await deleteServerFromPanel(server.uuid);
    return { deleted: true };
  });
}
