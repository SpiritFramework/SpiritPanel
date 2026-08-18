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
  assertSafeCfgAction,
  assertSafeCfgResource,
  assertSafeGithubName,
  assertSafeMarketplacePath,
} from '../lib/marketplace-safety.js';
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
    const installPath = assertSafeMarketplacePath(suggestInstallPathForRepo(layout, repoName), 'install path');
    const cfgFile = assertSafeMarketplacePath(layout.cfgFile, 'config file');
    const cfgResource = config.cfgResource.trim()
      ? assertSafeCfgResource(config.cfgResource.trim())
      : assertSafeCfgResource(suggestCfgResource(installPath, repoName));
    return {
      layout,
      installPath,
      cfgFile,
      cfgResource,
    };
  }

  const installPath = assertSafeMarketplacePath(config.installPath, 'install path');
  const cfgFile = assertSafeMarketplacePath(
    config.cfgFile.trim().startsWith('/') ? config.cfgFile.trim() : `/${config.cfgFile.trim()}`,
    'config file',
  );
  return {
    layout,
    installPath,
    cfgFile,
    cfgResource: assertSafeCfgResource(config.cfgResource.trim() || suggestCfgResource(installPath, repoName)),
  };
}

export { type FivemServerLayout };

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
  if (check.error === 'plan_denied') {
    throw Object.assign(new Error('Marketplace is not included with this server plan.'), { statusCode: 403 });
  }
  if (check.error === 'forbidden') throw Object.assign(new Error('Permission denied'), { statusCode: 403 });

  const githubOwner = assertSafeGithubName(config.githubOwner, 'GitHub owner');
  const githubRepo = assertSafeGithubName(config.githubRepo, 'GitHub repository');
  const safeConfig = { ...config, githubOwner, githubRepo };

  const wings = wingsForNode(check.server!.node);
  const paths = await resolveGithubInstallPaths(wings, check.server!.uuid, safeConfig.githubRepo, safeConfig);
  const installPath = paths.installPath;
  const cfgFile = paths.cfgFile;
  const cfgResource = assertSafeCfgResource(paths.cfgResource);
  const cfgAction = assertSafeCfgAction(safeConfig.cfgAction);
  const cfgLine = cfgLineFrom(cfgAction, cfgResource);
  const slug = `${githubOwner}-${githubRepo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const existing = await prisma.marketplaceGithubInstall.findUnique({
    where: { serverId_installPath: { serverId, installPath } },
  });
  if (existing) {
    throw Object.assign(new Error('A resource is already installed at this path'), { statusCode: 409 });
  }

  const release = await resolveGithubRelease(
    githubOwner,
    githubRepo,
    safeConfig.githubRef,
    safeConfig.githubAsset ?? null,
    { userId },
  );

  await deployGithubArchive(wings, check.server!.uuid, {
    slug,
    installPath,
    owner: githubOwner,
    repo: githubRepo,
    release,
  }, { userId });

  if (safeConfig.patchCfg) {
    await patchServerCfg(wings, check.server!.uuid, cfgFile, cfgLine, false);
  }

  const record = await prisma.marketplaceGithubInstall.create({
    data: {
      serverId,
      githubOwner,
      githubRepo,
      githubRef: safeConfig.githubRef,
      githubAsset: safeConfig.githubAsset ?? null,
      displayName: safeConfig.displayName.trim() || githubRepo,
      installPath,
      cfgResource,
      cfgAction,
      cfgFile,
      patchCfg: safeConfig.patchCfg,
      installedRef: release.tag,
      cfgLine,
      installedById: userId,
    },
  });

  return serializeGithubInstall(record);
}

export async function uninstallGithubResource(serverId: string, installId: string, userId: string) {
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
        ? 'Marketplace is not included with this server plan.'
        : check.error === 'not_fivem'
          ? 'Marketplace is only available for FiveM servers'
          : 'Not allowed';
    throw Object.assign(new Error(message), { statusCode: status });
  }

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
  if (check.error) {
    const status =
      check.error === 'forbidden' || check.error === 'plan_denied'
        ? 403
        : check.error === 'not_fivem'
          ? 400
          : 404;
    const message =
      check.error === 'plan_denied'
        ? 'Marketplace is not included with this server plan.'
        : check.error === 'not_fivem'
          ? 'Marketplace is only available for FiveM servers'
          : 'Not allowed';
    throw Object.assign(new Error(message), { statusCode: status });
  }

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
