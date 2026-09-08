import { prisma } from '../../lib/prisma.js';
import {
  installMarketplacePlugin,
  serializeMarketplacePlugin,
  uninstallMarketplacePlugin,
  updateMarketplacePlugin,
} from '../../services/marketplace-installer.js';
import {
  findGithubInstallByRepo,
  isGithubInstallsSchemaReady,
  listGithubInstalls,
  withMarketplaceDb,
} from '../../lib/marketplace-db.js';
import { isFivemCatalogInstallsAllowed, isFivemGithubInstallsAllowed } from '../manager.js';
import { getFeaturedFivemScripts, getFeaturedRepoMeta } from '../../services/github-featured.js';
import { resolveGithubRepo, searchGithubRepos } from '../../services/github-repo.js';
import {
  detectFivemServerLayout,
  suggestCfgResource,
  suggestInstallPathForRepo,
  type FivemServerLayout,
} from '../../services/fivem-server-layout.js';
import { wingsForNode } from '../../services/wings-client.js';
import {
  installGithubResource,
  serializeGithubInstall,
  uninstallGithubResource,
  updateGithubResource,
  type GithubInstallConfig,
} from '../../services/marketplace-github-installer.js';
import type { MarketplaceCategory } from '@prisma/client';
import type { FivemRequestContext } from './access.js';
import { getInstalledPluginIds } from './access.js';

const DEFAULT_LAYOUT: FivemServerLayout = {
  layout: 'unknown',
  resourcesPath: '/resources',
  resourcesBase: '/resources',
  cfgFile: '/server.cfg',
  profileName: null,
  profilePath: null,
  confidence: 'low',
};

async function readServerLayout(ctx: FivemRequestContext): Promise<FivemServerLayout> {
  try {
    const wings = wingsForNode(ctx.server.node);
    return await detectFivemServerLayout(wings, ctx.server.uuid);
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export async function getFivemMarketplaceOverview(ctx: FivemRequestContext) {
  const [githubSchemaReady, githubInstallsAllowed, catalogAllowed] = await Promise.all([
    isGithubInstallsSchemaReady(),
    isFivemGithubInstallsAllowed(),
    isFivemCatalogInstallsAllowed(),
  ]);
  const allowGithubInstalls = githubSchemaReady && githubInstallsAllowed;
  const layout = await readServerLayout(ctx);

  return withMarketplaceDb(async () => {
    const [installs, githubInstalls, catalog, catalogCount] = await Promise.all([
      prisma.marketplaceInstall.findMany({
        where: { serverId: ctx.serverId },
        include: { plugin: true },
        orderBy: { installedAt: 'desc' },
      }),
      listGithubInstalls(ctx.serverId),
      catalogAllowed
        ? prisma.marketplacePlugin.findMany({
            where: { enabled: true },
            orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
            take: 12,
          })
        : Promise.resolve([]),
      catalogAllowed ? prisma.marketplacePlugin.count({ where: { enabled: true } }) : Promise.resolve(0),
    ]);

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
    const installedIds = new Set(installs.map((i) => i.pluginId));

    return {
      isFiveM: true,
      layout,
      stats: {
        installedCount: catalogInstalled.length + githubInstalled.length,
        catalogCount,
        catalogInstalledCount: catalogInstalled.length,
        githubInstalledCount: githubInstalled.length,
      },
      features: {
        catalog: catalogAllowed,
        github: allowGithubInstalls,
      },
      featuredCatalog: catalog.map((p) => ({
        ...serializeMarketplacePlugin(p),
        installed: installedIds.has(p.id),
      })),
      installed: [...catalogInstalled, ...githubInstalled].sort(
        (a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime(),
      ),
    };
  });
}

export async function browseFivemCatalog(
  ctx: FivemRequestContext,
  filters: { q?: string; category?: string },
) {
  return withMarketplaceDb(async () => {
    const plugins = await prisma.marketplacePlugin.findMany({
      where: {
        enabled: true,
        ...(filters.category ? { category: filters.category as MarketplaceCategory } : {}),
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q } },
                { slug: { contains: filters.q } },
                { description: { contains: filters.q } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const installedIds = await getInstalledPluginIds(ctx.serverId);
    return {
      plugins: plugins.map((p) => ({
        ...serializeMarketplacePlugin(p),
        installed: installedIds.has(p.id),
      })),
    };
  });
}

export async function getFivemCatalogPluginDetail(ctx: FivemRequestContext, pluginIdOrSlug: string) {
  return withMarketplaceDb(async () => {
    const plugin = await prisma.marketplacePlugin.findFirst({
      where: {
        enabled: true,
        OR: [{ id: pluginIdOrSlug }, { slug: pluginIdOrSlug }],
      },
    });
    if (!plugin) {
      throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
    }

    const installedIds = await getInstalledPluginIds(ctx.serverId);
    const serialized = {
      ...serializeMarketplacePlugin(plugin),
      installed: installedIds.has(plugin.id),
    };

    let github: Awaited<ReturnType<typeof resolveFivemGithubRepo>> | null = null;
    try {
      github = await resolveFivemGithubRepo(ctx, `${plugin.githubOwner}/${plugin.githubRepo}`);
    } catch {
      github = null;
    }

    return { plugin: serialized, github };
  });
}

export async function resolveFivemGithubRepo(ctx: FivemRequestContext, url: string) {
  const layout = await readServerLayout(ctx);
  const resolved = await resolveGithubRepo(url, { userId: ctx.userId });
  const featured = getFeaturedRepoMeta(resolved.owner, resolved.repo);
  const installPath = suggestInstallPathForRepo(layout, resolved.repo);
  const existingInstall = await findGithubInstallByRepo(ctx.serverId, resolved.owner, resolved.repo);

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
}

export {
  installMarketplacePlugin,
  uninstallMarketplacePlugin,
  updateMarketplacePlugin,
  installGithubResource,
  uninstallGithubResource,
  updateGithubResource,
  getFeaturedFivemScripts,
  searchGithubRepos,
  readServerLayout,
  serializeMarketplacePlugin,
};

export type { GithubInstallConfig };
