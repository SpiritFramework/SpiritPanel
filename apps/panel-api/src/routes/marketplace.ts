import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSession } from '../middleware/auth.js';
import { isFiveMEgg } from '../lib/fivem-egg.js';
import { logServerActivity } from '../lib/client-server.js';
import {
  assertFiveMServerAccess,
  assertFiveMServerView,
  installMarketplacePlugin,
  serializeMarketplacePlugin,
  uninstallMarketplacePlugin,
  updateMarketplacePlugin,
} from '../services/marketplace-installer.js';
import {
  assertMarketplaceEnabledForClients,
  isGithubInstallsSchemaReady,
  listGithubInstalls,
  withMarketplaceDb,
} from '../lib/marketplace-db.js';
import {
  isMarketplaceCatalogAllowed,
  isMarketplaceGithubInstallsAllowed,
} from '../lib/panel-settings.js';
import { EXPENSIVE_ROUTE_RATE_LIMIT } from '../lib/rate-limits.js';
import { sendClientError } from '../lib/safe-errors.js';
import { getFeaturedFivemScripts, getFeaturedRepoMeta } from '../services/github-featured.js';
import { resolveGithubRepo, searchGithubRepos } from '../services/github-repo.js';
import {
  detectFivemServerLayout,
  MARKETPLACE_RESOURCES_FOLDER,
  suggestCfgResource,
  suggestInstallPathForRepo,
  type FivemServerLayout,
} from '../services/fivem-server-layout.js';
import { wingsForNode } from '../services/wings-client.js';
import {
  installGithubResource,
  serializeGithubInstall,
  uninstallGithubResource,
  updateGithubResource,
} from '../services/marketplace-github-installer.js';

function marketplaceError(
  reply: import('fastify').FastifyReply,
  err: unknown,
  log?: import('fastify').FastifyBaseLogger,
) {
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  if (statusCode >= 400 && statusCode < 500 && err instanceof Error) {
    return reply.status(statusCode).send({ error: err.message });
  }
  return sendClientError(reply, statusCode >= 500 ? statusCode : 500, 'marketplace', log, err);
}

export async function marketplaceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/servers/:id/marketplace', async (request, reply) => {
    try {
      await assertMarketplaceEnabledForClients();
      const { id } = request.params as { id: string };
      const check = await assertFiveMServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_fivem') {
        return reply.status(400).send({ error: 'Marketplace is only available for FiveM servers' });
      }

      const [githubSchemaReady, githubInstallsAllowed, catalogAllowed] = await Promise.all([
        isGithubInstallsSchemaReady(),
        isMarketplaceGithubInstallsAllowed(),
        isMarketplaceCatalogAllowed(),
      ]);
      const allowGithubInstalls = githubSchemaReady && githubInstallsAllowed;
      const allowCatalog = catalogAllowed;

      return await withMarketplaceDb(async () => {
        const [catalog, installs, githubInstalls] = await Promise.all([
          allowCatalog
            ? prisma.marketplacePlugin.findMany({
                where: { enabled: true },
                orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
              })
            : Promise.resolve([]),
          prisma.marketplaceInstall.findMany({
            where: { serverId: id },
            include: { plugin: true },
            orderBy: { installedAt: 'desc' },
          }),
          listGithubInstalls(id),
        ]);

        const installedIds = new Set(installs.map((i) => i.pluginId));

        const catalogInstalled = installs.map((i) => ({
          id: i.id,
          source: 'catalog' as const,
          pluginId: i.pluginId,
          slug: i.plugin.slug,
          name: i.plugin.name,
          category: i.plugin.category,
          installedRef: i.installedRef,
          installPath: i.installPath,
          installedAt: i.installedAt.toISOString(),
          plugin: serializeMarketplacePlugin(i.plugin),
        }));

        const githubInstalled = githubInstalls.map((i) => serializeGithubInstall(i));

        let layout = null;
        if (allowGithubInstalls && check.server) {
          const wings = wingsForNode(check.server.node);
          layout = await detectFivemServerLayout(wings, check.server.uuid);
        }

        return {
          isFiveM: true,
          allowCatalog,
          allowGithubInstalls,
          layout,
          catalog: catalog.map((p) => ({
            ...serializeMarketplacePlugin(p),
            installed: installedIds.has(p.id),
            installedRef: installs.find((i) => i.pluginId === p.id)?.installedRef ?? null,
          })),
          installed: [...catalogInstalled, ...githubInstalled].sort(
            (a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime(),
          ),
        };
      });
    } catch (err) {
      request.log.error({ err }, 'Marketplace catalog load failed');
      return marketplaceError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/marketplace/install', { config: EXPENSIVE_ROUTE_RATE_LIMIT }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      const install = await installMarketplacePlugin(id, body.pluginId, request.user!.id);
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.install',
        description: `${request.user!.username} installed ${plugin?.name ?? 'resource'} from marketplace`,
        properties: { pluginId: body.pluginId, slug: plugin?.slug },
      });
      return { success: true, install };
    } catch (err) {
      return marketplaceError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/marketplace/uninstall', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await uninstallMarketplacePlugin(id, body.pluginId, request.user!.id);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.uninstall',
        description: `${request.user!.username} removed ${plugin?.name ?? 'resource'} from marketplace`,
        properties: { pluginId: body.pluginId },
      });
      return { success: true };
    } catch (err) {
      return marketplaceError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/marketplace/update', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      const install = await updateMarketplacePlugin(id, body.pluginId, request.user!.id);
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.update',
        description: `${request.user!.username} updated ${plugin?.name ?? 'resource'} from marketplace`,
        properties: { pluginId: body.pluginId },
      });
      return { success: true, install };
    } catch (err) {
      return marketplaceError(reply, err, request.log);
    }
  });

  app.get('/servers/:id/marketplace/github/resolve', async (request, reply) => {
    try {
      await assertMarketplaceEnabledForClients();
      if (!(await isGithubInstallsSchemaReady())) {
        return reply.status(503).send({
          error: 'GitHub installs require a database update. Run: cd apps/panel-api && pnpm db:deploy',
        });
      }
      if (!(await isMarketplaceGithubInstallsAllowed())) {
        return reply.status(403).send({ error: 'GitHub installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const { url } = z.object({ url: z.string().min(1) }).parse(request.query);
      const check = await assertFiveMServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_fivem') {
        return reply.status(400).send({ error: 'Marketplace is only available for FiveM servers' });
      }
      const wings = wingsForNode(check.server!.node);
      let layout: FivemServerLayout = {
        layout: 'unknown',
        resourcesBase: `/resources/${MARKETPLACE_RESOURCES_FOLDER}`,
        cfgFile: '/server.cfg',
        profileName: null,
        profilePath: null,
        confidence: 'low',
      };
      try {
        layout = await detectFivemServerLayout(wings, check.server!.uuid);
      } catch {
        // Wings unreachable — still allow viewing/install with defaults
      }
      const resolved = await resolveGithubRepo(url, { userId: request.user!.id });
      const featured = getFeaturedRepoMeta(resolved.owner, resolved.repo);
      const installPath = suggestInstallPathForRepo(layout, resolved.repo);
      const existingInstall = await prisma.marketplaceGithubInstall.findFirst({
        where: { serverId: id, githubOwner: resolved.owner, githubRepo: resolved.repo },
        select: { id: true, installPath: true, installedRef: true, displayName: true },
      });
      return {
        ...resolved,
        featuredBlurb: featured?.blurb ?? null,
        featuredCategory: featured?.category ?? null,
        layout,
        existingInstall,
        suggested: {
          installPath,
          cfgResource: suggestCfgResource(installPath, resolved.repo),
          cfgAction: 'ensure' as const,
          cfgFile: layout.cfgFile,
          githubRef: 'latest-release',
          patchCfg: true,
        },
      };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 400;
      const message = err instanceof Error ? err.message : 'Could not resolve repository';
      return reply.status(statusCode).send({ error: message });
    }
  });

  app.get('/servers/:id/marketplace/github/search', async (request, reply) => {
    try {
      await assertMarketplaceEnabledForClients();
      if (!(await isGithubInstallsSchemaReady())) {
        return reply.status(503).send({
          error: 'GitHub installs require a database update. Run: cd apps/panel-api && pnpm db:deploy',
        });
      }
      if (!(await isMarketplaceGithubInstallsAllowed())) {
        return reply.status(403).send({ error: 'GitHub installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const query = z
        .object({
          q: z.string().default(''),
          page: z.coerce.number().int().min(1).max(10).default(1),
        })
        .parse(request.query);
      const check = await assertFiveMServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_fivem') {
        return reply.status(400).send({ error: 'Marketplace is only available for FiveM servers' });
      }
      return await searchGithubRepos(query.q, query.page, { userId: request.user!.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/servers/:id/marketplace/github/featured', async (request, reply) => {
    try {
      await assertMarketplaceEnabledForClients();
      if (!(await isGithubInstallsSchemaReady())) {
        return reply.status(503).send({
          error: 'GitHub installs require a database update. Run: cd apps/panel-api && pnpm db:deploy',
        });
      }
      if (!(await isMarketplaceGithubInstallsAllowed())) {
        return reply.status(403).send({ error: 'GitHub installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const check = await assertFiveMServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_fivem') {
        return reply.status(400).send({ error: 'Marketplace is only available for FiveM servers' });
      }
      const featured = await getFeaturedFivemScripts({ userId: request.user!.id });
      return { featured };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load featured scripts';
      return reply.status(500).send({ error: message });
    }
  });

  const githubInstallBody = z.object({
    githubOwner: z.string().min(1).max(191),
    githubRepo: z.string().min(1).max(191),
    githubRef: z.string().min(1).max(191).default('latest-release'),
    githubAsset: z.string().max(191).nullable().optional(),
    displayName: z.string().max(191).optional(),
    installPath: z.string().min(1).max(512),
    cfgResource: z.string().min(1).max(191),
    cfgAction: z.enum(['ensure', 'start']).default('ensure'),
    cfgFile: z.string().min(1).max(191).default('/server.cfg'),
    patchCfg: z.boolean().default(true),
    useAutoPaths: z.boolean().default(true),
  });

  app.post('/servers/:id/marketplace/github/install', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = githubInstallBody.parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      if (!(await isMarketplaceGithubInstallsAllowed())) {
        return reply.status(403).send({ error: 'GitHub installs are disabled on this panel' });
      }
      const install = await installGithubResource(id, request.user!.id, {
        ...body,
        displayName: body.displayName ?? body.githubRepo,
        githubAsset: body.githubAsset ?? null,
        useAutoPaths: body.useAutoPaths,
      });
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.github.install',
        description: `${request.user!.username} installed ${install.displayName} from GitHub`,
        properties: {
          githubOwner: body.githubOwner,
          githubRepo: body.githubRepo,
          installPath: body.installPath,
        },
      });
      return { success: true, install };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 502;
      const message = err instanceof Error ? err.message : 'Install failed';
      return reply.status(statusCode).send({ error: message });
    }
  });

  app.post('/servers/:id/marketplace/github/uninstall', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ installId: z.string().min(1) }).parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      const existing = await prisma.marketplaceGithubInstall.findFirst({
        where: { id: body.installId, serverId: id },
      });
      await uninstallGithubResource(id, body.installId, request.user!.id);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.github.uninstall',
        description: `${request.user!.username} removed ${existing?.displayName ?? 'GitHub resource'}`,
        properties: { installId: body.installId },
      });
      return { success: true };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 502;
      const message = err instanceof Error ? err.message : 'Uninstall failed';
      return reply.status(statusCode).send({ error: message });
    }
  });

  app.post('/servers/:id/marketplace/github/update', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ installId: z.string().min(1) }).parse(request.body);

    try {
      await assertMarketplaceEnabledForClients();
      const install = await updateGithubResource(id, body.installId, request.user!.id);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.marketplace.github.update',
        description: `${request.user!.username} updated ${install.displayName} from GitHub`,
        properties: { installId: body.installId },
      });
      return { success: true, install };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 502;
      const message = err instanceof Error ? err.message : 'Update failed';
      return reply.status(statusCode).send({ error: message });
    }
  });
}

export async function adminMarketplaceRoutes(app: FastifyInstance) {
  const pluginBody = z.object({
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(191),
    description: z.string().max(5000),
    category: z.enum(['library', 'script', 'map', 'vehicle', 'other']),
    tags: z.array(z.string()).default([]),
    githubOwner: z.string().min(1).max(191),
    githubRepo: z.string().min(1).max(191),
    githubRef: z.string().min(1).max(191).default('latest-release'),
    githubAsset: z.string().max(191).nullable().optional(),
    installPath: z.string().min(1).max(512),
    cfgResource: z.string().min(1).max(191),
    cfgAction: z.enum(['ensure', 'start']).default('ensure'),
    cfgFile: z.string().min(1).max(191).default('server.cfg'),
    dependencies: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    enabled: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    iconUrl: z.string().url().nullable().optional(),
  });

  app.get('/marketplace/plugins', async (request, reply) => {
    try {
      return await withMarketplaceDb(async () => {
        const plugins = await prisma.marketplacePlugin.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { installs: true } } },
        });
        return plugins.map((p) => ({
          ...serializeMarketplacePlugin(p),
          installCount: p._count.installs,
          githubAsset: p.githubAsset,
          cfgAction: p.cfgAction,
          cfgFile: p.cfgFile,
          enabled: p.enabled,
        }));
      });
    } catch (err) {
      request.log.error({ err }, 'Admin marketplace plugin list failed');
      return marketplaceError(reply, err, request.log);
    }
  });

  app.post('/marketplace/plugins', async (request, reply) => {
    const body = pluginBody.parse(request.body);
    const existing = await prisma.marketplacePlugin.findUnique({ where: { slug: body.slug } });
    if (existing) return reply.status(409).send({ error: 'Slug already exists' });

    const plugin = await prisma.marketplacePlugin.create({
      data: {
        ...body,
        githubAsset: body.githubAsset ?? null,
        iconUrl: body.iconUrl ?? null,
        tags: body.tags,
        dependencies: body.dependencies,
      },
    });
    return serializeMarketplacePlugin(plugin);
  });

  app.patch('/marketplace/plugins/:pluginId', async (request, reply) => {
    const { pluginId } = request.params as { pluginId: string };
    const body = pluginBody.partial().parse(request.body);

    const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: pluginId } });
    if (!plugin) return reply.status(404).send({ error: 'Not found' });

    if (body.slug && body.slug !== plugin.slug) {
      const clash = await prisma.marketplacePlugin.findUnique({ where: { slug: body.slug } });
      if (clash) return reply.status(409).send({ error: 'Slug already exists' });
    }

    const updated = await prisma.marketplacePlugin.update({
      where: { id: pluginId },
      data: {
        ...body,
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.dependencies !== undefined ? { dependencies: body.dependencies } : {}),
      },
    });
    return serializeMarketplacePlugin(updated);
  });

  app.delete('/marketplace/plugins/:pluginId', async (request, reply) => {
    const { pluginId } = request.params as { pluginId: string };
    const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: pluginId } });
    if (!plugin) return reply.status(404).send({ error: 'Not found' });
    await prisma.marketplacePlugin.delete({ where: { id: pluginId } });
    return { deleted: true };
  });

  app.get('/marketplace/eggs/fivem', async () => {
    const eggs = await prisma.egg.findMany({
      where: { enabled: true },
      select: { id: true, name: true, features: true, dockerImages: true, nest: { select: { name: true } } },
    });
    return eggs.filter((e) => isFiveMEgg(e));
  });
}
