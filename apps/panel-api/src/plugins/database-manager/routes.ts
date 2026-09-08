import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { getServerAccess, hasClientPermission } from '../../lib/client-server.js';
import { EXPENSIVE_ROUTE_RATE_LIMIT } from '../../lib/rate-limits.js';
import { sendClientError } from '../../lib/safe-errors.js';
import {
  getDatabaseManagerCapabilities,
  isDatabaseManagerActive,
} from '../manager.js';
import {
  deleteManagerRow,
  getManagerTable,
  insertManagerRow,
  listManagerTables,
  runManagerQuery,
  runManagerScript,
  updateManagerRow,
} from './service.js';

function errorStatus(err: unknown, fallback = 500): number {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = Number((err as { statusCode?: unknown }).statusCode);
    if (Number.isFinite(code) && code >= 400 && code < 600) return code;
  }
  return fallback;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function respondError(
  reply: import('fastify').FastifyReply,
  err: unknown,
  fallback: string,
  log?: import('fastify').FastifyBaseLogger,
) {
  const status = errorStatus(err);
  if (status < 500) {
    return reply.status(status).send({ error: errorMessage(err, fallback) });
  }
  return sendClientError(reply, status, 'database', log, err, fallback);
}

async function requireDatabaseManagerAccess(serverId: string, userId: string) {
  if (!(await isDatabaseManagerActive())) {
    return { error: { status: 403 as const, body: { error: 'Database manager plugin is disabled' } } };
  }
  const access = await getServerAccess(serverId, userId);
  if (!access) {
    return { error: { status: 404 as const, body: { error: 'Not found' } } };
  }
  if (!hasClientPermission(access.permissions, 'database.read')) {
    return { error: { status: 403 as const, body: { error: 'Forbidden' } } };
  }
  const capabilities = await getDatabaseManagerCapabilities();
  const canEdit =
    capabilities.allowDataEdits && hasClientPermission(access.permissions, 'database.update');
  return {
    access,
    capabilities: {
      ...capabilities,
      allowDataEdits: canEdit,
      canEdit,
    },
  };
}

const cellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export async function databaseManagerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get(
    '/servers/:serverId/databases/:databaseId/manager',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId } = request.params as { serverId: string; databaseId: string };
      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);

      try {
        const tables = await listManagerTables(databaseId, gate.access!.server.id);
        return {
          capabilities: gate.capabilities,
          tables,
        };
      } catch (err) {
        return respondError(reply, err, 'Failed to load database schema', request.log);
      }
    },
  );

  app.get(
    '/servers/:serverId/databases/:databaseId/manager/tables/:table',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId, table } = request.params as {
        serverId: string;
        databaseId: string;
        table: string;
      };
      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(50),
        })
        .parse(request.query);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);

      try {
        return await getManagerTable(databaseId, gate.access!.server.id, decodeURIComponent(table), query);
      } catch (err) {
        return respondError(reply, err, 'Failed to load table', request.log);
      }
    },
  );

  app.post(
    '/servers/:serverId/databases/:databaseId/manager/query',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId } = request.params as { serverId: string; databaseId: string };
      const body = z
        .object({
          sql: z.string().min(1).max(20_000),
        })
        .parse(request.body);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);

      try {
        return await runManagerQuery(databaseId, gate.access!.server.id, body.sql, {
          allowSqlConsole: gate.capabilities!.allowSqlConsole,
          allowDataEdits: gate.capabilities!.canEdit,
        });
      } catch (err) {
        return respondError(reply, err, 'Query failed', request.log);
      }
    },
  );

  app.post(
    '/servers/:serverId/databases/:databaseId/manager/script',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId } = request.params as { serverId: string; databaseId: string };
      const body = z
        .object({
          sql: z.string().min(1).max(2_000_000),
          fileName: z.string().max(255).optional(),
        })
        .parse(request.body);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);

      try {
        return await runManagerScript(databaseId, gate.access!.server.id, body.sql, {
          allowSqlConsole: gate.capabilities!.allowSqlConsole,
          allowDataEdits: gate.capabilities!.canEdit,
        });
      } catch (err) {
        return respondError(reply, err, 'SQL import failed', request.log);
      }
    },
  );

  app.post(
    '/servers/:serverId/databases/:databaseId/manager/tables/:table/rows',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId, table } = request.params as {
        serverId: string;
        databaseId: string;
        table: string;
      };
      const body = z
        .object({
          values: z.record(cellValueSchema),
        })
        .parse(request.body);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);
      if (!gate.capabilities!.canEdit) {
        return reply.status(403).send({ error: 'You do not have permission to edit database data' });
      }

      try {
        return await insertManagerRow(
          databaseId,
          gate.access!.server.id,
          decodeURIComponent(table),
          body.values,
          { allowSqlConsole: true, allowDataEdits: true },
        );
      } catch (err) {
        return respondError(reply, err, 'Insert failed', request.log);
      }
    },
  );

  app.patch(
    '/servers/:serverId/databases/:databaseId/manager/tables/:table/rows',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId, table } = request.params as {
        serverId: string;
        databaseId: string;
        table: string;
      };
      const body = z
        .object({
          primaryKey: z.record(cellValueSchema),
          values: z.record(cellValueSchema),
        })
        .parse(request.body);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);
      if (!gate.capabilities!.canEdit) {
        return reply.status(403).send({ error: 'You do not have permission to edit database data' });
      }

      try {
        return await updateManagerRow(
          databaseId,
          gate.access!.server.id,
          decodeURIComponent(table),
          body.primaryKey,
          body.values,
          { allowSqlConsole: true, allowDataEdits: true },
        );
      } catch (err) {
        return respondError(reply, err, 'Update failed', request.log);
      }
    },
  );

  app.delete(
    '/servers/:serverId/databases/:databaseId/manager/tables/:table/rows',
    { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } },
    async (request, reply) => {
      const { serverId, databaseId, table } = request.params as {
        serverId: string;
        databaseId: string;
        table: string;
      };
      const body = z
        .object({
          primaryKey: z.record(cellValueSchema),
        })
        .parse(request.body);

      const gate = await requireDatabaseManagerAccess(serverId, request.user!.id);
      if ('error' in gate && gate.error) return reply.status(gate.error.status).send(gate.error.body);
      if (!gate.capabilities!.canEdit) {
        return reply.status(403).send({ error: 'You do not have permission to edit database data' });
      }

      try {
        return await deleteManagerRow(
          databaseId,
          gate.access!.server.id,
          decodeURIComponent(table),
          body.primaryKey,
          { allowSqlConsole: true, allowDataEdits: true },
        );
      } catch (err) {
        return respondError(reply, err, 'Delete failed', request.log);
      }
    },
  );
}
