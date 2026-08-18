import type { MarketplacePlugin } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { isFiveMEgg } from '../lib/fivem-egg.js';
import { assertSafeServerPath, UnsafeFilePathError } from '../lib/file-paths.js';
import {
  assertSafeCfgResource,
} from '../lib/marketplace-safety.js';
import { wingsForNode, type WingsClient } from './wings-client.js';
import { downloadGithubArchive, resolveGithubRelease } from './github-release.js';
import type { GithubAuthContext } from '../lib/github-auth.js';
import { serverInclude } from './server-helpers.js';
import { getServerAccess, hasClientPermission } from '../lib/client-server.js';

export const MARKETPLACE_CFG_MARKER = '### Spirit Marketplace — auto-managed ###';

function normalizePath(path: string): string {
  try {
    return assertSafeServerPath(path.trim() || '/');
  } catch (err) {
    if (err instanceof UnsafeFilePathError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

function parentAndName(fullPath: string): { parent: string; name: string } {
  const normalized = normalizePath(fullPath);
  const parts = normalized.split('/').filter(Boolean);
  const name = parts.pop()!;
  const parent = parts.length ? `/${parts.join('/')}` : '/';
  return { parent, name };
}

export function cfgLineFrom(cfgAction: string, cfgResource: string): string {
  const action = cfgAction === 'start' ? 'start' : 'ensure';
  const resource = assertSafeCfgResource(cfgResource);
  return `${action} ${resource}`;
}

export function cfgLineFor(plugin: Pick<MarketplacePlugin, 'cfgAction' | 'cfgResource'>): string {
  return cfgLineFrom(plugin.cfgAction, plugin.cfgResource);
}

export function parseDependencySlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

export async function assertFiveMServerView(serverId: string, userId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) return { error: 'not_found' as const, server: null };

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: serverInclude,
  });
  if (!server) return { error: 'not_found' as const, server: null };
  if (!isFiveMEgg(server.egg)) return { error: 'not_fivem' as const, server: null };
  const isSupport = 'isAdminSupport' in access && access.isAdminSupport;
  if (!server.fivemMarketplaceAccess && !isSupport) {
    return { error: 'plan_denied' as const, server: null };
  }

  return { error: null, server };
}

export async function assertFiveMServerAccess(serverId: string, userId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) return { error: 'not_found' as const, server: null };

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: serverInclude,
  });
  if (!server) return { error: 'not_found' as const, server: null };
  if (!isFiveMEgg(server.egg)) return { error: 'not_fivem' as const, server: null };

  const isSupport = 'isAdminSupport' in access && access.isAdminSupport;
  if (!server.fivemMarketplaceAccess && !isSupport) {
    return { error: 'plan_denied' as const, server: null };
  }

  const canInstall =
    isSupport ||
    access.isOwner ||
    hasClientPermission(access.permissions, 'marketplace.install');

  if (!canInstall) {
    return { error: 'forbidden' as const, server: null };
  }

  return { error: null, server };
}

async function ensureDirectoryPath(wings: WingsClient, uuid: string, dirPath: string) {
  const normalized = normalizePath(dirPath);
  if (normalized === '/') return;

  const parts = normalized.split('/').filter(Boolean);
  let current = '/';
  for (const part of parts) {
    const entries = await wings.listFiles(uuid, current);
    const exists = entries.some((e) => e.name === part && e.directory);
    if (!exists) {
      await wings.createDirectory(uuid, current, part);
    }
    current = current === '/' ? `/${part}` : `${current}/${part}`;
  }
}

export async function removePathIfExists(wings: WingsClient, uuid: string, fullPath: string) {
  const { parent, name } = parentAndName(fullPath);
  const entries = await wings.listFiles(uuid, parent);
  if (entries.some((e) => e.name === name)) {
    await wings.deleteFiles(uuid, parent, [name]);
  }
}

async function dirHasResourceManifest(wings: WingsClient, uuid: string, dirPath: string): Promise<boolean> {
  const entries = await wings.listFiles(uuid, dirPath);
  return entries.some((e) => e.name === 'fxmanifest.lua' || e.name === '__resource.lua');
}

async function reconcileExtractedFolder(
  wings: WingsClient,
  uuid: string,
  parent: string,
  folderName: string,
  predictedArchiveName: string,
) {
  const entries = await wings.listFiles(uuid, parent);
  if (entries.some((e) => e.name === folderName && e.directory)) return;

  const predicted = entries.find((e) => e.name === predictedArchiveName && e.directory);
  if (predicted) {
    await wings.renameFiles(uuid, parent, [{ from: predicted.name, to: folderName }]);
    return;
  }

  const candidates = entries.filter(
    (e) => e.directory && !e.name.startsWith('.') && !e.name.endsWith('.zip') && e.name !== folderName,
  );

  for (const candidate of candidates) {
    const candidatePath = parent === '/' ? `/${candidate.name}` : `${parent}/${candidate.name}`;
    if (await dirHasResourceManifest(wings, uuid, candidatePath)) {
      await wings.renameFiles(uuid, parent, [{ from: candidate.name, to: folderName }]);
      return;
    }
  }

  if (candidates.length === 1) {
    await wings.renameFiles(uuid, parent, [{ from: candidates[0]!.name, to: folderName }]);
    return;
  }

  const names = candidates.map((c) => c.name).join(', ') || '(none)';
  throw new Error(
    `Could not locate extracted resource folder (found: ${names}). Check the install path points to an existing resources folder.`,
  );
}

export async function patchServerCfg(
  wings: WingsClient,
  uuid: string,
  cfgFile: string,
  cfgLine: string,
  remove = false,
) {
  const file = normalizePath(cfgFile);
  let content: string;
  try {
    content = await wings.getFileContents(uuid, file);
  } catch {
    content = '';
  }

  const lines = content.split(/\r?\n/);
  const markerIndex = lines.findIndex((l) => l.includes('Spirit Marketplace'));

  if (remove) {
    const without = lines.filter((l) => l.trim() !== cfgLine);
    const remainingManaged = without.filter(
      (l, i) =>
        markerIndex !== -1 &&
        i > without.findIndex((x) => x.includes('Spirit Marketplace')) &&
        (l.trim().startsWith('ensure ') || l.trim().startsWith('start ')),
    );
    const nextLines =
      remainingManaged.length === 0
        ? without.filter((l) => !l.includes('Spirit Marketplace'))
        : without;
    const next = nextLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
    await wings.writeFile(uuid, file, next ? `${next}\n` : '');
    return;
  }

  if (lines.some((l) => l.trim() === cfgLine)) return;

  if (markerIndex === -1) {
    const block: string[] = [];
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') block.push('');
    block.push(MARKETPLACE_CFG_MARKER);
    block.push(cfgLine);
    const next = [...lines, ...block].join('\n').trimEnd();
    await wings.writeFile(uuid, file, `${next}\n`);
    return;
  }

  const nextLines = [...lines];
  nextLines.splice(markerIndex + 1, 0, cfgLine);
  await wings.writeFile(uuid, file, `${nextLines.join('\n').trimEnd()}\n`);
}

export async function deployGithubArchive(
  wings: WingsClient,
  serverUuid: string,
  target: {
    slug: string;
    installPath: string;
    owner: string;
    repo: string;
    release: Awaited<ReturnType<typeof resolveGithubRelease>>;
  },
  ctx?: GithubAuthContext,
) {
  const installPath = normalizePath(target.installPath);
  const { parent, name: folderName } = parentAndName(installPath);
  const zipName = `.spirit-dl-${target.slug}.zip`;
  const zipPath = parent === '/' ? `/${zipName}` : `${parent}/${zipName}`;

  await ensureDirectoryPath(wings, serverUuid, parent);
  await removePathIfExists(wings, serverUuid, installPath);

  const archive = await downloadGithubArchive(target.release.downloadUrl, ctx);
  await wings.uploadFile(serverUuid, zipPath, archive, 300_000);
  await wings.decompressFile(serverUuid, parent, zipName);
  await reconcileExtractedFolder(wings, serverUuid, parent, folderName, target.release.archiveFolderName);

  try {
    await wings.deleteFiles(serverUuid, parent, [zipName]);
  } catch {
    // non-fatal
  }
}

async function deployPluginFiles(
  wings: WingsClient,
  serverUuid: string,
  plugin: MarketplacePlugin,
  release: Awaited<ReturnType<typeof resolveGithubRelease>>,
  ctx?: GithubAuthContext,
) {
  await deployGithubArchive(wings, serverUuid, {
    slug: plugin.slug,
    installPath: plugin.installPath,
    owner: plugin.githubOwner,
    repo: plugin.githubRepo,
    release,
  }, ctx);
}

async function loadPluginMap() {
  const plugins = await prisma.marketplacePlugin.findMany({ where: { enabled: true } });
  return new Map(plugins.map((p) => [p.slug, p]));
}

async function installSinglePlugin(
  server: Awaited<ReturnType<typeof assertFiveMServerAccess>>['server'] & object,
  plugin: MarketplacePlugin,
  userId: string,
  pluginBySlug: Map<string, MarketplacePlugin>,
  visiting: Set<string>,
) {
  if (visiting.has(plugin.slug)) {
    throw new Error(`Circular dependency: ${plugin.slug}`);
  }
  visiting.add(plugin.slug);

  for (const depSlug of parseDependencySlugs(plugin.dependencies)) {
    const dep = pluginBySlug.get(depSlug);
    if (!dep) throw new Error(`Unknown dependency: ${depSlug}`);
    const installed = await prisma.marketplaceInstall.findUnique({
      where: { serverId_pluginId: { serverId: server.id, pluginId: dep.id } },
    });
    if (!installed) {
      await installSinglePlugin(server, dep, userId, pluginBySlug, visiting);
    }
  }

  const wings = wingsForNode(server.node);
  const release = await resolveGithubRelease(
    plugin.githubOwner,
    plugin.githubRepo,
    plugin.githubRef,
    plugin.githubAsset,
    { userId },
  );

  await deployPluginFiles(wings, server.uuid, plugin, release, { userId });

  const line = cfgLineFor(plugin);
  const cfgFile = normalizePath(plugin.cfgFile);
  await patchServerCfg(wings, server.uuid, cfgFile, line, false);

  await prisma.marketplaceInstall.upsert({
    where: { serverId_pluginId: { serverId: server.id, pluginId: plugin.id } },
    create: {
      serverId: server.id,
      pluginId: plugin.id,
      installedRef: release.tag,
      installPath: normalizePath(plugin.installPath),
      cfgLine: line,
      cfgFile,
      installedById: userId,
    },
    update: {
      installedRef: release.tag,
      installPath: normalizePath(plugin.installPath),
      cfgLine: line,
      cfgFile,
      installedById: userId,
    },
  });
}

export async function installMarketplacePlugin(serverId: string, pluginId: string, userId: string) {
  const check = await assertFiveMServerAccess(serverId, userId);
  if (check.error === 'not_found') throw Object.assign(new Error('Server not found'), { statusCode: 404 });
  if (check.error === 'not_fivem') throw Object.assign(new Error('Marketplace is only available for FiveM servers'), { statusCode: 400 });
  if (check.error === 'plan_denied') {
    throw Object.assign(new Error('FiveM marketplace is not included with this server plan.'), { statusCode: 403 });
  }
  if (check.error === 'forbidden') throw Object.assign(new Error('Permission denied'), { statusCode: 403 });

  const plugin = await prisma.marketplacePlugin.findFirst({ where: { id: pluginId, enabled: true } });
  if (!plugin) throw Object.assign(new Error('Plugin not found'), { statusCode: 404 });

  const pluginBySlug = await loadPluginMap();
  await installSinglePlugin(check.server!, plugin, userId, pluginBySlug, new Set());

  return prisma.marketplaceInstall.findUnique({
    where: { serverId_pluginId: { serverId, pluginId } },
    include: { plugin: true },
  });
}

export async function uninstallMarketplacePlugin(serverId: string, pluginId: string, userId: string) {
  const check = await assertFiveMServerAccess(serverId, userId);
  if (check.error) {
    const status =
      check.error === 'forbidden' || check.error === 'plan_denied'
        ? 403
        : check.error === 'not_fivem'
          ? 400
          : 404;
    const message =
      check.error === 'plan_denied'
        ? 'FiveM marketplace is not included with this server plan.'
        : check.error === 'not_fivem'
          ? 'Marketplace is only available for FiveM servers'
          : check.error === 'forbidden'
            ? 'Permission denied'
            : 'Not allowed';
    throw Object.assign(new Error(message), { statusCode: status });
  }
  const install = await prisma.marketplaceInstall.findUnique({
    where: { serverId_pluginId: { serverId, pluginId } },
    include: { plugin: true },
  });
  if (!install) throw Object.assign(new Error('Not installed'), { statusCode: 404 });

  const wings = wingsForNode(check.server!.node);
  await removePathIfExists(wings, check.server!.uuid, install.installPath);
  await patchServerCfg(wings, check.server!.uuid, install.cfgFile, install.cfgLine, true);
  await prisma.marketplaceInstall.delete({ where: { id: install.id } });
  return { success: true };
}

export async function updateMarketplacePlugin(serverId: string, pluginId: string, userId: string) {
  await uninstallMarketplacePlugin(serverId, pluginId, userId);
  return installMarketplacePlugin(serverId, pluginId, userId);
}

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export function serializeMarketplacePlugin(plugin: MarketplacePlugin) {
  return {
    id: plugin.id,
    slug: plugin.slug,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category,
    tags: parseTags(plugin.tags),
    githubOwner: plugin.githubOwner,
    githubRepo: plugin.githubRepo,
    githubRef: plugin.githubRef,
    installPath: plugin.installPath,
    cfgResource: plugin.cfgResource,
    dependencies: parseDependencySlugs(plugin.dependencies),
    featured: plugin.featured,
    enabled: plugin.enabled,
    sortOrder: plugin.sortOrder,
    iconUrl: plugin.iconUrl,
    githubUrl: `https://github.com/${plugin.githubOwner}/${plugin.githubRepo}`,
  };
}
