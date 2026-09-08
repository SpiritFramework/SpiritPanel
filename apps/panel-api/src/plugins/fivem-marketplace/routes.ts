import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireSession } from '../../middleware/auth.js';
import { logServerActivity } from '../../lib/client-server.js';
import { prisma } from '../../lib/prisma.js';
import { EXPENSIVE_ROUTE_RATE_LIMIT } from '../../lib/rate-limits.js';
import { sendClientError } from '../../lib/safe-errors.js';
import { httpStatusFromUnknown } from '../../lib/github-errors.js';
import {
  assertCatalogFeatureEnabled,
  assertGithubFeatureEnabled,
  fivemErrorReply,
  requireFivemMarketplaceContext,
} from './access.js';
import {
  browseFivemCatalog,
  getFeaturedFivemScripts,
  getFivemCatalogPluginDetail,
  getFivemMarketplaceOverview,
  installGithubResource,
  installMarketplacePlugin,
  readServerLayout,
  resolveFivemGithubRepo,
  searchGithubRepos,
  uninstallGithubResource,
  uninstallMarketplacePlugin,
  updateGithubResource,
  updateMarketplacePlugin,
} from './service.js';

function clientError(
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
  useAutoPaths: z.boolean().default(false),
});

/** Client-facing FiveM marketplace routes (mounted at /api/client/servers/:id/marketplace). */
export async function fivemMarketplaceClientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      return await getFivemMarketplaceOverview(ctx);
    } catch (err) {
      request.log.error({ err }, 'FiveM marketplace overview failed');
      return clientError(reply, err, request.log);
    }
  });

  app.get('/layout', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertGithubFeatureEnabled(ctx, reply))) return;
      const layout = await readServerLayout(ctx);
      return { layout };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.get('/catalog', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertCatalogFeatureEnabled(ctx, reply))) return;
      const query = z.object({ q: z.string().optional(), category: z.string().optional() }).parse(request.query);
      return await browseFivemCatalog(ctx, query);
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.get('/catalog/:pluginId', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertCatalogFeatureEnabled(ctx, reply))) return;
      const { pluginId } = z.object({ pluginId: z.string().min(1) }).parse(request.params);
      return await getFivemCatalogPluginDetail(ctx, pluginId);
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.post('/install', { config: EXPENSIVE_ROUTE_RATE_LIMIT }, async (request, reply) => {
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      if (!(await assertCatalogFeatureEnabled(ctx, reply))) return;
      const install = await installMarketplacePlugin(ctx.serverId, body.pluginId, ctx.userId);
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await logServerActivity(request, {
        serverId: ctx.serverId,
        event: 'server.marketplace.install',
        description: `${request.user!.username} installed ${plugin?.name ?? 'resource'} from catalog`,
        properties: { pluginId: body.pluginId },
      });
      return { success: true, install };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.post('/uninstall', async (request, reply) => {
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await uninstallMarketplacePlugin(ctx.serverId, body.pluginId, ctx.userId);
      await logServerActivity(request, {
        serverId: ctx.serverId,
        event: 'server.marketplace.uninstall',
        description: `${request.user!.username} removed ${plugin?.name ?? 'resource'}`,
        properties: { pluginId: body.pluginId },
      });
      return { success: true };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.post('/update', async (request, reply) => {
    const body = z.object({ pluginId: z.string().min(1) }).parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      const install = await updateMarketplacePlugin(ctx.serverId, body.pluginId, ctx.userId);
      const plugin = await prisma.marketplacePlugin.findUnique({ where: { id: body.pluginId } });
      await logServerActivity(request, {
        serverId: ctx.serverId,
        event: 'server.marketplace.update',
        description: `${request.user!.username} updated ${plugin?.name ?? 'resource'}`,
        properties: { pluginId: body.pluginId },
      });
      return { success: true, install };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.get('/github/resolve', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertGithubFeatureEnabled(ctx, reply))) return;
      const { url } = z.object({ url: z.string().min(1) }).parse(request.query);
      return await resolveFivemGithubRepo(ctx, url);
    } catch (err) {
      const statusCode = httpStatusFromUnknown(err, 400);
      const message = err instanceof Error ? err.message : 'Could not resolve repository';
      return reply.status(statusCode >= 400 && statusCode < 600 ? statusCode : 400).send({ error: message });
    }
  });

  app.get('/github/search', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertGithubFeatureEnabled(ctx, reply))) return;
      const query = z
        .object({
          q: z.string().default(''),
          page: z.coerce.number().int().min(1).max(10).default(1),
          sort: z.enum(['best', 'stars', 'forks', 'updated', 'pushed']).default('best'),
        })
        .parse(request.query);
      return await searchGithubRepos(query.q, query.page, { userId: ctx.userId }, query.sort);
    } catch (err) {
      const statusCode = httpStatusFromUnknown(err, 400);
      return reply.status(statusCode >= 400 && statusCode < 600 ? statusCode : 400).send({
        error: err instanceof Error ? err.message : 'Search failed',
      });
    }
  });

  app.get('/github/featured', async (request, reply) => {
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'view');
      if (!ctx) return;
      if (!(await assertGithubFeatureEnabled(ctx, reply))) return;
      const featured = await getFeaturedFivemScripts({ userId: ctx.userId });
      return { featured };
    } catch (err) {
      return reply.status(500).send({ error: err instanceof Error ? err.message : 'Failed to load featured scripts' });
    }
  });

  app.post('/github/install', { config: EXPENSIVE_ROUTE_RATE_LIMIT }, async (request, reply) => {
    const body = githubInstallBody.parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      if (!(await assertGithubFeatureEnabled(ctx, reply))) return;
      const install = await installGithubResource(ctx.serverId, ctx.userId, {
        ...body,
        displayName: body.displayName ?? body.githubRepo,
        githubAsset: body.githubAsset ?? null,
        useAutoPaths: body.useAutoPaths,
      });
      await logServerActivity(request, {
        serverId: ctx.serverId,
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
      return clientError(reply, err, request.log);
    }
  });

  app.post('/github/uninstall', async (request, reply) => {
    const body = z.object({ installId: z.string().min(1) }).parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      const existing = await prisma.marketplaceGithubInstall.findFirst({
        where: { id: body.installId, serverId: ctx.serverId },
      });
      await uninstallGithubResource(ctx.serverId, body.installId, ctx.userId);
      await logServerActivity(request, {
        serverId: ctx.serverId,
        event: 'server.marketplace.github.uninstall',
        description: `${request.user!.username} removed ${existing?.displayName ?? 'GitHub resource'}`,
        properties: { installId: body.installId },
      });
      return { success: true };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });

  app.post('/github/update', { config: EXPENSIVE_ROUTE_RATE_LIMIT }, async (request, reply) => {
    const body = z.object({ installId: z.string().min(1) }).parse(request.body);
    try {
      const ctx = await requireFivemMarketplaceContext(request, reply, 'install');
      if (!ctx) return;
      const install = await updateGithubResource(ctx.serverId, body.installId, ctx.userId);
      await logServerActivity(request, {
        serverId: ctx.serverId,
        event: 'server.marketplace.github.update',
        description: `${request.user!.username} updated ${install.displayName}`,
        properties: { installId: body.installId },
      });
      return { success: true, install };
    } catch (err) {
      return clientError(reply, err, request.log);
    }
  });
}

/** Legacy export — admin catalog CRUD lives in routes/plugins.ts */
export async function adminMarketplaceRoutes(_app: FastifyInstance) {}
