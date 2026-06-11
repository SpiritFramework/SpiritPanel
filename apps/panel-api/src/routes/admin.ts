import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { ServerStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { reconcilePanelFieldsForContainerState } from '../lib/container-state.js';
import { requireAdmin } from '../middleware/auth.js';
import { hashPassword } from '../lib/auth.js';
import {
  API_KEY_TYPE_ACCOUNT,
  API_KEY_TYPE_APPLICATION,
  createApiKeyForUser,
  deleteApiKeyById,
  deleteApiKeyForUser,
  listApiKeysForUser,
} from '../lib/api-keys.js';
import { applicationScopeZod } from '../lib/application-scopes.js';
import { generateDaemonToken, isValidBindIp, parseAllocationPorts } from '@spirit/shared';
import { parseEggJson } from '@spirit/shared';
import { buildWingsConfig, serverInclude } from '../services/server-helpers.js';
import { wingsForNode } from '../services/wings-client.js';
import { probeNodeHealth, sanitizeAdminNode } from '../lib/node-health.js';
import { computeNodeCapacity, loadNodeAllocationTotals } from '../lib/node-capacity.js';
import { WINGS_CLIENT_PERMISSIONS } from '../lib/client-server.js';
import { signWingsJwt } from '../lib/auth.js';
import { describeConsoleAccess, buildWingsWebsocketUrl } from '../lib/wings-socket.js';
import { normalizeWingsLogLines } from '../lib/wings-logs.js';
import { getConfig } from '../lib/env.js';
import { logAdminActivity, PANEL_ACTIVITY_PREFIXES } from '../lib/admin-activity.js';
import { paginateActivityLogs } from '../services/activity.js';
import { getNodeStats } from '../services/node-stats.js';
import {
  createServerOnPanel,
  assertNodeHasCapacityForUpdate,
  deleteServerFromPanel,
  powerServer,
  reinstallServerOnWings,
  isServerInstalling,
  syncServerToWings,
} from '../services/server-lifecycle.js';
import {
  enrichServerRefsWithLiveState,
  refreshAllServerContainerStates,
  resolveCachedContainerState,
  resolveServerContainerState,
} from '../services/server-runtime-status.js';
import {
  assignSecondaryAllocation,
  autoAssignAllocation,
  bulkDeleteNodeAllocations,
  listServerAllocations,
  normalizeAllocationIp,
  setPrimaryAllocation,
  unassignSecondaryAllocation,
} from '../services/allocations.js';
import {
  BRANDING_ASSET_PREFIX,
  deleteBrandingAsset,
  saveBrandingAsset,
} from '../lib/branding-assets.js';
import {
  brandingSchema,
  generalSchema,
  getBrandingSettings,
  isValidBrandingAssetUrl,
  getMarketplaceSettings,
  getMinPasswordLength,
  getSmtpSettings,
  getTurnstileSettings,
  announcementSchema,
  getAnnouncementSettings,
  maintenanceSchema,
  marketplaceSchema,
  registrationSchema,
  securitySchema,
  smtpSchema,
  EMAIL_TEMPLATE_IDS,
  emailTemplatesSettingsSchema,
  turnstileSchema,
  upsertPanelSetting,
} from '../lib/panel-settings.js';
import { previewEmailTemplate, emailTemplateSchema } from '../lib/email-templates.js';
import {
  isMailEnabled,
  sendAccountRestoredEmail,
  sendAccountSuspendedEmail,
  sendPasswordChangedEmail,
  sendServerCreatedEmail,
  sendServerSuspendedEmail,
  sendServerUnsuspendedEmail,
  sendTestEmail,
  verifySmtp,
} from '../lib/mailer.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/dashboard', async () => {
    const [
      users,
      servers,
      suspended,
      installing,
      nodes,
      allocationsTotal,
      allocationsUsed,
      nests,
      recentActivity,
      recentServers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.server.count({ where: { suspended: true } }),
      prisma.server.count({ where: { status: 'installing' } }),
      prisma.node.findMany({
        include: {
          location: { select: { short: true, long: true } },
          _count: { select: { servers: true, allocations: true } },
        },
      }),
      prisma.allocation.count(),
      prisma.allocation.count({ where: { assigned: true } }),
      prisma.nest.count(),
      prisma.activityLog.findMany({
        where: panelActivityFilter(),
        orderBy: { timestamp: 'desc' },
        take: 12,
        include: {
          actor: { select: { username: true, role: true } },
          server: { select: { id: true, name: true } },
        },
      }),
      prisma.server.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          uuid: true,
          name: true,
          status: true,
          suspended: true,
          installStatus: true,
          containerState: true,
          nodeId: true,
          createdAt: true,
          owner: { select: { username: true } },
          node: { select: { name: true, fqdn: true } },
          egg: { select: { name: true, logoUrl: true } },
          defaultAllocation: { select: { ip: true, port: true, alias: true } },
        },
      }),
    ]);

    const allocationTotals = await loadNodeAllocationTotals(prisma);

    const nodeHealth = await Promise.all(
      nodes.map(async (node) => {
        const allocated = allocationTotals.get(node.id) ?? { memory: 0, disk: 0 };
        const capacity = computeNodeCapacity(node, allocated);
        try {
          const sys = await wingsForNode(node).getSystem();
          return {
            id: node.id,
            name: node.name,
            fqdn: node.fqdn,
            location: node.location.short,
            online: true,
            version: sys.version,
            maintenanceMode: node.maintenanceMode,
            memory: node.memory,
            disk: node.disk,
            serverCount: node._count.servers,
            allocationCount: node._count.allocations,
            capacity,
          };
        } catch {
          return {
            id: node.id,
            name: node.name,
            fqdn: node.fqdn,
            location: node.location.short,
            online: false,
            version: null,
            maintenanceMode: node.maintenanceMode,
            memory: node.memory,
            disk: node.disk,
            serverCount: node._count.servers,
            allocationCount: node._count.allocations,
            capacity,
          };
        }
      }),
    );

    const nodesOnline = nodeHealth.filter((n) => n.online).length;
    const recentServersLive = await enrichServerRefsWithLiveState(recentServers);

    return {
      stats: {
        users,
        servers,
        suspended,
        installing,
        nodes: nodes.length,
        nodesOnline,
        nests,
        allocationsTotal,
        allocationsUsed,
      },
      nodeHealth,
      recentActivity,
      recentServers: recentServersLive,
    };
  });

  // Users
  app.get('/users', async (request) => {
    const q = request.query as { search?: string; role?: string; suspended?: string };
    const users = await prisma.user.findMany({
      where: {
        ...(q.role === 'admin' || q.role === 'user' ? { role: q.role } : {}),
        ...(q.suspended === 'true' ? { enabled: false } : q.suspended === 'false' ? { enabled: true } : {}),
        ...(q.search
          ? {
              OR: [
                { email: { contains: q.search } },
                { username: { contains: q.search } },
                { firstName: { contains: q.search } },
                { lastName: { contains: q.search } },
                { uuid: { contains: q.search } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { servers: true, subusers: true, apiKeys: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      ...sanitizeUser(u),
      serverCount: u._count.servers,
      subuserCount: u._count.subusers,
      apiKeyCount: u._count.apiKeys,
    }));
  });

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        servers: {
          orderBy: { createdAt: 'desc' },
          include: {
            node: { select: { name: true } },
            egg: { select: { name: true, logoUrl: true } },
            defaultAllocation: { select: { ip: true, port: true } },
          },
        },
        subusers: {
          include: {
            server: {
              select: { id: true, name: true, owner: { select: { username: true } } },
            },
          },
        },
        _count: { select: { apiKeys: true, activityLogs: true } },
      },
    });
    if (!user) return reply.status(404).send({ error: 'Not found' });

    const recentActivity = await prisma.activityLog.findMany({
      where: { actorId: id },
      orderBy: { timestamp: 'desc' },
      take: 15,
      include: { server: { select: { id: true, name: true } } },
    });

    const serversLive = await enrichServerRefsWithLiveState(
      user.servers.map((s) => ({
        id: s.id,
        uuid: s.uuid,
        nodeId: s.nodeId,
        containerState: s.containerState,
      })),
    );
    const liveById = new Map(serversLive.map((s) => [s.id, s.containerState]));

    return {
      ...sanitizeUser(user),
      serverCount: user.servers.length,
      subuserCount: user.subusers.length,
      apiKeyCount: user._count.apiKeys,
      activityCount: user._count.activityLogs,
      servers: user.servers.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        suspended: s.suspended,
        installStatus: s.installStatus,
        containerState: liveById.get(s.id) ?? s.containerState,
        node: s.node.name,
        egg: s.egg.name,
        address: `${s.defaultAllocation.ip}:${s.defaultAllocation.port}`,
        createdAt: s.createdAt,
      })),
      subuserAccess: user.subusers.map((su) => ({
        id: su.id,
        serverId: su.server.id,
        serverName: su.server.name,
        owner: su.server.owner.username,
      })),
      recentActivity,
    };
  });

  app.post('/users', async (request, reply) => {
    const minPasswordLength = await getMinPasswordLength();
    const body = z
      .object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(minPasswordLength),
        role: z.enum(['admin', 'user']).default('user'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .parse(request.body);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        rootAdmin: body.role === 'admin',
      },
    });
    await logAdminActivity(request, {
      event: 'admin.user.created',
      description: `Created user ${user.username} (${user.role})`,
      properties: { userId: user.id, email: user.email, role: user.role },
    });
    return sanitizeUser(user);
  });

  app.patch('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const minPasswordLength = await getMinPasswordLength();
    const body = z
      .object({
        email: z.string().email().optional(),
        username: z.string().min(3).optional(),
        password: z.string().min(minPasswordLength).optional(),
        role: z.enum(['admin', 'user']).optional(),
        enabled: z.boolean().optional(),
        suspended: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const suspended =
      body.suspended !== undefined ? body.suspended : body.enabled !== undefined ? !body.enabled : undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(suspended !== undefined ? { enabled: !suspended } : {}),
        ...(body.role !== undefined ? { role: body.role, rootAdmin: body.role === 'admin' } : {}),
        ...(body.password
          ? { passwordHash: await hashPassword(body.password), tokenVersion: { increment: 1 } }
          : {}),
      },
    });

    const changes: string[] = [];
    if (body.email && body.email !== existing.email) changes.push('email');
    if (body.username && body.username !== existing.username) changes.push('username');
    if (body.role && body.role !== existing.role) changes.push(`role → ${body.role}`);
    if (suspended !== undefined && suspended !== !existing.enabled) {
      changes.push(suspended ? 'suspended' : 'unsuspended');
    }
    if (body.password) changes.push('password reset');

    if (changes.length) {
      const suspensionChange = suspended !== undefined && suspended !== !existing.enabled;
      await logAdminActivity(request, {
        event: suspensionChange
          ? suspended
            ? 'admin.user.suspended'
            : 'admin.user.unsuspended'
          : 'admin.user.updated',
        description: `Updated user ${user.username} (${changes.join(', ')})`,
        properties: { userId: user.id, changes },
      });
    }

    if (await isMailEnabled()) {
      try {
        if (suspended !== undefined && suspended !== !existing.enabled) {
          if (suspended) {
            await sendAccountSuspendedEmail(user.email, user.username);
          } else {
            await sendAccountRestoredEmail(user.email, user.username);
          }
        }
        if (body.password) {
          await sendPasswordChangedEmail(user.email, user.username);
        }
      } catch (err) {
        request.log.error({ err }, 'Failed to send user update email');
      }
    }

    return sanitizeUser(user);
  });

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === request.user!.id) {
      return reply.status(422).send({ error: 'You cannot delete your own account' });
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } },
    });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    if (user._count.servers > 0) {
      return reply.status(409).send({
        error: `Cannot delete user with ${user._count.servers} owned server(s). Delete their servers first (Admin → Servers).`,
      });
    }
    try {
      await prisma.user.delete({ where: { id } });
    } catch (err) {
      request.log.error(err, 'Failed to delete user');
      return reply.status(409).send({
        error: 'Cannot delete this user — remove their servers and try again.',
      });
    }
    await logAdminActivity(request, {
      event: 'admin.user.deleted',
      description: `Deleted user ${user.username}`,
      properties: { userId: id, email: user.email },
    });
    return { deleted: true };
  });

  // Locations
  app.get('/locations', async (request) => {
    const q = request.query as { search?: string };
    return prisma.location.findMany({
      where: q.search
        ? {
            OR: [
              { short: { contains: q.search } },
              { long: { contains: q.search } },
              { uuid: { contains: q.search } },
            ],
          }
        : undefined,
      include: { _count: { select: { nodes: true } } },
      orderBy: { short: 'asc' },
    });
  });

  app.get('/locations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: { select: { nodes: true } },
        nodes: {
          select: {
            id: true,
            name: true,
            fqdn: true,
            maintenanceMode: true,
            _count: { select: { servers: true, allocations: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!location) return reply.status(404).send({ error: 'Not found' });

    const serverCount = location.nodes.reduce((n, node) => n + node._count.servers, 0);

    return {
      id: location.id,
      uuid: location.uuid,
      short: location.short,
      long: location.long,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      nodeCount: location._count.nodes,
      serverCount,
      nodes: location.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        fqdn: node.fqdn,
        maintenanceMode: node.maintenanceMode,
        serverCount: node._count.servers,
        allocationCount: node._count.allocations,
      })),
    };
  });

  app.post('/locations', async (request) => {
    const body = z.object({ short: z.string(), long: z.string() }).parse(request.body);
    const location = await prisma.location.create({ data: body });
    await logAdminActivity(request, {
      event: 'admin.location.created',
      description: `Created location ${location.short}`,
      properties: { locationId: location.id },
    });
    return location;
  });

  app.patch('/locations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        short: z.string().optional(),
        long: z.string().optional(),
      })
      .parse(request.body);
    const location = await prisma.location.update({ where: { id }, data: body });
    await logAdminActivity(request, {
      event: 'admin.location.updated',
      description: `Updated location ${location.short}`,
      properties: { locationId: location.id },
    });
    return location;
  });

  app.delete('/locations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const location = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { nodes: true } } },
    });
    if (!location) return reply.status(404).send({ error: 'Not found' });
    if (location._count.nodes > 0) {
      return reply.status(409).send({
        error: `Cannot delete location with ${location._count.nodes} node(s). Remove or reassign nodes first.`,
      });
    }
    await prisma.location.delete({ where: { id } });
    if (location) {
      await logAdminActivity(request, {
        event: 'admin.location.deleted',
        description: `Deleted location ${location.short}`,
        properties: { locationId: id },
      });
    }
    return { deleted: true };
  });

  // Nodes
  app.get('/nodes', async (request) => {
    const q = request.query as { search?: string; locationId?: string; maintenance?: string };
    const rows = await prisma.node.findMany({
      where: {
        ...(q.locationId ? { locationId: q.locationId } : {}),
        ...(q.maintenance === 'true'
          ? { maintenanceMode: true }
          : q.maintenance === 'false'
            ? { maintenanceMode: false }
            : {}),
        ...(q.search
          ? {
              OR: [
                { name: { contains: q.search } },
                { fqdn: { contains: q.search } },
                { description: { contains: q.search } },
                { uuid: { contains: q.search } },
              ],
            }
          : {}),
      },
      include: {
        location: true,
        _count: { select: { servers: true, allocations: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allocationTotals = await loadNodeAllocationTotals(prisma);

    return Promise.all(
      rows.map(async (node) => {
        const health = await probeNodeHealth(node);
        const allocated = allocationTotals.get(node.id) ?? { memory: 0, disk: 0 };
        const capacity = computeNodeCapacity(node, allocated);
        return {
          ...sanitizeAdminNode(node),
          ...health,
          capacity,
        };
      }),
    );
  });

  app.get('/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        location: true,
        _count: { select: { servers: true, allocations: true } },
        servers: {
          select: {
            id: true,
            uuid: true,
            name: true,
            status: true,
            suspended: true,
            installStatus: true,
            containerState: true,
            nodeId: true,
            memory: true,
            disk: true,
            owner: { select: { username: true } },
            defaultAllocation: { select: { ip: true, port: true } },
          },
          orderBy: { name: 'asc' },
        },
        allocations: {
          orderBy: [{ ip: 'asc' }, { port: 'asc' }],
          include: {
            serverAssigned: { select: { id: true, name: true } },
            serverDefault: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!node) return reply.status(404).send({ error: 'Not found' });

    let system: Record<string, unknown> | null = null;
    let online = false;
    try {
      system = (await wingsForNode(node).getSystem()) as Record<string, unknown>;
      online = true;
    } catch {
      online = false;
    }

    const assignedAllocations = node.allocations.filter((a) => a.assigned).length;

    const serverTotals = await prisma.server.aggregate({
      where: { nodeId: id },
      _sum: { memory: true, disk: true },
    });
    const capacity = computeNodeCapacity(node, {
      memory: serverTotals._sum.memory ?? 0,
      disk: serverTotals._sum.disk ?? 0,
    });

    const recentActivity = await prisma.activityLog.findMany({
      where: { nodeId: id },
      orderBy: { timestamp: 'desc' },
      take: 25,
      include: { actor: { select: { username: true } }, server: { select: { name: true } } },
    });

    const { daemonTokenSecret: _secret, allocations, servers, ...safeNode } = node;
    const serversLive = await enrichServerRefsWithLiveState(servers);

    return {
      ...safeNode,
      servers: serversLive,
      serverCount: node._count.servers,
      allocationCount: node._count.allocations,
      assignedAllocations,
      online,
      system,
      capacity,
      allocations: allocations.map((a) => {
        // Primary allocations link via Server.allocationId (serverDefault);
        // secondary allocations link via Allocation.serverId (serverAssigned).
        const server = a.serverDefault ?? a.serverAssigned;
        return {
          id: a.id,
          ip: a.ip,
          port: a.port,
          alias: a.alias,
          notes: a.notes,
          assigned: a.assigned,
          isPrimary: Boolean(a.serverDefault),
          server: server ? { id: server.id, name: server.name } : null,
        };
      }),
      recentActivity,
    };
  });

  app.post('/nodes', async (request, reply) => {
    const body = z
      .object({
        locationId: z.string(),
        name: z.string(),
        description: z.string().default(''),
        fqdn: z.string().trim().min(1),
        scheme: z.enum(['http', 'https']).default('http'),
        behindProxy: z.boolean().default(false),
        maintenanceMode: z.boolean().default(false),
        memory: z.number().default(0),
        memoryOverallocate: z.number().default(0),
        disk: z.number().default(0),
        diskOverallocate: z.number().default(0),
        daemonListen: z.number().default(8080),
        daemonSftp: z.number().default(2022),
        daemonBase: z.string().default('/var/lib/pterodactyl/volumes'),
        uploadSize: z.number().default(100),
      })
      .parse(request.body);

    const location = await prisma.location.findUnique({ where: { id: body.locationId } });
    if (!location) {
      return reply.status(422).send({ error: 'Selected location does not exist.' });
    }

    const tokens = generateDaemonToken();
    const node = await prisma.node.create({
      data: {
        ...body,
        daemonTokenId: tokens.tokenId,
        daemonTokenSecret: tokens.tokenSecret,
      },
      include: {
        location: true,
        _count: { select: { servers: true, allocations: true } },
      },
    });
    await logAdminActivity(request, {
      event: 'admin.node.created',
      description: `Created node ${node.name}`,
      nodeId: node.id,
      properties: { fqdn: node.fqdn },
    });
    return { ...sanitizeAdminNode(node), online: false, wingsVersion: null, error: null };
  });

  app.patch('/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        locationId: z.string().optional(),
        fqdn: z.string().trim().min(1).optional(),
        scheme: z.enum(['http', 'https']).optional(),
        behindProxy: z.boolean().optional(),
        maintenanceMode: z.boolean().optional(),
        memory: z.number().int().min(0).optional(),
        memoryOverallocate: z.number().int().min(0).optional(),
        disk: z.number().int().min(0).optional(),
        diskOverallocate: z.number().int().min(0).optional(),
        daemonListen: z.number().int().min(1).max(65535).optional(),
        daemonSftp: z.number().int().min(1).max(65535).optional(),
        daemonBase: z.string().min(1).optional(),
        uploadSize: z.number().int().min(1).optional(),
      })
      .parse(request.body);

    if (body.locationId) {
      const location = await prisma.location.findUnique({ where: { id: body.locationId } });
      if (!location) {
        return reply.status(422).send({ error: 'Selected location does not exist.' });
      }
    }

    const node = await prisma.node.update({ where: { id }, data: body });
    await logAdminActivity(request, {
      event: 'admin.node.updated',
      description: `Updated node ${node.name}`,
      nodeId: node.id,
      properties: body,
    });
    return sanitizeAdminNode(node);
  });

  app.post('/nodes/:id/rotate-token', async (request) => {
    const { id } = request.params as { id: string };
    const tokens = generateDaemonToken();
    const node = await prisma.node.update({
      where: { id },
      data: { daemonTokenId: tokens.tokenId, daemonTokenSecret: tokens.tokenSecret },
    });
    await logAdminActivity(request, {
      event: 'admin.node.token_rotated',
      description: `Rotated daemon token for ${node.name}`,
      nodeId: node.id,
    });
    return {
      ...sanitizeAdminNode(node),
      message: 'Token rotated — download the new Wings config and restart FeatherWings on the node.',
    };
  });

  app.get('/nodes/:id/diagnostics', async (request, reply) => {
    const { id } = request.params as { id: string };
    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) return reply.status(404).send({ error: 'Not found' });

    const cfg = getConfig();
    const panelUrl = cfg.panelUrl || cfg.apiUrl;
    const health = await probeNodeHealth(node);

    return {
      node: {
        id: node.id,
        name: node.name,
        fqdn: node.fqdn,
        scheme: node.scheme,
        behindProxy: node.behindProxy,
        daemonListen: node.daemonListen,
        daemonSftp: node.daemonSftp,
      },
      panel: {
        url: panelUrl,
        apiUrl: cfg.apiUrl,
      },
      wings: health,
      remote: {
        expected: panelUrl,
        hint: 'FeatherWings config.yml remote: must match this URL exactly (Wings → Panel).',
      },
      console: {
        hint: describeConsoleAccess(node, panelUrl.startsWith('https://')),
      },
      sftp: {
        host: node.fqdn,
        port: node.daemonSftp,
        usernameFormat: '{panelUsername}.{serverShortId}',
      },
    };
  });

  app.get('/nodes/:id/config', async (request, reply) => {
    const { id } = request.params as { id: string };
    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) return reply.status(404).send({ error: 'Not found' });
    reply.type('text/yaml');
    return buildWingsConfig(node);
  });

  app.get('/nodes/:id/system', async (request, reply) => {
    const { id } = request.params as { id: string };
    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) return reply.status(404).send({ error: 'Not found' });
    try {
      return await wingsForNode(node).getSystem();
    } catch (e) {
      return reply.status(502).send({ error: String(e) });
    }
  });

  app.get('/nodes/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { range = '24h' } = request.query as { range?: string };
    const node = await prisma.node.findUnique({
      where: { id },
      include: { servers: true },
    });
    if (!node) return reply.status(404).send({ error: 'Not found' });
    return getNodeStats(node, range);
  });

  app.delete('/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const node = await prisma.node.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } },
    });
    if (!node) return reply.status(404).send({ error: 'Not found' });
    if (node._count.servers > 0) {
      return reply.status(409).send({
        error: `Cannot delete node with ${node._count.servers} server(s). Delete or move servers first.`,
      });
    }
    await prisma.node.delete({ where: { id } });
    if (node) {
      await logAdminActivity(request, {
        event: 'admin.node.deleted',
        description: `Deleted node ${node.name}`,
        nodeId: id,
      });
    }
    return { deleted: true };
  });

  // Allocations
  app.get('/nodes/:id/allocations', async (request) => {
    const { id } = request.params as { id: string };
    return prisma.allocation.findMany({ where: { nodeId: id }, orderBy: [{ ip: 'asc' }, { port: 'asc' }] });
  });

  app.post('/nodes/:id/allocations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        ip: z.string().optional(),
        // Accept numbers, single ports, ranges ("25565-25570"), and comma lists.
        ports: z.array(z.union([z.number(), z.string()])).min(1),
        alias: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(request.body);

    const ip = normalizeAllocationIp(body.ip);
    if (!isValidBindIp(ip)) {
      return reply.status(422).send({ error: `"${ip}" is not a valid bind IP address.` });
    }

    let ports: number[];
    try {
      ports = parseAllocationPorts(body.ports);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : 'Invalid ports' });
    }

    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) return reply.status(404).send({ error: 'Node not found' });

    // Skip ports that already exist on this node/IP rather than failing the batch.
    const existing = await prisma.allocation.findMany({
      where: { nodeId: id, ip, port: { in: ports } },
      select: { port: true },
    });
    const existingPorts = new Set(existing.map((row) => row.port));
    const toCreate = ports.filter((port) => !existingPorts.has(port));

    if (toCreate.length === 0) {
      return reply.status(422).send({
        error: `All ${ports.length} port(s) already exist on ${ip}.`,
      });
    }

    await prisma.allocation.createMany({
      data: toCreate.map((port) => ({ nodeId: id, ip, port, alias: body.alias, notes: body.notes })),
      skipDuplicates: true,
    });

    const skipped = ports.length - toCreate.length;
    await logAdminActivity(request, {
      event: 'admin.allocation.created',
      description: `Added ${toCreate.length} allocation(s) on ${ip}${skipped ? ` (${skipped} skipped)` : ''}`,
      nodeId: id,
      properties: { ip, ports: toCreate },
    });

    return { created: toCreate.length, skipped, ip, ports: toCreate };
  });

  app.patch('/allocations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        alias: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(request.body);

    const existing = await prisma.allocation.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    return prisma.allocation.update({
      where: { id },
      data: {
        ...(body.alias !== undefined ? { alias: body.alias } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
  });

  app.delete('/allocations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const alloc = await prisma.allocation.findUnique({ where: { id } });
    if (!alloc) return reply.status(404).send({ error: 'Not found' });
    if (alloc.assigned) return reply.status(422).send({ error: 'Allocation is in use' });
    await prisma.allocation.delete({ where: { id } });
    await logAdminActivity(request, {
      event: 'admin.allocation.deleted',
      description: `Removed allocation ${alloc.ip}:${alloc.port}`,
      nodeId: alloc.nodeId,
    });
    return { deleted: true };
  });

  app.post('/nodes/:id/allocations/bulk-delete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        ip: z.string().trim().optional(),
        ids: z.array(z.string()).optional(),
      })
      .refine((value) => Boolean(value.ip) || (value.ids?.length ?? 0) > 0, {
        message: 'Provide an IP and/or allocation IDs to delete.',
      })
      .parse(request.body);

    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) return reply.status(404).send({ error: 'Node not found' });

    try {
      const result = await bulkDeleteNodeAllocations(id, body);
      await logAdminActivity(request, {
        event: 'admin.allocation.bulk_deleted',
        description: `Removed ${result.deleted} allocation(s)${
          body.ip ? ` on ${normalizeAllocationIp(body.ip)}` : ''
        }${result.skippedAssigned ? ` (${result.skippedAssigned} assigned kept)` : ''}`,
        nodeId: id,
        properties: { ...body, ...result },
      });
      return result;
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : 'Bulk delete failed' });
    }
  });

  // Nests & Eggs
  app.get('/nests', async (request) => {
    const q = request.query as { search?: string };
    return prisma.nest.findMany({
      where: q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { description: { contains: q.search } },
              { author: { contains: q.search } },
              { uuid: { contains: q.search } },
            ],
          }
        : undefined,
      include: { _count: { select: { eggs: true } } },
      orderBy: { name: 'asc' },
    });
  });

  app.get('/nests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const nest = await prisma.nest.findUnique({
      where: { id },
      include: {
        eggs: {
          select: {
            id: true,
            name: true,
            author: true,
            description: true,
            enabled: true,
            _count: { select: { variables: true, servers: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { eggs: true } },
      },
    });
    if (!nest) return reply.status(404).send({ error: 'Not found' });

    const serverCount = await prisma.server.count({
      where: { egg: { nestId: id } },
    });

    return {
      id: nest.id,
      uuid: nest.uuid,
      name: nest.name,
      description: nest.description,
      author: nest.author,
      createdAt: nest.createdAt,
      updatedAt: nest.updatedAt,
      eggCount: nest._count.eggs,
      serverCount,
      eggs: nest.eggs.map((egg) => ({
        id: egg.id,
        name: egg.name,
        author: egg.author,
        description: egg.description,
        enabled: egg.enabled,
        variableCount: egg._count.variables,
        serverCount: egg._count.servers,
      })),
    };
  });

  app.post('/nests', async (request) => {
    const body = z.object({ name: z.string(), description: z.string().default('') }).parse(request.body);
    const nest = await prisma.nest.create({ data: body });
    await logAdminActivity(request, {
      event: 'admin.nest.created',
      description: `Created nest ${nest.name}`,
      properties: { nestId: nest.id },
    });
    return nest;
  });

  app.patch('/nests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        author: z.string().optional(),
      })
      .parse(request.body);
    const existing = await prisma.nest.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    const nest = await prisma.nest.update({ where: { id }, data: body });
    await logAdminActivity(request, {
      event: 'admin.nest.updated',
      description: `Updated nest ${nest.name}`,
      properties: { nestId: nest.id },
    });
    return nest;
  });

  app.delete('/nests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const nest = await prisma.nest.findUnique({ where: { id } });
    if (!nest) return reply.status(404).send({ error: 'Not found' });
    const serversOnNest = await prisma.server.count({ where: { egg: { nestId: id } } });
    if (serversOnNest > 0) {
      return reply.status(409).send({ error: 'Cannot delete nest with active servers' });
    }
    await prisma.nest.delete({ where: { id } });
    await logAdminActivity(request, {
      event: 'admin.nest.deleted',
      description: `Deleted nest ${nest.name}`,
      properties: { nestId: id },
    });
    return { deleted: true };
  });

  app.get('/eggs', async (request) => {
    const q = request.query as { nestId?: string; search?: string };
    return prisma.egg.findMany({
      where: {
        ...(q.nestId ? { nestId: q.nestId } : {}),
        ...(q.search
          ? {
              OR: [
                { name: { contains: q.search } },
                { description: { contains: q.search } },
                { author: { contains: q.search } },
                { uuid: { contains: q.search } },
              ],
            }
          : {}),
      },
      include: { nest: { select: { id: true, name: true } }, _count: { select: { variables: true, servers: true } } },
      orderBy: { name: 'asc' },
    });
  });

  app.post('/eggs/import', async (request, reply) => {
    try {
      const body = z
        .object({
          nestId: z.string().min(1),
          json: z.unknown(),
        })
        .parse(request.body);

      const nest = await prisma.nest.findUnique({ where: { id: body.nestId } });
      if (!nest) return reply.status(404).send({ error: 'Nest not found' });

      const parsed = parseEggJson(body.json);
      const egg = await prisma.egg.create({
        data: {
          nestId: body.nestId,
          name: parsed.name,
          author: parsed.author,
          description: parsed.description,
          features: parsed.features,
          dockerImages: parsed.dockerImages,
          fileDenylist: parsed.fileDenylist,
          configFiles: (parsed.configFiles ?? undefined) as object | undefined,
          configStartup: (parsed.configStartup ?? undefined) as object | undefined,
          configLogs: (parsed.configLogs ?? undefined) as object | undefined,
          configStop: parsed.configStop,
          startup: parsed.startup,
          scriptInstall: parsed.scriptInstall,
          scriptEntry: parsed.scriptEntry,
          scriptContainer: parsed.scriptContainer,
          scriptPrivileged: parsed.scriptPrivileged,
          updateUrl: parsed.updateUrl,
          variables: {
            create: parsed.variables.map((v) => ({
              name: v.name,
              description: v.description,
              envVariable: v.envVariable,
              defaultValue: v.defaultValue,
              userViewable: v.userViewable,
              userEditable: v.userEditable,
              rules: v.rules,
              fieldType: v.fieldType,
            })),
          },
        },
        include: { variables: true },
      });
      await logAdminActivity(request, {
        event: 'admin.egg.imported',
        description: `Imported egg ${egg.name}`,
        properties: { eggId: egg.id, nestId: body.nestId },
      });
      return egg;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid import request' });
      }
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2000'
      ) {
        return reply.status(422).send({
          error: 'Egg data is too long for a database column. Run database migrations and try again.',
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to import egg';
      request.log.error({ err }, 'Egg import failed');
      return reply.status(422).send({ error: message });
    }
  });

  // Re-import a Pterodactyl egg JSON over an existing egg, keeping its id/uuid
  // and any servers attached to it while refreshing scripts, images, config,
  // and variables to the latest egg definition.
  app.put('/eggs/:id/import', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = z.object({ json: z.unknown() }).parse(request.body);

      const existing = await prisma.egg.findUnique({ where: { id }, include: { variables: true } });
      if (!existing) return reply.status(404).send({ error: 'Not found' });

      const parsed = parseEggJson(body.json);

      const egg = await prisma.$transaction(async (tx) => {
        await tx.egg.update({
          where: { id },
          data: {
            name: parsed.name,
            author: parsed.author,
            description: parsed.description,
            features: parsed.features,
            dockerImages: parsed.dockerImages,
            fileDenylist: parsed.fileDenylist,
            configFiles: (parsed.configFiles ?? undefined) as object | undefined,
            configStartup: (parsed.configStartup ?? undefined) as object | undefined,
            configLogs: (parsed.configLogs ?? undefined) as object | undefined,
            configStop: parsed.configStop,
            startup: parsed.startup,
            scriptInstall: parsed.scriptInstall,
            scriptEntry: parsed.scriptEntry,
            scriptContainer: parsed.scriptContainer,
            scriptPrivileged: parsed.scriptPrivileged,
            updateUrl: parsed.updateUrl,
          },
        });

        // Reconcile variables by env_variable: update existing, add new,
        // remove ones no longer present in the egg export.
        const incoming = new Map(parsed.variables.map((v) => [v.envVariable, v]));
        const existingByEnv = new Map(existing.variables.map((v) => [v.envVariable, v]));

        for (const [envVariable, variable] of incoming) {
          const current = existingByEnv.get(envVariable);
          if (current) {
            await tx.eggVariable.update({
              where: { id: current.id },
              data: {
                name: variable.name,
                description: variable.description,
                defaultValue: variable.defaultValue,
                userViewable: variable.userViewable,
                userEditable: variable.userEditable,
                rules: variable.rules,
                fieldType: variable.fieldType,
              },
            });
          } else {
            await tx.eggVariable.create({
              data: {
                eggId: id,
                name: variable.name,
                description: variable.description,
                envVariable: variable.envVariable,
                defaultValue: variable.defaultValue,
                userViewable: variable.userViewable,
                userEditable: variable.userEditable,
                rules: variable.rules,
                fieldType: variable.fieldType,
              },
            });
          }
        }

        const removed = existing.variables.filter((v) => !incoming.has(v.envVariable));
        if (removed.length > 0) {
          await tx.eggVariable.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
        }

        return tx.egg.findUnique({ where: { id }, include: { variables: true } });
      });

      await logAdminActivity(request, {
        event: 'admin.egg.updated',
        description: `Re-imported egg ${parsed.name}`,
        properties: { eggId: id, nestId: existing.nestId },
      });

      return egg;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid import request' });
      }
      const message = err instanceof Error ? err.message : 'Failed to re-import egg';
      request.log.error({ err }, 'Egg re-import failed');
      return reply.status(422).send({ error: message });
    }
  });

  app.get('/eggs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const egg = await prisma.egg.findUnique({
      where: { id },
      include: {
        variables: { orderBy: { name: 'asc' } },
        nest: { select: { id: true, name: true } },
        _count: { select: { servers: true } },
      },
    });
    if (!egg) return reply.status(404).send({ error: 'Not found' });

    const dockerImages =
      egg.dockerImages && typeof egg.dockerImages === 'object' && !Array.isArray(egg.dockerImages)
        ? (egg.dockerImages as Record<string, string>)
        : {};
    const features = Array.isArray(egg.features) ? (egg.features as string[]) : [];

    return {
      id: egg.id,
      uuid: egg.uuid,
      nestId: egg.nestId,
      nest: egg.nest,
      name: egg.name,
      author: egg.author,
      description: egg.description,
      features,
      dockerImages,
      startup: egg.startup,
      configStop: egg.configStop,
      scriptInstall: egg.scriptInstall,
      scriptEntry: egg.scriptEntry,
      scriptContainer: egg.scriptContainer,
      scriptPrivileged: egg.scriptPrivileged,
      updateUrl: egg.updateUrl,
      logoUrl: egg.logoUrl,
      enabled: egg.enabled,
      createdAt: egg.createdAt,
      updatedAt: egg.updatedAt,
      serverCount: egg._count.servers,
      variables: egg.variables.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        envVariable: v.envVariable,
        defaultValue: v.defaultValue,
        userViewable: v.userViewable,
        userEditable: v.userEditable,
        rules: v.rules,
        fieldType: v.fieldType,
      })),
    };
  });

  app.patch('/eggs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        logoUrl: z
          .union([
            z.literal(''),
            z.string().url().refine((url) => /^https?:\/\//i.test(url), {
              message: 'Logo URL must use http or https',
            }),
          ])
          .optional(),
      })
      .parse(request.body);
    const existing = await prisma.egg.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    const { logoUrl, ...rest } = body;
    const egg = await prisma.egg.update({
      where: { id },
      data: {
        ...rest,
        ...(logoUrl !== undefined ? { logoUrl: logoUrl === '' ? null : logoUrl } : {}),
      },
    });
    await logAdminActivity(request, {
      event: 'admin.egg.updated',
      description: `Updated egg ${egg.name}`,
      properties: { eggId: egg.id, nestId: egg.nestId },
    });
    return egg;
  });

  const eggVariableInput = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    description: z.string().default(''),
    envVariable: z.string().min(1),
    defaultValue: z.string().default(''),
    userViewable: z.boolean().default(true),
    userEditable: z.boolean().default(true),
    rules: z.string().default(''),
    fieldType: z.string().default('text'),
  });

  app.put('/eggs/:id/variables', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ variables: z.array(eggVariableInput) }).parse(request.body);

    const egg = await prisma.egg.findUnique({
      where: { id },
      include: { variables: true },
    });
    if (!egg) return reply.status(404).send({ error: 'Not found' });

    const envKeys = body.variables.map((v) => v.envVariable.trim().toLowerCase());
    if (new Set(envKeys).size !== envKeys.length) {
      return reply.status(400).send({ error: 'Environment variable names must be unique' });
    }

    const incomingIds = new Set(body.variables.map((v) => v.id).filter(Boolean) as string[]);
    const toDelete = egg.variables.filter((v) => !incomingIds.has(v.id));

    for (const variable of toDelete) {
      const usage = await prisma.serverVariable.count({ where: { eggVariableId: variable.id } });
      if (usage > 0) {
        return reply.status(409).send({
          error: `Cannot remove "${variable.name}" — it is used by ${usage} server${usage === 1 ? '' : 's'}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const variable of toDelete) {
        await tx.eggVariable.delete({ where: { id: variable.id } });
      }
      for (const variable of body.variables) {
        const data = {
          name: variable.name,
          description: variable.description,
          envVariable: variable.envVariable,
          defaultValue: variable.defaultValue,
          userViewable: variable.userViewable,
          userEditable: variable.userEditable,
          rules: variable.rules,
          fieldType: variable.fieldType,
        };
        if (variable.id) {
          const existing = egg.variables.find((v) => v.id === variable.id);
          if (!existing) throw new Error('Variable not found');
          await tx.eggVariable.update({ where: { id: variable.id }, data });
        } else {
          await tx.eggVariable.create({ data: { ...data, eggId: id } });
        }
      }
    });

    const variables = await prisma.eggVariable.findMany({
      where: { eggId: id },
      orderBy: { name: 'asc' },
    });

    await logAdminActivity(request, {
      event: 'admin.egg.variables.updated',
      description: `Updated variables for egg ${egg.name}`,
      properties: { eggId: id, count: variables.length },
    });

    return variables;
  });

  app.delete('/eggs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const egg = await prisma.egg.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } },
    });
    if (!egg) return reply.status(404).send({ error: 'Not found' });
    if (egg._count.servers > 0) {
      return reply.status(409).send({ error: 'Cannot delete egg with active servers' });
    }
    await prisma.egg.delete({ where: { id } });
    await logAdminActivity(request, {
      event: 'admin.egg.deleted',
      description: `Deleted egg ${egg.name}`,
      properties: { eggId: id, nestId: egg.nestId },
    });
    return { deleted: true };
  });

  // Servers
  app.get('/servers', async (request) => {
    const q = request.query as {
      search?: string;
      nodeId?: string;
      suspended?: string;
      status?: string;
    };
    const statusFilter =
      q.status && Object.values(ServerStatus).includes(q.status as ServerStatus)
        ? (q.status as ServerStatus)
        : undefined;
    const rows = await prisma.server.findMany({
      where: {
        ...(q.nodeId ? { nodeId: q.nodeId } : {}),
        ...(q.suspended === 'true' ? { suspended: true } : q.suspended === 'false' ? { suspended: false } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(q.search
          ? {
              OR: [
                { name: { contains: q.search } },
                { uuid: { contains: q.search } },
                { owner: { username: { contains: q.search } } },
                { owner: { email: { contains: q.search } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        uuid: true,
        uuidShort: true,
        name: true,
        description: true,
        status: true,
        suspended: true,
        installStatus: true,
        containerState: true,
        nodeId: true,
        memory: true,
        disk: true,
        cpu: true,
        createdAt: true,
        owner: { select: { id: true, username: true, email: true, avatarUrl: true } },
        node: { select: { id: true, name: true, fqdn: true, location: { select: { short: true } } } },
        egg: { select: { id: true, name: true, logoUrl: true } },
        defaultAllocation: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await enrichServerRefsWithLiveState(rows, { refresh: true });
    return enriched.map((server) => {
      const reconciled = reconcilePanelFieldsForContainerState(server.containerState ?? 'offline');
      return {
        ...server,
        status: reconciled.status ?? server.status,
        installStatus: reconciled.installStatus ?? server.installStatus,
      };
    });
  });

  app.get('/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, email: true, avatarUrl: true } },
        node: { select: { id: true, name: true, fqdn: true, location: { select: { short: true } } } },
        egg: { select: { id: true, name: true, logoUrl: true, nest: { select: { name: true } } } },
        defaultAllocation: true,
        _count: { select: { subusers: true } },
      },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const nodeRecord = await prisma.node.findUnique({ where: { id: server.nodeId } });
    let containerState: string | null = server.containerState;
    if (nodeRecord) {
      try {
        containerState =
          (await resolveServerContainerState(
            {
              id: server.id,
              uuid: server.uuid,
              containerState: server.containerState,
              node: nodeRecord,
            },
            { refresh: true },
          )) ?? containerState;
      } catch {
        containerState = resolveCachedContainerState(server.uuid, server.containerState);
      }
    }

    const recentActivity = await prisma.activityLog.findMany({
      where: { serverId: server.id },
      orderBy: { timestamp: 'desc' },
      take: 25,
      include: { actor: { select: { username: true, email: true } } },
    });

    const { _count, ...rest } = server;
    return {
      ...rest,
      containerState,
      subuserCount: _count.subusers,
      recentActivity,
    };
  });

  app.post('/servers', async (request, reply) => {
    const body = z
      .object({
        ownerId: z.string(),
        nodeId: z.string(),
        eggId: z.string(),
        allocationId: z.string().optional(),
        name: z.string(),
        description: z.string().default(''),
        memory: z.number().int().min(0).default(1024),
        swap: z.number().int().min(0).default(0),
        disk: z.number().int().min(0).default(10240),
        io: z.number().int().min(0).default(500),
        cpu: z.number().int().min(0).default(100),
        image: z.string().optional(),
        startup: z.string().optional(),
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
      await logAdminActivity(request, {
        event: 'admin.server.created',
        serverId: server.id,
        description: `Provisioned server "${server.name}" for ${owner?.username ?? 'unknown'}`,
        properties: {
          ownerId: body.ownerId,
          nodeId: body.nodeId,
          memory: body.memory,
          disk: body.disk,
        },
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
      const message = e instanceof Error ? e.message : String(e);
      return reply.status(422).send({ error: message });
    }
  });

  app.patch('/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        memory: z.number().int().min(0).optional(),
        swap: z.number().int().min(0).optional(),
        disk: z.number().int().min(0).optional(),
        io: z.number().int().min(0).optional(),
        cpu: z.number().int().min(0).optional(),
        suspended: z.boolean().optional(),
        allocationLimit: z.number().int().min(0).optional(),
        backupLimit: z.number().int().min(0).optional(),
        databaseLimit: z.number().int().min(0).optional(),
      })
      .parse(request.body);

    const existing = await prisma.server.findUnique({ where: { id }, include: { node: true } });
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    const nextMemory = body.memory ?? existing.memory;
    const nextDisk = body.disk ?? existing.disk;
    if (body.memory !== undefined || body.disk !== undefined) {
      try {
        await assertNodeHasCapacityForUpdate(existing.node, existing.id, nextMemory, nextDisk);
      } catch (err) {
        return reply.status(422).send({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    const server = await prisma.server.update({
      where: { id },
      data: body,
      include: serverInclude,
    });
    await syncServerToWings(server.uuid);

    const changes: string[] = [];
    if (body.name && body.name !== existing.name) changes.push('name');
    if (body.suspended !== undefined && body.suspended !== existing.suspended) {
      changes.push(body.suspended ? 'suspended' : 'unsuspended');
    }
    if (body.memory && body.memory !== existing.memory) changes.push('memory');
    if (body.disk && body.disk !== existing.disk) changes.push('disk');

    if (changes.length) {
      await logAdminActivity(request, {
        event: body.suspended !== undefined && body.suspended !== existing.suspended
          ? (body.suspended ? 'admin.server.suspended' : 'admin.server.unsuspended')
          : 'admin.server.updated',
        serverId: server.id,
        description: `Updated server ${server.name} (${changes.join(', ')})`,
        properties: { changes },
      });
    }

    if (
      await isMailEnabled()
      && body.suspended !== undefined
      && body.suspended !== existing.suspended
    ) {
      try {
        const owner = await prisma.user.findUnique({
          where: { id: server.ownerId },
          select: { email: true, username: true },
        });
        if (owner) {
          if (body.suspended) {
            await sendServerSuspendedEmail(owner.email, owner.username, server.name, server.id);
          } else {
            await sendServerUnsuspendedEmail(owner.email, owner.username, server.name, server.id);
          }
        }
      } catch (err) {
        request.log.error({ err }, 'Failed to send server suspension email');
      }
    }

    return server;
  });

  app.get('/servers/:id/allocations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findUnique({
      where: { id },
      include: { node: true, defaultAllocation: true, extraAllocations: true },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    return listServerAllocations(server);
  });

  app.post('/servers/:id/allocations/:allocationId', async (request, reply) => {
    const { id, allocationId } = request.params as { id: string; allocationId: string };
    try {
      const server = await assignSecondaryAllocation(id, allocationId);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/servers/:id/allocations/:allocationId/primary', async (request, reply) => {
    const { id, allocationId } = request.params as { id: string; allocationId: string };
    try {
      const server = await setPrimaryAllocation(id, allocationId);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete('/servers/:id/allocations/:allocationId', async (request, reply) => {
    const { id, allocationId } = request.params as { id: string; allocationId: string };
    try {
      const server = await unassignSecondaryAllocation(id, allocationId);
      if (!server) return reply.status(404).send({ error: 'Not found' });
      await syncServerToWings(server.uuid);
      return listServerAllocations(server);
    } catch (e) {
      return reply.status(422).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get('/servers/:id/websocket', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findUnique({
      where: { id },
      include: { node: true, owner: { select: { id: true, username: true, email: true, avatarUrl: true } } },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    const token = signWingsJwt(
      {
        jti: crypto.randomUUID(),
        user_uuid: request.user!.uuid,
        server_uuid: server.uuid,
        permissions: [...WINGS_CLIENT_PERMISSIONS],
      },
      '10m',
      server.node.daemonTokenSecret,
    );

    const socket = buildWingsWebsocketUrl(server.uuid, server.node);

    await logAdminActivity(request, {
      event: 'admin.server.console',
      serverId: server.id,
      description: `Admin opened support console for "${server.name}" (owner: ${server.owner.username})`,
      properties: {
        ownerId: server.owner.id,
        ownerUsername: server.owner.username,
        ownerEmail: server.owner.email,
      },
    });

    return { token, socket, connection_string: socket };
  });

  app.post('/servers/:id/command', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { command } = z.object({ command: z.string() }).parse(request.body);
    const server = await prisma.server.findUnique({
      where: { id },
      include: { node: true, owner: { select: { id: true, username: true } } },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    await wingsForNode(server.node).sendCommand(server.uuid, command);
    await logAdminActivity(request, {
      event: 'admin.server.command',
      serverId: server.id,
      description: `Admin ran command on "${server.name}" (owner: ${server.owner.username}): ${command}`,
      properties: { command, ownerId: server.owner.id, ownerUsername: server.owner.username },
    });
    return { success: true };
  });

  app.get('/servers/:id/install-logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findUnique({
      where: { id },
      include: { node: true },
    });
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

  app.post('/servers/:id/power', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = z.object({ action: z.enum(['start', 'stop', 'restart', 'kill']) }).parse(request.body);
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    if (action === 'start' && isServerInstalling(server)) {
      return reply.status(409).send({
        error: 'This server is still installing. Wait for installation to finish before starting.',
        code: 'server_installing',
      });
    }

    try {
      await powerServer(server.uuid, action);
    } catch (err) {
      request.log.error({ err }, 'Admin server power failed');
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'Failed to send power action to Wings',
      });
    }
    await logAdminActivity(request, {
      event: `admin.server.power.${action}`,
      serverId: server.id,
      description: `Admin sent ${action} to ${server.name}`,
    });
    return { success: true };
  });

  app.post('/servers/:id/reinstall', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ wipeFiles: z.boolean().default(false) }).parse(request.body ?? {});
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    if (server.suspended) {
      return reply.status(403).send({ error: 'Cannot reinstall a suspended server. Unsuspend it first.' });
    }

    try {
      await reinstallServerOnWings(server.uuid, { wipeFiles: body.wipeFiles });
      await logAdminActivity(request, {
        event: 'admin.server.reinstall',
        serverId: server.id,
        description: `Admin triggered reinstall for ${server.name}${body.wipeFiles ? ' (files wiped)' : ''}`,
        properties: { wipeFiles: body.wipeFiles, ownerId: server.ownerId },
      });
      return { success: true };
    } catch (err) {
      request.log.error({ err }, 'Server reinstall failed');
      return reply.status(502).send({
        error: err instanceof Error ? err.message : 'Failed to reinstall on FeatherWings',
      });
    }
  });

  app.delete('/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Not found' });
    await deleteServerFromPanel(server.uuid);
    await logAdminActivity(request, {
      event: 'admin.server.deleted',
      description: `Deleted server ${server.name}`,
      properties: { uuid: server.uuid },
    });
    return { deleted: true };
  });

  // Activity
  app.get('/activity', async (request) => {
    const q = request.query as { limit?: string; scope?: string; cursor?: string };
    const scope = q.scope === 'auth' || q.scope === 'admin' ? q.scope : 'panel';
    const limit = Math.min(Number(q.limit ?? 15), 50);

    return paginateActivityLogs({
      where: panelActivityFilter(scope),
      take: limit,
      cursor: q.cursor ?? null,
      include: {
        actor: { select: { username: true, email: true, role: true } },
        server: { select: { name: true, uuid: true, id: true } },
      },
    });
  });

  app.post('/system/refresh-server-states', async (request) => {
    const result = await refreshAllServerContainerStates();
    await logAdminActivity(request, {
      event: 'admin.system.refresh_server_states',
      description: `Refreshed server states (${result.serversUpdated}/${result.serversPolled} updated)`,
      properties: result,
    });
    return result;
  });

  // Settings
  app.get('/settings', async () => {
    const settings = await prisma.panelSetting.findMany();
    const result = Object.fromEntries(settings.map((s) => [s.key, s.value])) as Record<string, unknown>;
    // Never expose the stored SMTP password to the client.
    if (result.smtp && typeof result.smtp === 'object') {
      const smtp = result.smtp as Record<string, unknown>;
      result.smtp = { ...smtp, password: '', passwordSet: Boolean(smtp.password) };
    }
    if (result.turnstile && typeof result.turnstile === 'object') {
      const turnstile = result.turnstile as Record<string, unknown>;
      result.turnstile = { ...turnstile, secretKey: '', secretKeySet: Boolean(turnstile.secretKey) };
    }
    return result;
  });

  app.post('/settings/smtp/test', async (request, reply) => {
    const body = z.object({ to: z.string().email() }).parse(request.body);
    const stored = await getSmtpSettings();
    const candidate = request.body as { smtp?: Record<string, unknown> };
    // Use submitted config if provided (so admins can test before saving), else stored.
    let smtp = stored;
    if (candidate.smtp) {
      const parsed = smtpSchema.partial().safeParse(candidate.smtp);
      if (parsed.success) {
        smtp = { ...stored, ...parsed.data, password: parsed.data.password || stored.password };
      }
    }
    try {
      await verifySmtp(smtp);
      await sendTestEmail(body.to, smtp);
      return { success: true };
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'SMTP test failed' });
    }
  });

  app.post('/settings/email-templates/preview', async (request, reply) => {
    const body = z
      .object({
        templateId: z.enum(EMAIL_TEMPLATE_IDS),
        template: emailTemplateSchema,
      })
      .parse(request.body);
    try {
      const html = await previewEmailTemplate(body.templateId, body.template);
      return { html };
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Preview failed' });
    }
  });

  app.put('/settings', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const allowed = [
      'branding',
      'general',
      'maintenance',
      'announcement',
      'marketplace',
      'security',
      'registration_enabled',
      'smtp',
      'email_templates',
      'turnstile',
    ] as const;

    for (const key of Object.keys(body)) {
      if (!allowed.includes(key as (typeof allowed)[number])) {
        return reply.status(400).send({ error: `Unknown settings key: ${key}` });
      }
    }

    if (body.branding !== undefined) {
      const parsed = brandingSchema.safeParse(body.branding);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('branding', parsed.data);
    }

    if (body.general !== undefined) {
      const parsed = generalSchema.safeParse(body.general);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('general', parsed.data);
    }

    if (body.maintenance !== undefined) {
      const parsed = maintenanceSchema.safeParse(body.maintenance);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('maintenance', parsed.data);
    }

    if (body.announcement !== undefined) {
      const parsed = announcementSchema.safeParse(body.announcement);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      if (parsed.data.enabled && !parsed.data.message.trim()) {
        return reply.status(422).send({ error: 'Announcement message is required when enabled' });
      }
      const current = await getAnnouncementSettings();
      const contentChanged =
        parsed.data.enabled !== current.enabled ||
        parsed.data.title !== current.title ||
        parsed.data.message !== current.message ||
        parsed.data.tone !== current.tone;
      await upsertPanelSetting('announcement', {
        ...parsed.data,
        revision: contentChanged ? new Date().toISOString() : current.revision || new Date().toISOString(),
      });
    }

    if (body.marketplace !== undefined) {
      const parsed = marketplaceSchema.safeParse(body.marketplace);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      const current = await getMarketplaceSettings();
      await upsertPanelSetting('marketplace', { ...current, ...parsed.data });
    }

    if (body.security !== undefined) {
      const parsed = securitySchema.safeParse(body.security);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('security', parsed.data);
    }

    if (body.registration_enabled !== undefined) {
      const parsed = registrationSchema.safeParse(body.registration_enabled);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('registration_enabled', parsed.data);
    }

    if (body.smtp !== undefined) {
      const parsed = smtpSchema.safeParse(body.smtp);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      // Empty password means "keep existing" so it isn't wiped by the redacted GET.
      const current = await getSmtpSettings();
      const next = { ...parsed.data, password: parsed.data.password || current.password };
      await upsertPanelSetting('smtp', next);
    }

    if (body.email_templates !== undefined) {
      const parsed = emailTemplatesSettingsSchema.safeParse(body.email_templates);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      await upsertPanelSetting('email_templates', parsed.data);
    }

    if (body.turnstile !== undefined) {
      const parsed = turnstileSchema.safeParse(body.turnstile);
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
      }
      const current = await getTurnstileSettings();
      const next = { ...parsed.data, secretKey: parsed.data.secretKey || current.secretKey };
      await upsertPanelSetting('turnstile', next);
    }

    await logAdminActivity(request, {
      event: 'admin.settings.updated',
      description: `Updated panel settings (${Object.keys(body).join(', ')})`,
      properties: { keys: Object.keys(body) },
    });
    return { success: true };
  });

  app.post('/settings/branding-asset', async (request, reply) => {
    const body = z
      .object({
        kind: z.enum(['logo', 'favicon']),
        data: z.string().min(1),
        mimeType: z.string().min(1),
      })
      .parse(request.body);

    const buffer = Buffer.from(body.data, 'base64');
    let url: string;
    try {
      url = await saveBrandingAsset(body.kind, buffer, body.mimeType);
    } catch (err) {
      return reply.status(422).send({ error: err instanceof Error ? err.message : 'Upload failed' });
    }

    const branding = await getBrandingSettings();
    const updated = {
      ...branding,
      ...(body.kind === 'logo' ? { logoUrl: url } : { faviconUrl: url }),
    };
    await upsertPanelSetting('branding', updated);

    await logAdminActivity(request, {
      event: 'admin.settings.updated',
      description: `Uploaded panel ${body.kind}`,
      properties: { kind: body.kind },
    });

    return { url, branding: updated };
  });

  app.post('/settings/branding-asset-url', async (request, reply) => {
    const body = z
      .object({
        kind: z.enum(['logo', 'favicon']),
        url: z.string().max(512),
      })
      .parse(request.body);

    const url = body.url.trim();
    if (!isValidBrandingAssetUrl(url)) {
      return reply.status(422).send({
        error: 'URL must be empty, a path starting with /, or an http(s) address',
      });
    }

    const branding = await getBrandingSettings();
    const previousUrl = body.kind === 'logo' ? branding.logoUrl : branding.faviconUrl;

    if (previousUrl.startsWith(BRANDING_ASSET_PREFIX) && url !== previousUrl) {
      await deleteBrandingAsset(body.kind);
    }

    const updated = {
      ...branding,
      ...(body.kind === 'logo' ? { logoUrl: url } : { faviconUrl: url }),
    };

    const parsed = brandingSchema.safeParse(updated);
    if (!parsed.success) {
      return reply.status(422).send({ error: parsed.error.flatten().fieldErrors });
    }

    await upsertPanelSetting('branding', parsed.data);

    await logAdminActivity(request, {
      event: 'admin.settings.updated',
      description: `Set panel ${body.kind} from URL`,
      properties: { kind: body.kind },
    });

    return { branding: parsed.data };
  });

  app.delete('/settings/branding-asset/:kind', async (request, reply) => {
    const { kind } = request.params as { kind: string };
    if (kind !== 'logo' && kind !== 'favicon') {
      return reply.status(400).send({ error: 'Invalid asset kind' });
    }

    await deleteBrandingAsset(kind);
    const branding = await getBrandingSettings();
    const updated = {
      ...branding,
      ...(kind === 'logo' ? { logoUrl: '' } : { faviconUrl: '' }),
    };
    await upsertPanelSetting('branding', updated);

    await logAdminActivity(request, {
      event: 'admin.settings.updated',
      description: `Removed panel ${kind}`,
      properties: { kind },
    });

    return { branding: updated };
  });

  // API Keys
  app.get('/api-keys', async (request) => listApiKeysForUser(request.user!.id));

  app.post('/api-keys', async (request, reply) => {
    const body = z
      .object({
        memo: z.string().trim().min(1).max(255),
        permissions: z.array(applicationScopeZod).optional(),
        allowedIps: z.array(z.string().min(3).max(45)).optional(),
      })
      .parse(request.body ?? {});
    try {
      const key = await createApiKeyForUser(request.user!.id, {
        memo: body.memo,
        keyType: API_KEY_TYPE_APPLICATION,
        permissions: body.permissions,
        allowedIps: body.allowedIps,
      });

      await logAdminActivity(request, {
        event: 'admin.api_key.created',
        description: 'Created an application API key',
        properties: { keyId: key.id },
      });

      return key;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
      return reply.status(statusCode).send({
        error: err instanceof Error ? err.message : 'Failed to create API key',
      });
    }
  });

  app.delete('/api-keys/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteApiKeyForUser(id, request.user!.id);
    if (!deleted) return reply.status(404).send({ error: 'API key not found' });

    await logAdminActivity(request, {
      event: 'admin.api_key.deleted',
      description: 'Deleted an application API key',
      properties: { keyId: id },
    });

    return { deleted: true };
  });

  app.get('/users/:id/api-keys', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return listApiKeysForUser(id);
  });

  app.post('/users/:id/api-keys', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const body = z
      .object({
        memo: z.string().trim().max(255).default(''),
        keyType: z.enum(['account', 'application']).default('account'),
        permissions: z.array(applicationScopeZod).optional(),
        allowedIps: z.array(z.string().min(3).max(45)).optional(),
      })
      .superRefine((data, ctx) => {
        if (data.keyType === 'application' && !data.memo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Application API keys require a memo describing their use',
            path: ['memo'],
          });
        }
      })
      .parse(request.body ?? {});

    const keyType =
      body.keyType === 'application' ? API_KEY_TYPE_APPLICATION : API_KEY_TYPE_ACCOUNT;
    if (keyType === API_KEY_TYPE_APPLICATION && user.role !== 'admin' && !user.rootAdmin) {
      return reply.status(422).send({ error: 'Application keys can only be created for admin users' });
    }

    try {
      const key = await createApiKeyForUser(id, {
        memo: body.memo,
        keyType,
        permissions: keyType === API_KEY_TYPE_APPLICATION ? body.permissions : undefined,
        allowedIps: keyType === API_KEY_TYPE_APPLICATION ? body.allowedIps : undefined,
      });

      await logAdminActivity(request, {
        event: 'admin.api_key.created',
        description: `Created ${body.keyType} API key for ${user.username}`,
        properties: { userId: id, keyId: key.id, keyType: body.keyType },
      });

      return key;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 422;
      return reply.status(statusCode).send({
        error: err instanceof Error ? err.message : 'Failed to create API key',
      });
    }
  });

  app.delete('/users/:id/api-keys/:keyId', async (request, reply) => {
    const { id, keyId } = request.params as { id: string; keyId: string };
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId: id } });
    if (!key) return reply.status(404).send({ error: 'API key not found' });

    await deleteApiKeyById(keyId);

    await logAdminActivity(request, {
      event: 'admin.api_key.deleted',
      description: `Deleted API key for user ${id}`,
      properties: { userId: id, keyId },
    });

    return { deleted: true };
  });
}

function panelActivityFilter(scope: 'panel' | 'auth' | 'admin' = 'panel') {
  if (scope === 'auth') return { event: { startsWith: 'auth.' } };
  if (scope === 'admin') return { event: { startsWith: 'admin.' } };
  return {
    OR: PANEL_ACTIVITY_PREFIXES.map((prefix) => ({ event: { startsWith: prefix } })),
  };
}

function sanitizeUser(user: {
  id: string;
  uuid: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
  role: string;
  rootAdmin: boolean;
  enabled: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    rootAdmin: user.rootAdmin,
    enabled: user.enabled,
    suspended: !user.enabled,
    createdAt: user.createdAt,
  };
}
