import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateCronExpression } from '../lib/cron-match.js';
import { getServerAccess, hasClientPermission, logServerActivity } from '../lib/client-server.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { executeSchedule } from '../services/schedule-runner.js';
import { wingsForNode, WingsError } from '../services/wings-client.js';
import { signWingsJwt } from '../lib/auth.js';
import { ResourceQuotaError, assertUnderLimit, resourceQuotaMeta } from '../lib/server-quotas.js';
import {
  assertBackupFitsDiskBudget,
  getServerDiskBudget,
  serializeDiskBudget,
} from '../lib/server-disk-budget.js';
import { sendClientError } from '../lib/safe-errors.js';
import { diskFromChecksumType, resolveStoredBackupAdapter } from '../lib/backup-adapter.js';
import { getConfig } from '../lib/env.js';
import { openColocatedBackupStream, resolveColocatedBackupFile } from '../lib/local-backup-path.js';
import { isNodeColocatedWithPanel } from '../lib/wings-socket.js';

const POWER_ACTIONS = ['start', 'stop', 'restart', 'kill'] as const;

const taskSchema = z
  .object({
    action: z.enum(['power', 'command', 'backup']),
    payload: z.string().default(''),
    sequenceId: z.number().int().min(0),
    timeOffset: z.number().int().min(0).default(0),
    continueOnFailure: z.boolean().default(false),
  })
  .superRefine((task, ctx) => {
    if (task.action === 'power' && task.payload.trim()) {
      if (!POWER_ACTIONS.includes(task.payload.trim() as (typeof POWER_ACTIONS)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Power task payload must be one of: ${POWER_ACTIONS.join(', ')}`,
          path: ['payload'],
        });
      }
    }
  });

export async function backupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/servers/:serverId/backups', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const access = await requireServerAccess(request, reply, serverId, 'backup.read');
    if (!access) return;

    const server = await prisma.server.findUnique({
      where: { id: access.server.id },
      include: { node: true },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const backups = await prisma.backup.findMany({
      where: { serverId: access.server.id },
      orderBy: { createdAt: 'desc' },
    });

    const used = backups.length;
    const canCreatePermission = hasClientPermission(access.permissions, 'backup.create');
    const meta = resourceQuotaMeta(server.backupLimit, used, canCreatePermission);
    const disk = await getServerDiskBudget(server, prisma);

    return {
      backups: backups.map(serializeBackup),
      ...meta,
      canCreate: meta.canCreate && disk.canFitEstimatedBackup,
      disk: serializeDiskBudget(disk),
    };
  });

  app.post('/servers/:serverId/backups', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const body = z
      .object({ name: z.string().min(1).max(191), ignored: z.string().optional() })
      .parse(request.body);
    const access = await requireServerAccess(request, reply, serverId, 'backup.create');
    if (!access) return;

    let backup;
    try {
      const server = await prisma.server.findUnique({
        where: { id: access.server.id },
        include: { node: true },
      });
      if (!server) return reply.status(404).send({ error: 'Not found' });

      // Disk budget check outside the short transaction (needs Wings I/O).
      await assertBackupFitsDiskBudget(server, prisma);

      backup = await prisma.$transaction(async (tx) => {
        const row = await tx.server.findUnique({
          where: { id: server.id },
          select: { backupLimit: true },
        });
        if (!row) throw new ResourceQuotaError('Not found');

        const count = await tx.backup.count({ where: { serverId: server.id } });
        assertUnderLimit(row.backupLimit, count, 'Backup');

        return tx.backup.create({
          data: { serverId: server.id, name: body.name, ignored: body.ignored ? body.ignored : '[]' },
        });
      });
    } catch (err) {
      if (err instanceof ResourceQuotaError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }

    const server = await prisma.server.findUniqueOrThrow({
      where: { id: access.server.id },
      include: { node: true },
    });

    const wings = wingsForNode(server.node);
    const adapter = await wings.resolveBackupAdapter();

    try {
      const ignoreList = parseIgnored(body.ignored);
      await wings.createBackup(server.uuid, backup.uuid, ignoreList, adapter);
      if (adapter !== backup.disk) {
        backup = await prisma.backup.update({ where: { id: backup.id }, data: { disk: adapter } });
      }
    } catch (err) {
      // Roll back the row if the daemon refused to start the backup.
      await prisma.backup.delete({ where: { id: backup.id } }).catch(() => {});
      const message = err instanceof Error ? err.message : 'Failed to start backup';
      return reply.status(502).send({ error: message });
    }

    await logServerActivity(request, {
      serverId: server.id,
      event: 'server.backup.created',
      description: `${request.user!.username} created backup "${body.name}"`,
      properties: { backupId: backup.id },
    });
    return serializeBackup(backup);
  });

  app.post('/backups/:id/restore', async (request, reply) => {
    const { id } = request.params as { id: string };
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, backup.serverId, 'backup.create');
    if (!access) return;
    if (!backup.isSuccessful) {
      return reply.status(400).send({ error: 'Backup is not complete yet' });
    }
    const server = await prisma.server.findUnique({ where: { id: backup.serverId }, include: { node: true } });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    try {
      const adapter = resolveStoredBackupAdapter(backup);
      await wingsForNode(server.node).restoreBackup(server.uuid, backup.uuid, {
        adapter,
        truncate: true,
      });
      await prisma.server.update({ where: { id: server.id }, data: { status: 'restoring_backup' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore backup';
      return reply.status(502).send({ error: message });
    }
    await logServerActivity(request, {
      serverId: server.id,
      event: 'server.backup.restore',
      description: `${request.user!.username} restored backup "${backup.name}"`,
    });
    return { success: true };
  });

  app.get('/backups/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, backup.serverId, 'backup.read');
    if (!access) return;
    if (!backup.isSuccessful) return reply.status(400).send({ error: 'Backup is not complete yet' });
    const server = await prisma.server.findUnique({ where: { id: backup.serverId }, include: { node: true } });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const wings = wingsForNode(server.node);
    let listedOnNode = false;
    let localBackupCount = 0;
    try {
      const list = await wings.listServerBackups(server.uuid);
      const entries = list.data ?? [];
      localBackupCount = entries.length;
      listedOnNode = entries.some(
        (entry) => entry.uuid.toLowerCase() === backup.uuid.toLowerCase(),
      );
    } catch (listErr) {
      request.log.warn({ err: listErr, serverId: server.id }, 'backup list failed before download');
    }

    try {
      const wingsRes = await wings.downloadBackup(
        server.uuid,
        backup.uuid,
        request.user!.uuid,
        signWingsJwt,
      );
      const disposition = wingsRes.headers.get('content-disposition');
      const filename = backupAttachmentName(backup.name, disposition);
      reply.header('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      reply.type(wingsRes.headers.get('content-type') || 'application/octet-stream');
      const len = wingsRes.headers.get('content-length');
      if (len) reply.header('Content-Length', len);

      await logServerActivity(request, {
        serverId: server.id,
        event: 'server.backup.download',
        description: `${request.user!.username} downloaded backup "${backup.name}"`,
        properties: { backupId: backup.id },
      });

      if (wingsRes.body) {
        return reply.send(Readable.fromWeb(wingsRes.body as import('node:stream/web').ReadableStream));
      }
      const arrayBuffer = await wingsRes.arrayBuffer();
      return reply.send(Buffer.from(arrayBuffer));
    } catch (err) {
      if (err instanceof WingsError && err.status === 404) {
        const adapter = resolveStoredBackupAdapter(backup);
        if (adapter === 'pbs') {
          return reply.status(404).send({
            error:
              'This backup is stored on Proxmox Backup Server and could not be exported. Rebuild and restart FeatherWings on the node with the latest panel release.',
          });
        }
        if (listedOnNode) {
          const panelUrl = getConfig().panelUrl || getConfig().apiUrl;
          if (isNodeColocatedWithPanel(server.node, panelUrl)) {
            const localPath = resolveColocatedBackupFile(server.uuid, backup.uuid);
            if (localPath) {
              const { stream, size } = openColocatedBackupStream(localPath);
              const filename = backupAttachmentName(backup.name, null);
              reply.header('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
              reply.type('application/octet-stream');
              reply.header('Content-Length', String(size));
              await logServerActivity(request, {
                serverId: server.id,
                event: 'server.backup.download',
                description: `${request.user!.username} downloaded backup "${backup.name}"`,
                properties: { backupId: backup.id, source: 'local-disk' },
              });
              request.log.info(
                { serverId: server.id, backupId: backup.id, path: localPath },
                'served backup from colocated disk (FeatherWings download route unavailable)',
              );
              return reply.send(stream);
            }
          }
          return reply.status(404).send({
            error:
              'The backup file is on the node but could not be streamed. Rebuild FeatherWings from this release and restart the daemon on the node.',
          });
        }
        return reply.status(404).send({
          error: 'Backup archive not found on the node',
          hint: `Expected ${backup.uuid}.tar.gz under the node backup directory for server ${server.uuid}. The node currently lists ${localBackupCount} local backup(s) for this server.`,
        });
      }
      return sendClientError(reply, 502, 'wings', request.log, err, 'Failed to download backup');
    }
  });

  app.patch('/backups/:id/lock', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ locked: z.boolean() }).parse(request.body);
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, backup.serverId, 'backup.delete');
    if (!access) return;
    const updated = await prisma.backup.update({ where: { id }, data: { isLocked: body.locked } });
    return serializeBackup(updated);
  });

  app.delete('/backups/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const backup = await prisma.backup.findUnique({ where: { id }, include: { server: { include: { node: true } } } });
    if (!backup) return reply.status(404).send({ error: 'Not found' });
    if (backup.isLocked) return reply.status(400).send({ error: 'This backup is locked. Unlock it before deleting.' });
    const access = await requireServerAccess(request, reply, backup.serverId, 'backup.delete');
    if (!access) return;

    try {
      await wingsForNode(backup.server.node).deleteBackup(backup.server.uuid, backup.uuid);
    } catch (err) {
      // If the daemon already lost the backup, continue removing the row.
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('(404)')) {
        return reply.status(502).send({ error: message || 'Failed to delete backup on node' });
      }
    }

    await prisma.backup.delete({ where: { id } });
    await logServerActivity(request, {
      serverId: backup.serverId,
      event: 'server.backup.deleted',
      description: `${request.user!.username} deleted backup "${backup.name}"`,
    });
    return { deleted: true };
  });
}

function parseIgnored(raw?: string): string {
  if (!raw) return '';
  // Accept either a newline list or a JSON array string.
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as string[];
      return arr.join('\n');
    } catch {
      return '';
    }
  }
  return trimmed;
}

function backupAttachmentName(backupName: string, contentDisposition: string | null): string {
  if (contentDisposition) {
    const star = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (star?.[1]) {
      try {
        return decodeURIComponent(star[1]);
      } catch {
        // fall through
      }
    }
    const quoted = contentDisposition.match(/filename="([^"]+)"/i);
    if (quoted?.[1]) return quoted[1];
    const plain = contentDisposition.match(/filename=([^;\s]+)/i);
    if (plain?.[1]) return plain[1].replace(/"/g, '');
  }
  const base = backupName.replace(/[^\w.\- ]+/g, '_').trim() || 'backup';
  return /\.(tar|gz|zip|pxar)$/i.test(base) ? base : `${base}.tar.gz`;
}

function serializeBackup(backup: {
  id: string;
  uuid: string;
  name: string;
  ignored: string;
  isSuccessful: boolean;
  isLocked: boolean;
  bytes: bigint;
  checksum: string | null;
  disk: string;
  completedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: backup.id,
    uuid: backup.uuid,
    name: backup.name,
    ignored: backup.ignored,
    isSuccessful: backup.isSuccessful,
    isLocked: backup.isLocked,
    bytes: Number(backup.bytes),
    checksum: backup.checksum,
    disk: resolveStoredBackupAdapter(backup),
    completedAt: backup.completedAt?.toISOString() ?? null,
    createdAt: backup.createdAt.toISOString(),
  };
}

function serializeSchedule(schedule: {
  id: string;
  serverId: string;
  name: string;
  cron: string;
  isActive: boolean;
  onlyWhenOnline: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{
    id: string;
    scheduleId: string;
    action: string;
    payload: string;
    sequenceId: number;
    timeOffset: number;
    continueOnFailure: boolean;
  }>;
}) {
  return {
    id: schedule.id,
    serverId: schedule.serverId,
    name: schedule.name,
    cron: schedule.cron,
    isActive: schedule.isActive,
    onlyWhenOnline: schedule.onlyWhenOnline,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    tasks: schedule.tasks.map((task) => ({
      id: task.id,
      action: task.action,
      payload: task.payload,
      sequenceId: task.sequenceId,
      timeOffset: task.timeOffset,
      continueOnFailure: task.continueOnFailure,
    })),
  };
}

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/servers/:serverId/schedules', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const access = await requireServerAccess(request, reply, serverId, 'schedule.read');
    if (!access) return;
    const rows = await prisma.schedule.findMany({
      where: { serverId: access.server.id },
      include: { tasks: { orderBy: { sequenceId: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeSchedule);
  });

  app.post('/servers/:serverId/schedules', async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const body = z
      .object({
        name: z.string().min(1).max(191),
        cron: z.string().min(9),
        onlyWhenOnline: z.boolean().default(false),
        tasks: z.array(taskSchema).min(1),
      })
      .parse(request.body);
    if (!validateCronExpression(body.cron)) {
      return reply.status(422).send({ error: 'Cron must have 5 fields: minute hour day month weekday' });
    }
    const access = await requireServerAccess(request, reply, serverId, 'schedule.create');
    if (!access) return;
    const schedule = await prisma.schedule.create({
      data: {
        serverId: access.server.id,
        name: body.name,
        cron: body.cron,
        onlyWhenOnline: body.onlyWhenOnline,
        tasks: { create: body.tasks },
      },
      include: { tasks: { orderBy: { sequenceId: 'asc' } } },
    });
    await logServerActivity(request, {
      serverId: access.server.id,
      event: 'server.schedule.created',
      description: `${request.user!.username} created schedule "${body.name}"`,
    });
    return serializeSchedule(schedule);
  });

  app.patch('/schedules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1).max(191).optional(),
        cron: z.string().min(9).optional(),
        isActive: z.boolean().optional(),
        onlyWhenOnline: z.boolean().optional(),
        tasks: z.array(taskSchema).optional(),
      })
      .parse(request.body);
    if (body.cron && !validateCronExpression(body.cron)) {
      return reply.status(422).send({ error: 'Cron must have 5 fields: minute hour day month weekday' });
    }
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, schedule.serverId, 'schedule.update');
    if (!access) return;

    const { tasks, ...updates } = body;
    return prisma.$transaction(async (tx) => {
      if (tasks) {
        await tx.scheduleTask.deleteMany({ where: { scheduleId: id } });
        await tx.scheduleTask.createMany({ data: tasks.map((task) => ({ ...task, scheduleId: id })) });
      }
      return serializeSchedule(
        await tx.schedule.update({
          where: { id },
          data: updates,
          include: { tasks: { orderBy: { sequenceId: 'asc' } } },
        }),
      );
    });
  });

  app.post('/schedules/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, schedule.serverId, 'schedule.update');
    if (!access) return;

    try {
      await executeSchedule(id, { manual: true });
    } catch (err) {
      return reply.status(502).send({ error: err instanceof Error ? err.message : 'Schedule run failed' });
    }

    await logServerActivity(request, {
      serverId: schedule.serverId,
      event: 'server.schedule.executed',
      description: `${request.user!.username} ran schedule "${schedule.name}" manually`,
    });
    return { executed: true };
  });

  app.delete('/schedules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) return reply.status(404).send({ error: 'Not found' });
    const access = await requireServerAccess(request, reply, schedule.serverId, 'schedule.delete');
    if (!access) return;
    await prisma.schedule.delete({ where: { id } });
    await logServerActivity(request, {
      serverId: schedule.serverId,
      event: 'server.schedule.deleted',
      description: `${request.user!.username} deleted schedule "${schedule.name}"`,
    });
    return { deleted: true };
  });
}

export async function adminBackupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/backups', async () =>
    prisma.backup.findMany({
      include: { server: { select: { name: true, uuid: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  );
}

async function requireServerAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  serverId: string,
  permission?: string,
) {
  const access = await getServerAccess(serverId, request.user!.id);
  if (!access) {
    reply.status(404).send({ error: 'Not found' });
    return null;
  }
  if (permission && !hasClientPermission(access.permissions, permission)) {
    reply.status(403).send({ error: 'You do not have permission to perform this action' });
    return null;
  }
  if (!access.isAdminSupport && access.server.suspended) {
    reply.status(403).send({ error: 'This server is suspended', code: 'server_suspended' });
    return null;
  }
  return access;
}
