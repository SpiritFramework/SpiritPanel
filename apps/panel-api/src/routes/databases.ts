import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getServerAccess, hasClientPermission, logServerActivity } from '../lib/client-server.js';
import { decryptSecret, encryptSecret } from '../lib/secret-crypto.js';
import {
  deprovisionServerDatabase,
  generateDatabaseName,
  generateDatabasePassword,
  generateDatabaseUsername,
  hostFromRecord,
  provisionServerDatabase,
  testDatabaseHostConnection,
} from '../lib/database-provision.js';
import { ResourceQuotaError, assertUnderLimit, resourceQuotaMeta } from '../lib/server-quotas.js';

const REMOTE_HOST_PATTERN = /^[%a-zA-Z0-9._-]+$/;

function sanitizeDatabaseHost(host: {
  id: string;
  nodeId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  maxDatabases: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { databases: number };
}) {
  const { _count, ...rest } = host;
  return {
    ...rest,
    databaseCount: _count?.databases ?? 0,
  };
}

function formatServerDatabase(
  row: {
    id: string;
    serverId: string;
    databaseHostId: string;
    name: string;
    database: string;
    username: string;
    password: string;
    remote: string;
    createdAt: Date;
    updatedAt: Date;
    databaseHost: { id: string; name: string; host: string; port: number };
  },
  includePassword: boolean,
) {
  return {
    id: row.id,
    serverId: row.serverId,
    name: row.name,
    database: row.database,
    username: row.username,
    remote: row.remote,
    host: row.databaseHost.host,
    port: row.databaseHost.port,
    hostName: row.databaseHost.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(includePassword ? { password: decryptSecret(row.password) } : {}),
  };
}

async function pickDatabaseHost(nodeId: string) {
  const hosts = await prisma.databaseHost.findMany({
    where: { nodeId },
    include: { _count: { select: { databases: true } } },
    orderBy: { createdAt: 'asc' },
  });

  for (const host of hosts) {
    if (host.maxDatabases === 0 || host._count.databases < host.maxDatabases) {
      return host;
    }
  }

  return null;
}

export async function databaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/servers/:serverId/databases', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const access = await getServerAccess(serverId, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    if (!hasClientPermission(access.permissions, 'database.read')) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const canViewPassword = hasClientPermission(access.permissions, 'database.view_password');
    const canCreatePermission = hasClientPermission(access.permissions, 'database.create');
    const serverRecord = await prisma.server.findUnique({
      where: { id: access.server.id },
      select: { databaseLimit: true },
    });
    if (!serverRecord) return reply.status(404).send({ error: 'Not found' });

    const rows = await prisma.serverDatabase.findMany({
      where: { serverId: access.server.id },
      include: { databaseHost: { select: { id: true, name: true, host: true, port: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const meta = resourceQuotaMeta(serverRecord.databaseLimit, rows.length, canCreatePermission);

    return {
      databases: rows.map((row) => formatServerDatabase(row, canViewPassword)),
      ...meta,
    };
  });

  app.post('/servers/:serverId/databases', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const body = z
      .object({
        name: z.string().min(1).max(64),
        remote: z.string().default('%').refine((v) => REMOTE_HOST_PATTERN.test(v), {
          message: 'Invalid remote host pattern',
        }),
      })
      .parse(request.body);

    const access = await getServerAccess(serverId, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    if (!hasClientPermission(access.permissions, 'database.create')) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const serverRecord = await prisma.server.findUnique({
      where: { id: access.server.id },
      select: { databaseLimit: true, uuidShort: true },
    });
    if (!serverRecord) return reply.status(404).send({ error: 'Not found' });

    const existingCount = await prisma.serverDatabase.count({ where: { serverId: access.server.id } });
    try {
      assertUnderLimit(serverRecord.databaseLimit, existingCount, 'Database');
    } catch (err) {
      if (err instanceof ResourceQuotaError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }

    const host = await pickDatabaseHost(access.server.nodeId);
    if (!host) {
      return reply.status(422).send({
        error: 'No database host available on this node. Ask an administrator to configure one.',
      });
    }

    const dbName = generateDatabaseName(serverRecord.uuidShort);
    const dbUser = generateDatabaseUsername(serverRecord.uuidShort);
    const dbPassword = generateDatabasePassword();
    const connection = hostFromRecord(host);

    try {
      await provisionServerDatabase(connection, dbName, dbUser, dbPassword, body.remote);
    } catch (err) {
      return reply.status(422).send({
        error: `Failed to create database on host: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const limitRow = await tx.server.findUnique({
          where: { id: access.server.id },
          select: { databaseLimit: true },
        });
        if (!limitRow) throw new ResourceQuotaError('Not found');

        const count = await tx.serverDatabase.count({ where: { serverId: access.server.id } });
        assertUnderLimit(limitRow.databaseLimit, count, 'Database');

        return tx.serverDatabase.create({
          data: {
            serverId: access.server.id,
            databaseHostId: host.id,
            name: body.name.trim(),
            database: dbName,
            username: dbUser,
            password: encryptSecret(dbPassword),
            remote: body.remote,
          },
          include: { databaseHost: { select: { id: true, name: true, host: true, port: true } } },
        });
      });
    } catch (err) {
      await deprovisionServerDatabase(connection, dbName, dbUser, body.remote).catch(() => {});
      if (err instanceof ResourceQuotaError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }

    await logServerActivity(request, {
      serverId: access.server.id,
      event: 'server.database.created',
      description: `Created database ${body.name.trim()}`,
      properties: { databaseId: created.id, name: body.name.trim() },
    });

    return formatServerDatabase(created, true);
  });

  app.delete('/databases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await prisma.serverDatabase.findUnique({
      where: { id },
      include: { databaseHost: true },
    });
    if (!row) return reply.status(404).send({ error: 'Not found' });

    const access = await getServerAccess(row.serverId, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    if (!hasClientPermission(access.permissions, 'database.delete')) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const connection = hostFromRecord(row.databaseHost);
    try {
      await deprovisionServerDatabase(connection, row.database, row.username, row.remote);
    } catch (err) {
      return reply.status(422).send({
        error: `Failed to remove database from host: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    await prisma.serverDatabase.delete({ where: { id } });

    await logServerActivity(request, {
      serverId: row.serverId,
      event: 'server.database.deleted',
      description: `Deleted database ${row.name}`,
      properties: { databaseId: id, name: row.name },
    });

    return { deleted: true };
  });
}

const databaseHostBody = z.object({
  name: z.string().min(1).max(64),
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  username: z.string().min(1),
  password: z.string().min(1),
  maxDatabases: z.coerce.number().int().min(0).default(0),
  connectionVerified: z.boolean().optional(),
});

const databaseHostConnectionBody = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  username: z.string().min(1),
  password: z.string().min(1),
});

function parseDatabaseHostError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join('; ') || 'Invalid request body';
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (code === 'P2021') {
      return 'Database hosts table is missing — run: cd apps/panel-api && pnpm db:deploy';
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export async function adminDatabaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.post('/nodes/:nodeId/database-hosts/test-connection', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    const body = databaseHostConnectionBody.parse(request.body);

    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return reply.status(404).send({ error: 'Not found' });

    try {
      await testDatabaseHostConnection({
        host: body.host.trim(),
        port: body.port,
        username: body.username.trim(),
        password: body.password,
      });
      return { ok: true };
    } catch (err) {
      return reply.status(422).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get('/nodes/:nodeId/database-hosts', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return reply.status(404).send({ error: 'Not found' });

    const hosts = await prisma.databaseHost.findMany({
      where: { nodeId },
      include: { _count: { select: { databases: true } } },
      orderBy: { name: 'asc' },
    });

    return hosts.map(sanitizeDatabaseHost);
  });

  app.post('/nodes/:nodeId/database-hosts', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };

    let body: z.infer<typeof databaseHostBody>;
    try {
      body = databaseHostBody.parse(request.body);
    } catch (err) {
      return reply.status(400).send({ error: parseDatabaseHostError(err) });
    }

    const node = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return reply.status(404).send({ error: 'Not found' });

    const host = body.host.trim();
    const username = body.username.trim();

    if (!body.connectionVerified) {
      try {
        await testDatabaseHostConnection({
          host,
          port: body.port,
          username,
          password: body.password,
        });
      } catch (err) {
        return reply.status(422).send({
          error: `Could not connect to database host: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    try {
      const created = await prisma.databaseHost.create({
        data: {
          nodeId,
          name: body.name.trim(),
          host,
          port: body.port,
          username,
          password: encryptSecret(body.password),
          maxDatabases: body.maxDatabases,
        },
        include: { _count: { select: { databases: true } } },
      });

      return reply.status(201).send(sanitizeDatabaseHost(created));
    } catch (err) {
      request.log.error({ err, nodeId }, 'Failed to create database host');
      return reply.status(500).send({ error: parseDatabaseHostError(err) });
    }
  });

  app.patch('/nodes/:nodeId/database-hosts/:hostId', async (request, reply) => {
    const { nodeId, hostId } = request.params as { nodeId: string; hostId: string };
    const body = z
      .object({
        name: z.string().min(1).max(64).optional(),
        host: z.string().min(1).optional(),
        port: z.number().int().min(1).max(65535).optional(),
        username: z.string().min(1).optional(),
        password: z.string().min(1).optional(),
        maxDatabases: z.number().int().min(0).optional(),
      })
      .parse(request.body);

    const existing = await prisma.databaseHost.findFirst({ where: { id: hostId, nodeId } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const nextHost = body.host ?? existing.host;
    const nextPort = body.port ?? existing.port;
    const nextUser = body.username ?? existing.username;
    const nextPassword = body.password ?? decryptSecret(existing.password);

    if (body.host || body.port || body.username || body.password) {
      try {
        await testDatabaseHostConnection({
          host: nextHost,
          port: nextPort,
          username: nextUser,
          password: nextPassword,
        });
      } catch (err) {
        return reply.status(422).send({
          error: `Could not connect to database host: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const updated = await prisma.databaseHost.update({
      where: { id: hostId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.host !== undefined ? { host: body.host.trim() } : {}),
        ...(body.port !== undefined ? { port: body.port } : {}),
        ...(body.username !== undefined ? { username: body.username.trim() } : {}),
        ...(body.password !== undefined ? { password: encryptSecret(body.password) } : {}),
        ...(body.maxDatabases !== undefined ? { maxDatabases: body.maxDatabases } : {}),
      },
      include: { _count: { select: { databases: true } } },
    });

    return sanitizeDatabaseHost(updated);
  });

  app.delete('/nodes/:nodeId/database-hosts/:hostId', async (request, reply) => {
    const { nodeId, hostId } = request.params as { nodeId: string; hostId: string };
    const existing = await prisma.databaseHost.findFirst({
      where: { id: hostId, nodeId },
      include: { _count: { select: { databases: true } } },
    });
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    if (existing._count.databases > 0) {
      return reply.status(422).send({ error: 'Remove all server databases from this host first' });
    }

    await prisma.databaseHost.delete({ where: { id: hostId } });
    return { deleted: true };
  });

  app.get('/databases', async () => {
    const rows = await prisma.serverDatabase.findMany({
      include: {
        databaseHost: { select: { name: true, host: true, port: true } },
        server: { select: { id: true, name: true, uuid: true, owner: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      database: row.database,
      username: row.username,
      remote: row.remote,
      host: row.databaseHost.host,
      port: row.databaseHost.port,
      hostName: row.databaseHost.name,
      server: row.server,
      createdAt: row.createdAt,
    }));
  });
}
