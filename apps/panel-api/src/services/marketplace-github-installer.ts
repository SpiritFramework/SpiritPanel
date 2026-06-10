import type { MarketplaceGithubInstall } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { wingsForNode } from './wings-client.js';
import { resolveGithubRelease } from './github-release.js';
import {
  assertFiveMServerAccess,
  deployGithubArchive,
  patchServerCfg,
  removePathIfExists,
  cfgLineFrom,
} from './marketplace-installer.js';
import {
  detectFivemServerLayout,
  suggestCfgResource,
  suggestInstallPathForRepo,
  type FivemServerLayout,
} from './fivem-server-layout.js';

export interface GithubInstallConfig {
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  githubAsset?: string | null;
  displayName: string;
  installPath: string;
  cfgResource: string;
  cfgAction: 'ensure' | 'start';
  cfgFile: string;
  patchCfg: boolean;
  useAutoPaths?: boolean;
}

export async function resolveGithubInstallPaths(
  wings: ReturnType<typeof wingsForNode>,
  serverUuid: string,
  repoName: string,
  config: Pick<GithubInstallConfig, 'installPath' | 'cfgFile' | 'cfgResource' | 'useAutoPaths'>,
) {
  const layout = await detectFivemServerLayout(wings, serverUuid);
  const auto = config.useAutoPaths !== false;

  if (auto && layout.confidence !== 'low') {
    const installPath = suggestInstallPathForRepo(layout, repoName);
    return {
      layout,
      installPath,
      cfgFile: layout.cfgFile,
      cfgResource: config.cfgResource.trim() || suggestCfgResource(installPath, repoName),
    };
  }

  const installPath = validateInstallPath(config.installPath);
  const cfgFile = config.cfgFile.trim().startsWith('/')
    ? config.cfgFile.trim()
    : `/${config.cfgFile.trim()}`;
  return {
    layout,
    installPath,
    cfgFile,
    cfgResource: config.cfgResource.trim() || suggestCfgResource(installPath, repoName),
  };
}

export { type FivemServerLayout };

function validateInstallPath(path: string): string {
  const normalized = path.trim();
  if (!normalized.startsWith('/')) throw new Error('Install path must start with /');
  if (normalized.includes('..')) throw new Error('Install path cannot contain ..');
  if (normalized.length > 512) throw new Error('Install path is too long');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) throw new Error('Install path must include a folder name');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function serializeGithubInstall(install: MarketplaceGithubInstall) {
  return {
    id: install.id,
    source: 'github' as const,
    githubOwner: install.githubOwner,
    githubRepo: install.githubRepo,
    githubRef: install.githubRef,
    githubAsset: install.githubAsset,
    displayName: install.displayName,
    name: install.displayName,
    installPath: install.installPath,
    cfgResource: install.cfgResource,
    cfgAction: install.cfgAction,
    cfgFile: install.cfgFile,
    patchCfg: install.patchCfg,
    installedRef: install.installedRef,
    cfgLine: install.cfgLine,
    installedAt: install.installedAt.toISOString(),
    githubUrl: `https://github.com/${install.githubOwner}/${install.githubRepo}`,
  };
}

export async function installGithubResource(
  serverId: string,
  userId: string,
  config: GithubInstallConfig,
) {
  const check = await assertFiveMServerAccess(serverId, userId);
  if (check.error === 'not_found') throw Object.assign(new Error('Server not found'), { statusCode: 404 });
  if (check.error === 'not_fivem') {
    throw Object.assign(new Error('Marketplace is only available for FiveM servers'), { statusCode: 400 });
  }
  if (check.error === 'forbidden') throw Object.assign(new Error('Permission denied'), { statusCode: 403 });

  const wings = wingsForNode(check.server!.node);
  const paths = await resolveGithubInstallPaths(wings, check.server!.uuid, config.githubRepo, config);
  const installPath = paths.installPath;
  const cfgFile = paths.cfgFile;
  const cfgResource = paths.cfgResource;
  const cfgLine = cfgLineFrom(config.cfgAction, cfgResource);
  const slug = `${config.githubOwner}-${config.githubRepo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const existing = await prisma.marketplaceGithubInstall.findUnique({
    where: { serverId_installPath: { serverId, installPath } },
  });
  if (existing) {
    throw Object.assign(new Error('A resource is already installed at this path'), { statusCode: 409 });
  }

  const release = await resolveGithubRelease(
    config.githubOwner,
    config.githubRepo,
    config.githubRef,
    config.githubAsset ?? null,
    { userId },
  );

  await deployGithubArchive(wings, check.server!.uuid, {
    slug,
    installPath,
    owner: config.githubOwner,
    repo: config.githubRepo,
    release,
  }, { userId });

  if (config.patchCfg) {
    await patchServerCfg(wings, check.server!.uuid, cfgFile, cfgLine, false);
  }

  const record = await prisma.marketplaceGithubInstall.create({
    data: {
      serverId,
      githubOwner: config.githubOwner,
      githubRepo: config.githubRepo,
      githubRef: config.githubRef,
      githubAsset: config.githubAsset ?? null,
      displayName: config.displayName.trim() || config.githubRepo,
      installPath,
      cfgResource,
      cfgAction: config.cfgAction,
      cfgFile,
      patchCfg: config.patchCfg,
      installedRef: release.tag,
      cfgLine,
      installedById: userId,
    },
  });

  return serializeGithubInstall(record);
}

export async function uninstallGithubResource(serverId: string, installId: string, userId: string) {
  const check = await assertFiveMServerAccess(serverId, userId);
  if (check.error) throw Object.assign(new Error('Not allowed'), { statusCode: check.error === 'forbidden' ? 403 : 404 });

  const install = await prisma.marketplaceGithubInstall.findFirst({
    where: { id: installId, serverId },
  });
  if (!install) throw Object.assign(new Error('Not installed'), { statusCode: 404 });

  const wings = wingsForNode(check.server!.node);
  await removePathIfExists(wings, check.server!.uuid, install.installPath);
  if (install.patchCfg) {
    await patchServerCfg(wings, check.server!.uuid, install.cfgFile, install.cfgLine, true);
  }
  await prisma.marketplaceGithubInstall.delete({ where: { id: install.id } });
  return { success: true };
}

export async function updateGithubResource(serverId: string, installId: string, userId: string) {
  const check = await assertFiveMServerAccess(serverId, userId);
  if (check.error) throw Object.assign(new Error('Not allowed'), { statusCode: check.error === 'forbidden' ? 403 : 404 });

  const install = await prisma.marketplaceGithubInstall.findFirst({
    where: { id: installId, serverId },
  });
  if (!install) throw Object.assign(new Error('Not installed'), { statusCode: 404 });

  const wings = wingsForNode(check.server!.node);
  const release = await resolveGithubRelease(
    install.githubOwner,
    install.githubRepo,
    install.githubRef,
    install.githubAsset,
    { userId },
  );

  const slug = `${install.githubOwner}-${install.githubRepo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  await deployGithubArchive(wings, check.server!.uuid, {
    slug,
    installPath: install.installPath,
    owner: install.githubOwner,
    repo: install.githubRepo,
    release,
  }, { userId });

  const updated = await prisma.marketplaceGithubInstall.update({
    where: { id: install.id },
    data: { installedRef: release.tag, installedById: userId },
  });

  return serializeGithubInstall(updated);
}
