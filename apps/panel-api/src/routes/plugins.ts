import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, requireAuth, requireSession } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  databaseManagerSettingsSchema,
  fivemMarketplaceSettingsSchema,
  parseFivemMarketplaceSettings,
} from '../plugins/manifests.js';
import {
  getPanelPlugin,
  isPluginEnabled,
  listPanelPlugins,
  updatePanelPlugin,
} from '../plugins/manager.js';
import { PANEL_PLUGIN_IDS } from '@spirit/plugin-sdk';
import { upsertPanelSetting, DEFAULT_MARKETPLACE, DEFAULT_MINECRAFT_PLUGINS } from '../lib/panel-settings.js';
import {
  serializeMarketplacePlugin,
} from '../services/marketplace-installer.js';
import { MarketplaceCategory } from '@prisma/client';

const catalogBodySchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(191),
  description: z.string().max(10000),
  category: z.enum(['library', 'script', 'map', 'vehicle', 'other']),
  tags: z.array(z.string().max(64)).default([]),
  githubOwner: z.string().min(1).max(191),
  githubRepo: z.string().min(1).max(191),
  githubRef: z.string().min(1).max(191).default('latest-release'),
  githubAsset: z.string().max(191).nullable().optional(),
  installPath: z.string().min(1).max(512),
  cfgResource: z.string().min(1).max(191),
  cfgAction: z.enum(['ensure', 'start']).default('ensure'),
  cfgFile: z.string().min(1).max(191).default('/server.cfg'),
  dependencies: z.array(z.string().max(64)).default([]),
  featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  iconUrl: z.string().url().max(512).nullable().optional(),
});

/** Public plugin list for client nav (enabled plugins only). */
export async function clientPluginRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/plugins', async () => {
    const plugins = await listPanelPlugins();
    return {
      plugins: plugins
        .filter((p) => p.enabled && (p.settings as { enabled?: boolean }).enabled !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          version: p.version,
          serverNav: p.manifest.serverNav ?? null,
        })),
    };
  });
}

export async function adminPluginRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/plugins', async () => {
    const plugins = await listPanelPlugins(true);
    const catalogCount = await prisma.marketplacePlugin.count();
    return {
      plugins: plugins.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        author: p.author,
        builtIn: p.builtIn,
        enabled: p.enabled,
        settings: p.settings,
        manifest: p.manifest,
        stats:
          p.id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE
            ? { catalogCount }
            : undefined,
      })),
    };
  });

  app.get('/plugins/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const plugin = await getPanelPlugin(id);
    if (!plugin) return reply.status(404).send({ error: 'Plugin not found' });
    return { plugin };
  });

  app.patch('/plugins/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        enabled: z.boolean().optional(),
        settings: z.record(z.unknown()).optional(),
      })
      .parse(request.body);

    if (id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE && body.settings) {
      const parsed = fivemMarketplaceSettingsSchema.safeParse({
        ...(await getPanelPlugin(id))?.settings,
        ...body.settings,
      });
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid FiveM marketplace settings' });
      }
      body.settings = parsed.data;
      await upsertPanelSetting('marketplace', {
        ...DEFAULT_MARKETPLACE,
        enabled: parsed.data.enabled,
        allowGithubInstalls: parsed.data.allowGithubInstalls,
      });
    }

    if (id === PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE && body.enabled !== undefined) {
      const current = await getPanelPlugin(id);
      const settings = parseFivemMarketplaceSettings(current?.settings);
      await upsertPanelSetting('marketplace', {
        ...DEFAULT_MARKETPLACE,
        enabled: body.enabled,
        allowGithubInstalls: settings.allowGithubInstalls,
      });
    }

    if (id === PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS && body.settings) {
      const minecraftSchema = z.object({
        enabled: z.boolean(),
        allowModrinthInstalls: z.boolean(),
      });
      const parsed = minecraftSchema.safeParse({
        ...(await getPanelPlugin(id))?.settings,
        ...body.settings,
      });
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid Minecraft plugins settings' });
      }
      body.settings = parsed.data;
      await upsertPanelSetting('minecraft_plugins', {
        ...DEFAULT_MINECRAFT_PLUGINS,
        ...parsed.data,
      });
    }

    if (id === PANEL_PLUGIN_IDS.MINECRAFT_PLUGINS && body.enabled !== undefined) {
      const current = await getPanelPlugin(id);
      const settings = (current?.settings ?? {}) as { enabled?: boolean; allowModrinthInstalls?: boolean };
      await upsertPanelSetting('minecraft_plugins', {
        ...DEFAULT_MINECRAFT_PLUGINS,
        enabled: body.enabled,
        allowModrinthInstalls: settings.allowModrinthInstalls !== false,
      });
    }

    if (id === PANEL_PLUGIN_IDS.DATABASE_MANAGER && body.settings) {
      const parsed = databaseManagerSettingsSchema.safeParse({
        ...(await getPanelPlugin(id))?.settings,
        ...body.settings,
      });
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid database manager settings' });
      }
      body.settings = parsed.data;
    }

    try {
      const plugin = await updatePanelPlugin(id, body);
      return { plugin };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      const message = err instanceof Error ? err.message : 'Update failed';
      return reply.status(status).send({ error: message });
    }
  });

  // —— FiveM marketplace catalog CRUD ——

  app.get('/plugins/fivem-marketplace/catalog', async (request, reply) => {
    if (!(await isPluginEnabled(PANEL_PLUGIN_IDS.FIVEM_MARKETPLACE))) {
      return reply.status(403).send({ error: 'FiveM marketplace plugin is disabled' });
    }
    const query = z
      .object({
        q: z.string().optional(),
        category: z.string().optional(),
        includeDisabled: z.coerce.boolean().optional(),
      })
      .parse(request.query);

    const plugins = await prisma.marketplacePlugin.findMany({
      where: {
        ...(query.includeDisabled ? {} : {}),
        ...(query.category ? { category: query.category as MarketplaceCategory } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q } },
                { slug: { contains: query.q } },
                { description: { contains: query.q } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      plugins: plugins.map(serializeMarketplacePlugin),
    };
  });

  app.post('/plugins/fivem-marketplace/catalog', async (request, reply) => {
    const body = catalogBodySchema.parse(request.body);
    const existing = await prisma.marketplacePlugin.findUnique({ where: { slug: body.slug } });
    if (existing) {
      return reply.status(409).send({ error: `Slug "${body.slug}" already exists` });
    }
    const plugin = await prisma.marketplacePlugin.create({
      data: {
        ...body,
        tags: body.tags,
        dependencies: body.dependencies,
        githubAsset: body.githubAsset ?? null,
        iconUrl: body.iconUrl ?? null,
      },
    });
    return reply.status(201).send({ plugin: serializeMarketplacePlugin(plugin) });
  });

  app.patch('/plugins/fivem-marketplace/catalog/:pluginId', async (request, reply) => {
    const { pluginId } = request.params as { pluginId: string };
    const body = catalogBodySchema.partial().parse(request.body);
    const existing = await prisma.marketplacePlugin.findUnique({ where: { id: pluginId } });
    if (!existing) return reply.status(404).send({ error: 'Catalog entry not found' });

    if (body.slug && body.slug !== existing.slug) {
      const clash = await prisma.marketplacePlugin.findUnique({ where: { slug: body.slug } });
      if (clash) return reply.status(409).send({ error: `Slug "${body.slug}" already exists` });
    }

    const plugin = await prisma.marketplacePlugin.update({
      where: { id: pluginId },
      data: {
        ...body,
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.dependencies !== undefined ? { dependencies: body.dependencies } : {}),
      },
    });
    return { plugin: serializeMarketplacePlugin(plugin) };
  });

  app.delete('/plugins/fivem-marketplace/catalog/:pluginId', async (request, reply) => {
    const { pluginId } = request.params as { pluginId: string };
    const installCount = await prisma.marketplaceInstall.count({ where: { pluginId } });
    if (installCount > 0) {
      return reply.status(409).send({
        error: `Cannot delete: ${installCount} server(s) still have this resource installed. Disable it instead.`,
      });
    }
    await prisma.marketplacePlugin.delete({ where: { id: pluginId } });
    return { success: true };
  });
}

export { parseFivemMarketplaceSettings };
