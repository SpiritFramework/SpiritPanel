import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  buildServerAccessFlags,
  getOwnedServer,
  getServerForOwnerActions,
  getServerAccess,
  hasClientPermission,
  isPanelAdmin,
  logServerActivity,
  POWER_ACTION_PERMISSION,
  WINGS_CLIENT_PERMISSIONS,
  wingsPermissionsForUser,
} from '../lib/client-server.js';
import { requireAuth, requireSession } from '../middleware/auth.js';
import { signWingsJwt } from '../lib/auth.js';
import { getConfig } from '../lib/env.js';
import { buildWingsWebsocketUrl, describeConsoleAccess } from '../lib/wings-socket.js';
import { formatAllocationAddress, formatSftpUsername, resolveAllocationHost } from '@spirit/shared';
import { measureTcpPing } from '../lib/tcp-ping.js';
import { isMarketplaceEnabled } from '../lib/panel-settings.js';
import { isMailEnabled, sendSubuserAddedEmail } from '../lib/mailer.js';
import {
  API_KEY_TYPE_ACCOUNT,
  createApiKeyForUser,
  deleteApiKeyForUser,
  listApiKeysForUser,
} from '../lib/api-keys.js';
import { serverInclude } from '../services/server-helpers.js';
import { powerServer, reinstallServerOnWings, syncServerToWings, isServerInstalling } from '../services/server-lifecycle.js';
import {
  autoAssignAllocation,
  listServerAllocations,
  setPrimaryAllocation,
  unassignSecondaryAllocation,
} from '../services/allocations.js';
import { wingsForNode } from '../services/wings-client.js';
import { normalizeWingsLogLines } from '../lib/wings-logs.js';
import { getServerStats, recordStatSnapshotFromPayload } from '../services/server-stats.js';
import { paginateActivityLogs } from '../services/activity.js';
import { reconcilePanelFieldsForContainerState } from '../lib/container-state.js';
import { enrichServerRefsWithLiveState, resolveServerContainerState } from '../services/server-runtime-status.js';
import { stripServerNodeSecrets } from '../lib/node-health.js';
import { assertSafeFileName, assertSafeServerPath, UnsafeFilePathError } from '../lib/file-paths.js';

export async function clientRoutes(app: FastifyInstance) {
  app.register(async (accountApp) => {
    accountApp.addHook('preHandler', requireSession);

    accountApp.get('/account/api-keys', async (request) => listApiKeysForUser(request.user!.id));

    accountApp.post('/account/api-keys', async (request) => {
      const body = z.object({ memo: z.string().max(255).default('') }).parse(request.body ?? {});
      return createApiKeyForUser(request.user!.id, {
        memo: body.memo,
        keyType: API_KEY_TYPE_ACCOUNT,
      });
    });

    accountApp.delete('/account/api-keys/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await deleteApiKeyForUser(id, request.user!.id);
      if (!deleted) return reply.status(404).send({ error: 'API key not found' });
      return { deleted: true };
    });
  });

  app.addHook('preHandler', requireAuth);

  app.get('/servers', async (request) => {
    const userId = request.user!.id;
    const include = {
      egg: { select: { name: true, logoUrl: true } },
      node: { select: { name: true, fqdn: true } },
      defaultAllocation: true,
    };
    const owned = await prisma.server.findMany({
      where: { ownerId: userId },
      include,
    });
    const subuser = await prisma.server.findMany({
      where: { subusers: { some: { userId } } },
      include,
    });
    const all = [...owned, ...subuser.filter((s) => !owned.find((o) => o.id === s.id))];
    const enriched = await enrichServerRefsWithLiveState(
      all.map((server) => ({
        id: server.id,
        uuid: server.uuid,
        nodeId: server.nodeId,
        containerState: server.containerState,
      })),
      { refresh: true },
    );
    const stateById = new Map(enriched.map((row) => [row.id, row.containerState]));
    return all.map(({ memory, disk, cpu, uuid, containerState, status, installStatus, ...rest }) => {
      const liveState = stateById.get(rest.id) ?? containerState;
      const reconciled = reconcilePanelFieldsForContainerState(liveState ?? 'offline');
      return {
        ...rest,
        uuid,
        memory,
        disk,
        cpu,
        containerState: liveState,
        status: reconciled.status ?? status,
        installStatus: reconciled.installStatus ?? installStatus,
      };
    });
  });

  app.get('/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await getServerAccess(id, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const node = await prisma.node.findUniqueOrThrow({ where: { id: server.nodeId } });
    const containerState = await resolveServerContainerState(
      {
        id: server.id,
        uuid: server.uuid,
        containerState: server.containerState,
        node,
      },
      { refresh: true },
    );

    const reconciled = reconcilePanelFieldsForContainerState(containerState ?? server.containerState);
    const marketplaceEnabled = await isMarketplaceEnabled();

    return stripServerNodeSecrets({
      ...server,
      containerState,
      status: reconciled.status ?? server.status,
      installStatus: reconciled.installStatus ?? server.installStatus,
      marketplaceEnabled,
      variables: server.variables
        .filter((v) => v.eggVariable.userViewable)
        .map((v) => ({
          id: v.id,
          variableValue: v.variableValue,
          eggVariable: {
            name: v.eggVariable.name,
            envVariable: v.eggVariable.envVariable,
            description: v.eggVariable.description,
            userViewable: v.eggVariable.userViewable,
            userEditable: v.eggVariable.userEditable,
            fieldType: v.eggVariable.fieldType,
          },
        })),
      access: buildServerAccessFlags(
        access.isOwner,
        access.permissions,
        access.isAdminSupport,
      ),
    });
  });

  app.patch('/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1).max(191).optional(),
        description: z.string().max(500).optional(),
      })
      .parse(request.body);

    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(403).send({ error: 'Only the server owner can change settings' });

    const updated = await prisma.server.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
      include: {
        egg: { include: { variables: true } },
        node: true,
        defaultAllocation: true,
        variables: { include: { eggVariable: true } },
      },
    });

    const changes: string[] = [];
    if (body.name !== undefined && body.name !== server.name) changes.push(`name → "${body.name}"`);
    if (body.description !== undefined && body.description !== server.description) changes.push('description');

    if (changes.length) {
      await logServerActivity(request, {
        serverId: id,
        event: 'server.settings.updated',
        description: `Updated server settings (${changes.join(', ')})`,
        properties: body,
      });
    }

    return stripServerNodeSecrets(updated);
  });

  app.get('/servers/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const range = (request.query as { range?: string }).range ?? '24h';
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return getServerStats(server, range);
  });

  app.post('/servers/:id/stats/snapshot', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const body = z
      .object({
        cpu: z.number().optional(),
        memoryBytes: z.number().int().nonnegative().optional(),
        diskBytes: z.number().int().nonnegative().optional(),
        networkRxBytes: z.number().int().nonnegative().optional(),
        networkTxBytes: z.number().int().nonnegative().optional(),
        state: z.string().optional(),
      })
      .parse(request.body);

    await recordStatSnapshotFromPayload(server.id, body);
    return reply.status(204).send();
  });

  app.get('/servers/:id/activity', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const q = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(Number(q.limit ?? 15), 50);
    const showEmail = access.isOwner || access.isAdminSupport;

    return paginateActivityLogs({
      where: { serverId: id },
      take: limit,
      cursor: q.cursor ?? null,
      include: {
        actor: { select: { username: true, ...(showEmail ? { email: true } : {}) } },
      },
    });
  });

  app.post('/servers/:id/power', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = z.object({ action: z.enum(['start', 'stop', 'restart', 'kill']) }).parse(request.body);
    const permission = POWER_ACTION_PERMISSION[action];
    const access = await requireServerAccess(request, reply, id, permission);
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    if (action === 'start' && isServerInstalling(server)) {
      return reply.status(409).send({
        error: 'This server is still installing. Wait for installation to finish — it will start automatically if configured.',
        code: 'server_installing',
      });
    }

    try {
      await powerServer(server.uuid, action);
    } catch (err) {
      request.log.error({ err }, 'Server power failed');
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'Failed to send power action to Wings',
      });
    }
    await logServerActivity(request, {
      serverId: id,
      event: `server.power.${action}`,
      description: `${request.user!.username} sent power action: ${action}`,
    });
    return { success: true };
  });

  app.post('/servers/:id/reinstall', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ wipeFiles: z.boolean().default(false) }).parse(request.body ?? {});
    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    if (server.suspended) {
      return reply.status(403).send({ error: 'Cannot reinstall a suspended server.' });
    }

    try {
      await reinstallServerOnWings(server.uuid, { wipeFiles: body.wipeFiles });
      await logServerActivity(request, {
        serverId: id,
        event: 'server.reinstall',
        description: `${request.user!.username} triggered reinstall${body.wipeFiles ? ' (files wiped)' : ''}`,
        properties: { wipeFiles: body.wipeFiles },
      });
      return { success: true };
    } catch (err) {
      request.log.error({ err }, 'Server reinstall failed');
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'Failed to reinstall on FeatherWings',
      });
    }
  });

  app.get('/servers/:id/websocket', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'websocket.connect');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const token = signWingsJwt(
      {
        // jti lets the daemon de-duplicate/track individual console sessions.
        jti: crypto.randomUUID(),
        user_uuid: request.user!.uuid,
        server_uuid: server.uuid,
        permissions: wingsPermissionsForUser(
          access.isOwner || access.isAdminSupport,
          access.permissions,
          [...WINGS_CLIENT_PERMISSIONS],
        ),
      },
      '10m',
      server.node.daemonTokenSecret,
    );

    const socket = buildWingsWebsocketUrl(server.uuid, server.node);

    return { token, socket, connection_string: socket };
  });

  app.get('/servers/:id/ping', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const host = resolveAllocationHost(
      {
        ip: server.defaultAllocation.ip,
        port: server.defaultAllocation.port,
        alias: server.defaultAllocation.alias,
      },
      { fqdn: server.node.fqdn },
    );
    const ping = await measureTcpPing(host, server.defaultAllocation.port);
    return { ping, reachable: ping != null };
  });

  app.get('/servers/:id/connection', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const node = server.node;
    const primary = server.defaultAllocation;
    const address = formatAllocationAddress(
      { ip: primary.ip, port: primary.port, alias: primary.alias },
      { fqdn: node.fqdn },
    );
    const cfg = getConfig();
    const panelUrl = cfg.panelUrl || cfg.apiUrl;

    return {
      game: {
        address,
        hostname: address.split(':')[0] ?? node.fqdn,
        port: primary.port,
      },
      sftp: {
        host: node.fqdn,
        port: node.daemonSftp,
        username: formatSftpUsername(request.user!.username, server.uuidShort),
        uri: `sftp://${formatSftpUsername(request.user!.username, server.uuidShort)}@${node.fqdn}:${node.daemonSftp}`,
      },
      node: {
        name: node.name,
        fqdn: node.fqdn,
        scheme: node.scheme,
        behindProxy: node.behindProxy,
      },
      panel: {
        url: panelUrl,
      },
      console: {
        hint: describeConsoleAccess(node, panelUrl.startsWith('https://')),
      },
    };
  });

  app.get('/servers/:id/network/allocations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return listServerAllocations(server);
  });

  app.post('/servers/:id/network/allocations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.create');
    if (!access) return;
    try {
      const server = await autoAssignAllocation(id);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.allocation.created',
        description: `${request.user!.username} auto-assigned a new allocation`,
      });
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/servers/:id/network/allocations/:allocationId/primary', async (request, reply) => {
    const { id, allocationId } = request.params as { id: string; allocationId: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.update');
    if (!access) return;
    try {
      const server = await setPrimaryAllocation(id, allocationId);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.allocation.primary',
        description: `${request.user!.username} changed the primary allocation`,
      });
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete('/servers/:id/network/allocations/:allocationId', async (request, reply) => {
    const { id, allocationId } = request.params as { id: string; allocationId: string };
    const access = await requireServerAccess(request, reply, id, 'allocation.delete');
    if (!access) return;
    try {
      const server = await unassignSecondaryAllocation(id, allocationId);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.allocation.deleted',
        description: `${request.user!.username} removed an allocation`,
      });
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get('/servers/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rawDir = (request.query as { directory?: string }).directory ?? '/';
    const directory = safePathOrReply(reply, rawDir, 'directory');
    if (directory === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return wingsForNode(server.node).listFiles(server.uuid, directory);
  });

  app.get('/servers/:id/files/contents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rawFile = (request.query as { file: string }).file;
    if (!rawFile) return reply.status(400).send({ error: 'Missing file parameter' });
    const file = safePathOrReply(reply, rawFile, 'file');
    if (file === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      const content = await wingsForNode(server.node).getFileContents(server.uuid, file);
      return reply.type('text/plain; charset=utf-8').send(content);
    } catch (err) {
      request.log.error({ err, file }, 'Failed to read file from FeatherWings');
      const message = err instanceof Error ? err.message : 'Failed to read file';
      if (message.includes('(404)')) return reply.status(404).send({ error: 'File not found' });
      if (message.includes('(403)')) return reply.status(403).send({ error: 'Access denied' });
      if (message.includes('(400)')) return reply.status(400).send({ error: 'Cannot read this file' });
      return reply.status(502).send({ error: message });
    }
  });

  app.post('/servers/:id/files/write', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ file: z.string(), content: z.string() }).parse(request.body);
    const file = safePathOrReply(reply, body.file, 'file');
    if (file === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.update');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      await wingsForNode(server.node).writeFile(server.uuid, file, body.content);
    } catch (err) {
      request.log.error({ err, file }, 'Failed to write file to FeatherWings');
      const message = err instanceof Error ? err.message : 'Failed to write file';
      if (message.includes('(404)')) return reply.status(404).send({ error: 'File not found' });
      if (message.includes('(403)')) return reply.status(403).send({ error: 'Access denied' });
      if (message.includes('(400)')) return reply.status(400).send({ error: 'Cannot write this file' });
      return reply.status(502).send({ error: message });
    }
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.write',
      description: `${request.user!.username} edited ${file}`,
      properties: { file },
    });
    return { success: true };
  });

  app.post('/servers/:id/files/delete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ root: z.string(), files: z.array(z.string()).min(1) }).parse(request.body);
    const paths = safeRootAndNamesOrReply(reply, body.root, body.files, 'file');
    if (!paths) return;
    const access = await requireServerAccess(request, reply, id, 'file.delete');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).deleteFiles(server.uuid, paths.root, paths.names);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.delete',
      description: `${request.user!.username} deleted ${paths.names.length} file(s)`,
      properties: { root: paths.root, files: paths.names },
    });
    return { success: true };
  });

  app.post('/servers/:id/files/create-directory', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ root: z.string(), name: z.string().min(1) }).parse(request.body);
    const root = safePathOrReply(reply, body.root, 'root');
    if (root === null) return;
    const name = safeNameOrReply(reply, body.name, 'directory name');
    if (name === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.create');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).createDirectory(server.uuid, root, name);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.mkdir',
      description: `${request.user!.username} created folder ${name}`,
      properties: { root, name },
    });
    return { success: true };
  });

  app.put('/servers/:id/files/rename', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        root: z.string(),
        files: z.array(z.object({ from: z.string(), to: z.string() })).min(1),
      })
      .parse(request.body);
    const root = safePathOrReply(reply, body.root, 'root');
    if (root === null) return;
    const files: { from: string; to: string }[] = [];
    for (const entry of body.files) {
      const from = safeNameOrReply(reply, entry.from, 'source name');
      if (from === null) return;
      const to = safeNameOrReply(reply, entry.to, 'destination name');
      if (to === null) return;
      files.push({ from, to });
    }
    const access = await requireServerAccess(request, reply, id, 'file.update');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).renameFiles(server.uuid, root, files);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.rename',
      description: `${request.user!.username} renamed ${files.length} item(s)`,
      properties: { root, files },
    });
    return { success: true };
  });

  app.post('/servers/:id/files/copy', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ location: z.string().min(1) }).parse(request.body);
    const location = safePathOrReply(reply, body.location, 'location');
    if (location === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.create');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).copyFile(server.uuid, location);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.copy',
      description: `${request.user!.username} copied ${location}`,
      properties: { location },
    });
    return { success: true };
  });

  app.post('/servers/:id/files/compress', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ root: z.string(), files: z.array(z.string()).min(1) }).parse(request.body);
    const paths = safeRootAndNamesOrReply(reply, body.root, body.files, 'file');
    if (!paths) return;
    const access = await requireServerAccess(request, reply, id, 'file.archive');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      const created = await wingsForNode(server.node).compressFiles(server.uuid, paths.root, paths.names);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.file.compress',
        description: `${request.user!.username} archived ${paths.names.length} item(s)`,
        properties: { root: paths.root, files: paths.names },
      });
      return { success: true, file: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compress';
      return reply.status(502).send({ error: message });
    }
  });

  app.post('/servers/:id/files/decompress', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ root: z.string(), file: z.string().min(1) }).parse(request.body);
    const root = safePathOrReply(reply, body.root, 'root');
    if (root === null) return;
    const file = safeNameOrReply(reply, body.file, 'file');
    if (file === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.archive');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      await wingsForNode(server.node).decompressFile(server.uuid, root, file);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.file.decompress',
        description: `${request.user!.username} extracted ${file}`,
        properties: { root, file },
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract';
      return reply.status(502).send({ error: message });
    }
  });

  app.post('/servers/:id/files/chmod', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        root: z.string(),
        files: z.array(z.object({ file: z.string(), mode: z.string() })).min(1),
      })
      .parse(request.body);
    const root = safePathOrReply(reply, body.root, 'root');
    if (root === null) return;
    const files: { file: string; mode: string }[] = [];
    for (const entry of body.files) {
      const file = safeNameOrReply(reply, entry.file, 'file');
      if (file === null) return;
      files.push({ file, mode: entry.mode });
    }
    const access = await requireServerAccess(request, reply, id, 'file.update');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).chmodFiles(server.uuid, root, files);
    return { success: true };
  });

  app.get('/servers/:id/files/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rawFile = (request.query as { file?: string }).file;
    if (!rawFile) return reply.status(400).send({ error: 'Missing file parameter' });
    const file = safePathOrReply(reply, rawFile, 'file');
    if (file === null) return;
    const access = await requireServerAccess(request, reply, id, 'file.read');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      const res = await wingsForNode(server.node).downloadFile(server.uuid, file);
      const filename = file.split('/').pop() || 'download';
      reply.header('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      reply.type(res.headers.get('content-type') || 'application/octet-stream');
      const len = res.headers.get('content-length');
      if (len) reply.header('Content-Length', len);
      const arrayBuffer = await res.arrayBuffer();
      await logServerActivity(request, {
        serverId: id,
        event: 'server.file.download',
        description: `${request.user!.username} downloaded ${file}`,
        properties: { file },
      });
      return reply.send(Buffer.from(arrayBuffer));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download';
      if (message.includes('(404)')) return reply.status(404).send({ error: 'File not found' });
      return reply.status(502).send({ error: message });
    }
  });

  app.post('/servers/:id/files/upload', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'file.create');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const rawDirectory = (request.query as { directory?: string }).directory ?? '/';
    const directory = safePathOrReply(reply, rawDirectory, 'directory');
    if (directory === null) return;
    let uploaded = 0;
    try {
      const parts = (request as unknown as { parts: () => AsyncIterable<MultipartPart> }).parts();
      const wings = wingsForNode(server.node);
      for await (const part of parts) {
        if (part.type !== 'file') continue;
        const buffer = await part.toBuffer();
        const target = joinFilePath(directory, part.filename);
        await wings.uploadFile(server.uuid, target, buffer);
        uploaded += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return reply.status(502).send({ error: message });
    }
    if (uploaded === 0) return reply.status(400).send({ error: 'No files uploaded' });
    await logServerActivity(request, {
      serverId: id,
      event: 'server.file.upload',
      description: `${request.user!.username} uploaded ${uploaded} file(s) to ${directory}`,
      properties: { directory, count: uploaded },
    });
    return { success: true, uploaded };
  });

  app.post('/servers/:id/command', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { command } = z.object({ command: z.string() }).parse(request.body);
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await wingsForNode(server.node).sendCommand(server.uuid, command);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.command',
      description: `${request.user!.username} ran command: ${command}`,
      properties: { command },
    });
    return { success: true };
  });

  app.get('/servers/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const size = Number((request.query as { size?: string }).size ?? 100);
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const raw = await wingsForNode(server.node).getLogs(server.uuid, size);
    return { response: normalizeWingsLogLines(raw) };
  });

  app.get('/servers/:id/install-logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await requireServerAccess(request, reply, id, 'control.console');
    if (!access) return;
    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    try {
      const raw = await wingsForNode(server.node).getInstallLogs(server.uuid);
      return { response: normalizeWingsLogLines(raw) };
    } catch (e) {
      return reply.status(502).send({
        error: e instanceof Error ? e.message : 'Failed to retrieve installation logs',
      });
    }
  });

  // Subusers
  app.get('/servers/:id/subusers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return prisma.subuser.findMany({
      where: { serverId: id },
      include: { user: { select: { id: true, email: true, username: true, avatarUrl: true } } },
    });
  });

  app.post('/servers/:id/subusers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ email: z.string().email(), permissions: z.array(z.string()) })
      .parse(request.body);
    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    const subuser = await prisma.subuser.create({
      data: { serverId: id, userId: user.id, permissions: body.permissions },
    });
    await logServerActivity(request, {
      serverId: id,
      event: 'server.subuser.added',
      description: `${request.user!.username} added subuser ${user.username}`,
      properties: { email: body.email, permissions: body.permissions },
    });

    if (await isMailEnabled()) {
      try {
        await sendSubuserAddedEmail(
          user.email,
          user.username,
          server.name,
          server.id,
          request.user!.username,
        );
      } catch (err) {
        request.log.error({ err }, 'Failed to send subuser added email');
      }
    }

    return subuser;
  });

  app.patch('/servers/:id/subusers/:subuserId', async (request, reply) => {
    const { id, subuserId } = request.params as { id: string; subuserId: string };
    const body = z.object({ permissions: z.array(z.string()) }).parse(request.body);
    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const existing = await prisma.subuser.findFirst({ where: { id: subuserId, serverId: id } });
    if (!existing) return reply.status(404).send({ error: 'Subuser not found' });
    const subuser = await prisma.subuser.update({
      where: { id: subuserId },
      data: { permissions: body.permissions },
      include: { user: { select: { id: true, email: true, username: true, avatarUrl: true } } },
    });
    await logServerActivity(request, {
      serverId: id,
      event: 'server.subuser.updated',
      description: `${request.user!.username} updated permissions for ${subuser.user.username}`,
      properties: { permissions: body.permissions },
    });
    return subuser;
  });

  app.delete('/servers/:id/subusers/:subuserId', async (request, reply) => {
    const { id, subuserId } = request.params as { id: string; subuserId: string };
    const server = await getServerForOwnerActions(id, request.user!.id);
    if (!server) return reply.status(404).send({ error: 'Not found' });
    const removed = await prisma.subuser.findFirst({
      where: { id: subuserId, serverId: id },
      include: { user: { select: { username: true } } },
    });
    if (!removed) return reply.status(404).send({ error: 'Subuser not found' });
    await prisma.subuser.delete({ where: { id: subuserId } });
    await logServerActivity(request, {
      serverId: id,
      event: 'server.subuser.removed',
      description: `${request.user!.username} removed subuser ${removed.user.username}`,
    });
    return { deleted: true };
  });

  // Variables
  app.patch('/servers/:id/variables', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ variables: z.array(z.object({ id: z.string(), value: z.string() })) }).parse(request.body);
    const access = await getServerAccess(id, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    if (!hasClientPermission(access.permissions, 'startup.update')) {
      return reply.status(403).send({ error: 'You do not have permission to update startup variables' });
    }

    const serverVars = await prisma.serverVariable.findMany({
      where: { serverId: id },
      include: { eggVariable: true },
    });
    const byId = new Map(serverVars.map((v) => [v.id, v]));

    for (const update of body.variables) {
      const sv = byId.get(update.id);
      if (!sv) {
        return reply.status(400).send({ error: 'Invalid variable' });
      }
      if (!sv.eggVariable.userViewable) {
        return reply.status(403).send({ error: `Variable "${sv.eggVariable.name}" is not accessible` });
      }
      if (!sv.eggVariable.userEditable) {
        return reply.status(403).send({ error: `Variable "${sv.eggVariable.name}" is read-only` });
      }
      await prisma.serverVariable.update({
        where: { id: update.id },
        data: { variableValue: update.value },
      });
    }

    await syncServerToWings(access.server.uuid);
    await logServerActivity(request, {
      serverId: id,
      event: 'server.variables.updated',
      description: `${request.user!.username} updated startup variables`,
      properties: { count: body.variables.length },
    });
    return { success: true };
  });

  app.patch('/servers/:id/startup', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        startup: z.string().min(1).max(8192).optional(),
        image: z.string().min(1).max(500).optional(),
        variables: z.array(z.object({ id: z.string(), value: z.string() })).optional(),
      })
      .refine(
        (data) =>
          data.startup !== undefined ||
          data.image !== undefined ||
          (data.variables?.length ?? 0) > 0,
        { message: 'Nothing to update' },
      )
      .parse(request.body);

    const access = await getServerAccess(id, request.user!.id);
    if (!access) return reply.status(404).send({ error: 'Not found' });
    if (!hasClientPermission(access.permissions, 'startup.update')) {
      return reply.status(403).send({ error: 'You do not have permission to update startup settings' });
    }

    const server = await getAccessibleServer(id, request.user!.id, true);
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const updateData: { startup?: string; image?: string } = {};
    if (body.startup !== undefined) updateData.startup = body.startup;
    if (body.image !== undefined) {
      const dockerImages = server.egg.dockerImages as Record<string, string>;
      const allowed = new Set(Object.values(dockerImages));
      if (!allowed.has(body.image)) {
        return reply.status(400).send({ error: 'Selected docker image is not available for this egg' });
      }
      updateData.image = body.image;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.server.update({ where: { id }, data: updateData });
    }

    if (body.variables?.length) {
      const serverVars = await prisma.serverVariable.findMany({
        where: { serverId: id },
        include: { eggVariable: true },
      });
      const byId = new Map(serverVars.map((v) => [v.id, v]));

      for (const update of body.variables) {
        const sv = byId.get(update.id);
        if (!sv) return reply.status(400).send({ error: 'Invalid variable' });
        if (!sv.eggVariable.userViewable) {
          return reply.status(403).send({ error: `Variable "${sv.eggVariable.name}" is not accessible` });
        }
        if (!sv.eggVariable.userEditable) {
          return reply.status(403).send({ error: `Variable "${sv.eggVariable.name}" is read-only` });
        }
        await prisma.serverVariable.update({
          where: { id: update.id },
          data: { variableValue: update.value },
        });
      }
    }

    await syncServerToWings(server.uuid);

    const changes: string[] = [];
    if (body.startup !== undefined && body.startup !== server.startup) changes.push('startup command');
    if (body.image !== undefined && body.image !== server.image) changes.push('docker image');
    if (body.variables?.length) changes.push(`${body.variables.length} variable(s)`);

    await logServerActivity(request, {
      serverId: id,
      event: 'server.startup.updated',
      description: `${request.user!.username} updated startup configuration${changes.length ? ` (${changes.join(', ')})` : ''}`,
      properties: {
        startupChanged: body.startup !== undefined && body.startup !== server.startup,
        imageChanged: body.image !== undefined && body.image !== server.image,
        variableCount: body.variables?.length ?? 0,
      },
    });

    return { success: true };
  });
}

interface MultipartPart {
  type: 'file' | 'field';
  filename: string;
  toBuffer: () => Promise<Buffer>;
}

/** Join a Wings directory and a (possibly nested) filename into a normalized path. */
function joinFilePath(directory: string, filename: string): string {
  const safeName = filename.replace(/^\/+/, '');
  const base = directory.endsWith('/') ? directory : `${directory}/`;
  return assertSafeServerPath(`${base}${safeName}`.replace(/\/{2,}/g, '/'), 'file path');
}

function safePathOrReply(reply: FastifyReply, path: string, label: string): string | null {
  try {
    return assertSafeServerPath(path, label);
  } catch (err) {
    if (err instanceof UnsafeFilePathError) {
      reply.status(400).send({ error: err.message });
      return null;
    }
    throw err;
  }
}

function safeNameOrReply(reply: FastifyReply, name: string, label: string): string | null {
  try {
    return assertSafeFileName(name, label);
  } catch (err) {
    if (err instanceof UnsafeFilePathError) {
      reply.status(400).send({ error: err.message });
      return null;
    }
    throw err;
  }
}

function safeRootAndNamesOrReply(
  reply: FastifyReply,
  root: string,
  names: string[],
  label: string,
): { root: string; names: string[] } | null {
  const safeRoot = safePathOrReply(reply, root, 'root');
  if (safeRoot === null) return null;
  const safeNames: string[] = [];
  for (const name of names) {
    const safeName = safeNameOrReply(reply, name, label);
    if (safeName === null) return null;
    safeNames.push(safeName);
  }
  return { root: safeRoot, names: safeNames };
}

async function getAccessibleServer(id: string, userId: string, full = false) {
  const include = full
    ? serverInclude
    : {
        egg: { include: { variables: true } },
        node: true,
        defaultAllocation: true,
        extraAllocations: true,
        variables: { include: { eggVariable: true } },
      };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, rootAdmin: true },
  });
  if (user && isPanelAdmin(user)) {
    return prisma.server.findUnique({ where: { id }, include });
  }

  return prisma.server.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { subusers: { some: { userId } } }],
    },
    include,
  });
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
  return access;
}
