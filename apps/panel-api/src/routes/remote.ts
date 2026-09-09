import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireDaemon } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/auth.js';
import { parseSftpUsername } from '@spirit/shared';
import { hasClientPermission, WINGS_CLIENT_PERMISSIONS } from '../lib/client-server.js';
import {
  buildServerConfiguration,
  buildInstallScript,
  buildServerListItem,
} from '../services/server-configuration.js';
import { getNodeServers, getServerFull } from '../services/server-helpers.js';
import { logActivityBatch } from '../services/activity.js';
import {
  applyContainerStatusUpdate,
  deleteContainerStatus,
  resolveContainerStateFromWebhook,
} from '../lib/container-state.js';
import { resyncNodeContainerStates } from '../services/node-resync.js';
import {
  isMailEnabled,
  sendServerDeployedEmail,
  sendServerInstallFailedEmail,
} from '../lib/mailer.js';
import { diskFromChecksumType } from '../lib/backup-adapter.js';
import { logWingsFailure } from '../lib/wings-sync.js';
import { handleTransferFailure, handleTransferSuccess } from '../services/server-transfer.js';

export async function remoteRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireDaemon);

  app.post('/sftp/auth', async (request, reply) => {
    const body = request.body as {
      type?: string;
      username: string;
      password: string;
      ip?: string;
    };

    const parsed = parseSftpUsername(body.username);
    if (!parsed) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findFirst({
      where: { username: parsed.user, enabled: true },
    });
    if (!user) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    if (body.type === 'public_key') {
      // Wings sends the marshaled authorized key in the password field for key auth.
      const candidate = normalizeAuthorizedKey(body.password);
      if (!candidate) {
        return reply.status(200).send({ error: 'Invalid credentials' });
      }
      const keys = await prisma.userSshKey.findMany({ where: { userId: user.id } });
      const match = keys.some((k) => normalizeAuthorizedKey(k.publicKey) === candidate);
      if (!match) {
        return reply.status(200).send({ error: 'Invalid credentials' });
      }
    } else {
      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) {
        return reply.status(200).send({ error: 'Invalid credentials' });
      }
    }

    const server = await prisma.server.findFirst({
      where: {
        uuidShort: parsed.serverShortId,
        nodeId: request.node!.id,
        OR: [{ ownerId: user.id }, { subusers: { some: { userId: user.id } } }],
      },
      include: { subusers: { where: { userId: user.id }, select: { permissions: true } } },
    });

    if (!server) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    if (server.suspended) {
      return reply.status(200).send({ error: 'Invalid credentials' });
    }

    const isOwner = server.ownerId === user.id;
    let permissions: string[];

    if (isOwner) {
      permissions = ['*'];
    } else {
      const subuserPerms = (server.subusers[0]?.permissions as string[] | undefined) ?? [];
      if (!hasClientPermission(subuserPerms, 'file.sftp')) {
        return reply.status(200).send({ error: 'Invalid credentials' });
      }
      permissions = subuserPerms.includes('*')
        ? ['*']
        : WINGS_CLIENT_PERMISSIONS.filter((p) => hasClientPermission(subuserPerms, p));
    }

    return {
      user: user.uuid,
      server: server.uuid,
      permissions,
    };
  });

  app.get('/servers', async (request) => {
    const servers = await getNodeServers(prisma, request.node!.id);
    return {
      data: servers.map(buildServerListItem),
      meta: {
        pagination: {
          total: servers.length,
          count: servers.length,
          per_page: 50,
          current_page: 1,
          total_pages: 1,
        },
      },
    };
  });

  app.post('/servers/reset', async (request) => {
    // Wings boot contract (ResetServersState): daemon restart — mark containers offline and
    // let Wings re-push runtime state via OnStateChange. Do NOT force mid-install /
    // mid-restore servers to installed/normal; that falsely marks unfinished installs ready.
    // Install/restore completion still comes from explicit Wings webhooks.
    const nodeId = request.node!.id;
    const nodeServers = await prisma.server.findMany({
      where: { nodeId },
      select: { uuid: true },
    });

    // Mid-install / mid-restore: only clear live container cache state; keep panel install flags.
    await prisma.server.updateMany({
      where: {
        nodeId,
        OR: [
          { status: 'installing' },
          { status: 'restoring_backup' },
          { installStatus: 'installing' },
        ],
      },
      data: {
        containerState: 'offline',
      },
    });

    await prisma.server.updateMany({
      where: {
        nodeId,
        status: { notIn: ['installing', 'restoring_backup'] },
        installStatus: { not: 'installing' },
      },
      data: {
        status: 'normal',
        containerState: 'offline',
      },
    });

    await Promise.all(nodeServers.map((s) => deleteContainerStatus(s.uuid)));

    try {
      await Promise.race([
        resyncNodeContainerStates(nodeId),
        new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
      ]);
    } catch (err) {
      request.log.warn({ err, nodeId }, 'Post-reset container resync failed');
    }

    return { success: true, message: 'All server statuses reset successfully' };
  });

  app.get('/servers/:uuid', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await getServerFull(prisma, uuid);
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    return buildServerConfiguration(server);
  });

  app.get('/servers/:uuid/install', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await getServerFull(prisma, uuid);
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    return buildInstallScript(server);
  });

  app.post('/servers/:uuid/install', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const parsed = z
      .object({
        successful: z.boolean(),
        reinstall: z.boolean().optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Body must include boolean "successful"' });
    }
    const body = parsed.data;
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    await deleteContainerStatus(server.uuid);
    await prisma.server.update({
      where: { id: server.id },
      data: {
        installStatus: body.successful ? 'installed' : 'failed',
        status: body.successful ? 'normal' : 'install_failed',
        containerState: body.successful ? 'offline' : 'install_failed',
        installedAt: body.successful ? new Date() : null,
      },
    });

    if (!body.successful) {
      try {
        const { evaluateServerLifecycleTransition } = await import('../services/alerts.js');
        await evaluateServerLifecycleTransition(server, server.containerState, 'install_failed');
      } catch {
        /* alerts must not block install webhook */
      }
    }

    if (await isMailEnabled()) {
      try {
        const full = await prisma.server.findUnique({
          where: { id: server.id },
          include: {
            owner: { select: { email: true, username: true } },
            node: { select: { name: true } },
            egg: { select: { name: true } },
            defaultAllocation: { select: { ip: true, port: true } },
          },
        });
        if (full) {
          const ctx = {
            id: full.id,
            name: full.name,
            owner: full.owner,
            node: full.node,
            egg: full.egg,
            defaultAllocation: full.defaultAllocation,
          };
          if (body.successful) {
            await sendServerDeployedEmail(ctx);
          } else {
            await sendServerInstallFailedEmail(ctx);
          }
        }
      } catch (err) {
        request.log.error({ err }, 'Failed to send server install email');
      }
    }

    return reply.status(204).send();
  });

  app.get('/servers/:uuid/container/status', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    // Return DB state only — never the force-offline UI cache. Wings uses this for crash detection.
    return {
      state: server.containerState ?? 'offline',
      server_uuid: server.uuid,
      node_id: request.node!.id,
    };
  });

  app.post('/servers/:uuid/container/status', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const state = resolveContainerStateFromWebhook(request.body);
    if (!state) {
      return reply.status(400).send({ error: 'Missing or invalid state field' });
    }

    await applyContainerStatusUpdate(prisma, server, state);

    return {
      message: 'Server status updated successfully',
      state,
      server_uuid: server.uuid,
    };
  });

  app.post('/servers/:uuid/archive', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    return reply.status(204).send();
  });

  app.post('/servers/:uuid/import', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    return reply.status(204).send();
  });

  app.post('/activity', async (request) => {
    const body = request.body as { data?: unknown[] } | unknown[];
    const entries = Array.isArray(body) ? body : (body.data ?? []);
    await logActivityBatch(entries as Parameters<typeof logActivityBatch>[0], {
      nodeId: request.node!.id,
      maxEntries: 100,
    });
    return { success: true };
  });

  app.get('/backups/:uuid', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const backup = await prisma.backup.findUnique({
      where: { uuid },
      include: { server: { select: { nodeId: true } } },
    });
    if (!backup || backup.server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Not found' });
    }
    // Local Wings backups only — remote/S3 multipart upload is not implemented yet.
    return {
      parts: [],
      part_size: 0,
    };
  });

  app.post('/backups/:uuid', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const parsed = z
      .object({
        checksum: z.string().optional(),
        checksum_type: z.string().optional(),
        size: z.number().optional(),
        successful: z.boolean(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Body must include boolean "successful"' });
    }
    const body = parsed.data;
    const backup = await prisma.backup.findUnique({
      where: { uuid },
      include: { server: { select: { nodeId: true } } },
    });
    if (!backup || backup.server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await prisma.backup.update({
      where: { uuid },
      data: {
        isSuccessful: body.successful,
        bytes: BigInt(body.size ?? 0),
        checksum: body.checksum ?? null,
        disk: diskFromChecksumType(body.checksum_type),
        completedAt: new Date(),
      },
    });
    return reply.status(204).send();
  });

  app.post('/backups/:uuid/restore', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const backup = await prisma.backup.findUnique({
      where: { uuid },
      include: { server: { select: { nodeId: true } } },
    });
    if (!backup || backup.server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await prisma.server
      .updateMany({ where: { id: backup.serverId, status: 'restoring_backup' }, data: { status: 'normal' } })
      .catch((err) => logWingsFailure('backup restore status reset failed', err, { backupUuid: uuid }));
    return reply.status(204).send();
  });

  app.post('/servers/:uuid/transfer/success', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    await handleTransferSuccess(prisma, server, request.node!.id);
    return reply.status(204).send();
  });

  app.post('/servers/:uuid/transfer/failure', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    const server = await prisma.server.findUnique({ where: { uuid } });
    if (!server || server.nodeId !== request.node!.id) {
      return reply.status(404).send({ error: 'Server not found' });
    }
    await handleTransferFailure(prisma, server, request.node!.id);
    return reply.status(204).send();
  });
}

/** Reduce an authorized key to "type body" so comments/whitespace don't affect comparison. */
function normalizeAuthorizedKey(input: string | undefined | null): string | null {
  if (!input) return null;
  const parts = input.trim().split(/\s+/);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return `${parts[0]} ${parts[1]}`;
}
