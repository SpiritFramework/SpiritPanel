import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyApiKeyDetailed } from '../lib/auth.js';
import { API_KEY_TYPE_APPLICATION } from '../lib/api-keys.js';
import {
  applicationKeyHasScope,
  assertApplicationKeyIpAllowed,
  type ApplicationScope,
} from '../lib/application-scopes.js';
import { logApplicationApiUse } from '../lib/application-api-audit.js';
import { assertPasswordMeetsPolicy } from '../lib/password-policy.js';
import { APPLICATION_RATE_LIMIT } from '../lib/rate-limits.js';
import { wingsSyncFireAndForget } from '../lib/wings-sync.js';
import {
  assertNodeHasCapacityForUpdate,
  createServerOnPanel,
  deleteServerFromPanel,
  syncServerToWings,
} from '../services/server-lifecycle.js';
import { isMailEnabled, sendServerCreatedEmail } from '../lib/mailer.js';

async function requireApplicationKey(request: FastifyRequest, reply: FastifyReply) {
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

  try {
    assertApplicationKeyIpAllowed(result.applicationKey!, request);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 403;
    return reply.status(statusCode).send({
      error: err instanceof Error ? err.message : 'Forbidden',
    });
  }

  request.user = user;
  request.applicationApiKey = result.applicationKey;
}

function requireApplicationScope(scope: ApplicationScope) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const key = request.applicationApiKey;
    if (!key || !applicationKeyHasScope(key, scope)) {
      return reply.status(403).send({ error: 'Insufficient API key permissions' });
    }
    await logApplicationApiUse(request, scope);
  };
}

export async function applicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireApplicationKey);

  app.get(
    '/users',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('users.read') },
    async (request) => {
      const q = (request.query as { email?: string }).email;
      return prisma.user.findMany({
        where: q ? { email: q.trim().toLowerCase() } : undefined,
        select: { id: true, uuid: true, email: true, username: true, createdAt: true },
        take: q ? 1 : 100,
        orderBy: { createdAt: 'desc' },
      });
    },
  );

  app.get(
    '/users/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('users.read') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findFirst({
        where: { OR: [{ id }, { uuid: id }] },
        select: {
          id: true,
          uuid: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          enabled: true,
        },
      });
      if (!user) return reply.status(404).send({ error: 'Panel user not found' });
      return user;
    },
  );

  app.post(
    '/users',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('users.write') },
    async (request, reply) => {
      const body = z
        .object({
          email: z.string().email(),
          username: z.string().min(3),
          password: z.string().min(1),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .parse(request.body);

      try {
        await assertPasswordMeetsPolicy(body.password);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
        return reply.status(statusCode).send({
          error: err instanceof Error ? err.message : 'Invalid password',
        });
      }

      try {
        // Do not spread `body` into Prisma data — it includes `password`, which is not a User field.
        return await prisma.user.create({
          data: {
            email: body.email.toLowerCase(),
            username: body.username,
            firstName: body.firstName,
            lastName: body.lastName,
            passwordHash: await hashPassword(body.password),
          },
          select: { id: true, uuid: true, email: true, username: true, firstName: true, lastName: true },
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'P2002') {
          return reply.status(409).send({ error: 'Email or username already exists' });
        }
        request.log.error({ err }, 'Application API user create failed');
        throw err;
      }
    },
  );

  app.patch(
    '/users/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('users.write') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          email: z.string().email().optional(),
          username: z.string().min(3).optional(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          avatarUrl: z
            .union([
              z.literal(''),
              z.null(),
              z.string().url().max(512).refine((u) => /^https?:\/\//i.test(u), {
                message: 'Avatar URL must use http or https',
              }),
            ])
            .optional(),
          password: z.string().min(1).optional(),
          enabled: z.boolean().optional(),
        })
        .parse(request.body);

      const existing = await prisma.user.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
      if (!existing) return reply.status(404).send({ error: 'Not found' });

      if (body.password) {
        try {
          await assertPasswordMeetsPolicy(body.password);
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
          return reply.status(statusCode).send({
            error: err instanceof Error ? err.message : 'Invalid password',
          });
        }
      }

      try {
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...(body.email !== undefined ? { email: body.email } : {}),
            ...(body.username !== undefined ? { username: body.username } : {}),
            ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
            ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
            ...(body.avatarUrl !== undefined
              ? { avatarUrl: body.avatarUrl === '' ? null : body.avatarUrl }
              : {}),
            ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
            ...(body.password
              ? {
                  passwordHash: await hashPassword(body.password),
                  tokenVersion: { increment: 1 },
                }
              : {}),
          },
          select: {
            id: true,
            uuid: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            enabled: true,
          },
        });
        return updated;
      } catch {
        return reply.status(422).send({ error: 'Could not update user (email or username may already exist)' });
      }
    },
  );

  app.delete(
    '/users/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('users.write') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findFirst({
        where: { OR: [{ id }, { uuid: id }] },
        select: { id: true, username: true, _count: { select: { servers: true } } },
      });
      if (!user) return reply.status(404).send({ error: 'Panel user not found' });
      if (user.id === request.user!.id) {
        return reply.status(422).send({ error: 'The Application API owner cannot delete its own account' });
      }
      if (user._count.servers > 0) {
        return reply.status(409).send({
          error: `Cannot delete panel user with ${user._count.servers} owned server(s). Delete their services first.`,
        });
      }

      await prisma.user.delete({ where: { id: user.id } });
      return { deleted: true };
    },
  );

  app.get(
    '/nodes',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.read') },
    async () =>
      prisma.node.findMany({
        select: {
          id: true,
          uuid: true,
          name: true,
          fqdn: true,
          maintenanceMode: true,
          memory: true,
          disk: true,
          location: { select: { id: true, short: true, long: true, flagUrl: true } },
          _count: { select: { servers: true, allocations: true } },
        },
        orderBy: { name: 'asc' },
      }),
  );

  app.get(
    '/nodes/:id/allocations',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.read') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const q = request.query as { unassigned?: string };
      const node = await prisma.node.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
      if (!node) return reply.status(404).send({ error: 'Not found' });
      return prisma.allocation.findMany({
        where: {
          nodeId: node.id,
          ...(q.unassigned === 'true' || q.unassigned === '1'
            ? { assigned: false, serverId: null }
            : {}),
        },
        select: { id: true, ip: true, port: true, alias: true, assigned: true },
        orderBy: [{ ip: 'asc' }, { port: 'asc' }],
      });
    },
  );

  app.get(
    '/eggs',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.read') },
    async () =>
      prisma.egg.findMany({
        where: { enabled: true },
        select: {
          id: true,
          uuid: true,
          name: true,
          description: true,
          nest: { select: { id: true, name: true } },
        },
        orderBy: [{ nest: { name: 'asc' } }, { name: 'asc' }],
      }),
  );

  app.get(
    '/servers',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.read') },
    async (request) => {
      const q = (request.query as { externalId?: string }).externalId?.trim();
      return prisma.server.findMany({
        where: q ? { externalId: q } : undefined,
        include: { owner: { select: { email: true } }, defaultAllocation: true },
      });
    },
  );

  app.post(
    '/servers',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.write') },
    async (request, reply) => {
      const body = z
        .object({
          ownerId: z.string(),
          nodeId: z.string(),
          eggId: z.string(),
          allocationId: z.string().optional(),
          name: z.string(),
          description: z.string().optional(),
          externalId: z.string().optional(),
          memory: z.number().int().min(0).default(1024),
          disk: z.number().int().min(0).default(10240),
          cpu: z.number().int().min(0).default(100),
          environment: z.record(z.string()).optional(),
          allocationLimit: z.number().int().min(0).default(0),
          backupLimit: z.number().int().min(0).default(0),
          databaseLimit: z.number().int().min(0).default(0),
          subdomainAccess: z.boolean().optional(),
          fivemMarketplaceAccess: z.boolean().optional(),
          minecraftPluginsAccess: z.boolean().optional(),
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
        const code = (e as { code?: string }).code;
        if (code === 'P2002') {
          return reply.status(409).send({ error: 'Server already exists for this external ID' });
        }
        request.log.error({ err: e }, 'Application API server create failed');
        return reply.status(422).send({ error: 'Could not create server with the provided data' });
      }
    },
  );

  app.get(
    '/servers/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.read') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await prisma.server.findFirst({
        where: { OR: [{ id }, { uuid: id }] },
        include: { defaultAllocation: true, owner: true },
      });
      if (!server) return reply.status(404).send({ error: 'Not found' });
      return server;
    },
  );

  app.patch(
    '/servers/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.write') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          name: z.string().min(1).max(191).optional(),
          memory: z.number().int().min(0).optional(),
          disk: z.number().int().min(0).optional(),
          cpu: z.number().int().min(0).optional(),
          allocationLimit: z.number().int().min(0).optional(),
          backupLimit: z.number().int().min(0).optional(),
          databaseLimit: z.number().int().min(0).optional(),
          subdomainAccess: z.boolean().optional(),
          fivemMarketplaceAccess: z.boolean().optional(),
          minecraftPluginsAccess: z.boolean().optional(),
        })
        .strict()
        .parse(request.body);

      const existing = await prisma.server.findFirst({
        where: { OR: [{ id }, { uuid: id }] },
        include: { node: true },
      });
      if (!existing) return reply.status(404).send({ error: 'Not found' });

      if (body.memory !== undefined || body.disk !== undefined) {
        try {
          await assertNodeHasCapacityForUpdate(
            existing.node,
            existing.id,
            body.memory ?? existing.memory,
            body.disk ?? existing.disk,
          );
        } catch (err) {
          return reply.status(422).send({ error: err instanceof Error ? err.message : String(err) });
        }
      }

      const updated = await prisma.server.update({
        where: { id: existing.id },
        data: body,
        include: { defaultAllocation: true, owner: true },
      });
      await syncServerToWings(updated.uuid);
      return updated;
    },
  );

  app.post(
    '/servers/:id/suspend',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.suspend') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
      if (!server) return reply.status(404).send({ error: 'Not found' });
      const updated = await prisma.server.update({
        where: { id: server.id },
        data: { suspended: true, status: 'suspended' },
      });
      wingsSyncFireAndForget('sync after suspend', syncServerToWings(server.uuid), { serverUuid: server.uuid });
      return updated;
    },
  );

  app.post(
    '/servers/:id/unsuspend',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.suspend') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
      if (!server) return reply.status(404).send({ error: 'Not found' });
      const updated = await prisma.server.update({
        where: { id: server.id },
        data: { suspended: false, status: 'normal' },
      });
      wingsSyncFireAndForget('sync after unsuspend', syncServerToWings(server.uuid), { serverUuid: server.uuid });
      return updated;
    },
  );

  app.delete(
    '/servers/:id',
    { config: APPLICATION_RATE_LIMIT, preHandler: requireApplicationScope('servers.delete') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await prisma.server.findFirst({ where: { OR: [{ id }, { uuid: id }] } });
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await deleteServerFromPanel(server.uuid);
      return { deleted: true };
    },
  );
}
