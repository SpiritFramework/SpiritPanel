import type { WingsClient } from './wings-client.js';

/** Bracket folder under `resources/` for Spirit marketplace GitHub installs. */
export const MARKETPLACE_RESOURCES_FOLDER = '[scripts-marketplace]';

export interface FivemServerLayout {
  layout: 'txadmin' | 'flat' | 'unknown';
  resourcesBase: string;
  cfgFile: string;
  profileName: string | null;
  profilePath: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const layoutCache = new Map<string, { expiresAt: number; layout: FivemServerLayout }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function joinPath(parent: string, name: string): string {
  if (parent === '/') return `/${name}`;
  return `${parent}/${name}`;
}

async function hasFile(wings: WingsClient, uuid: string, path: string): Promise<boolean> {
  try {
    await wings.getFileContents(uuid, path);
    return true;
  } catch {
    return false;
  }
}

async function listDir(wings: WingsClient, uuid: string, dir: string) {
  try {
    return await wings.listFiles(uuid, dir);
  } catch {
    return [];
  }
}

function marketplaceResourcesBase(resourcesPath: string): string {
  return joinPath(resourcesPath, MARKETPLACE_RESOURCES_FOLDER);
}

async function scoreProfile(
  wings: WingsClient,
  uuid: string,
  profilePath: string,
): Promise<FivemServerLayout | null> {
  const resourcesPath = joinPath(profilePath, 'resources');
  const resourcesEntries = await listDir(wings, uuid, resourcesPath);
  if (!resourcesEntries.some((e) => e.directory)) return null;

  const resourcesBase = marketplaceResourcesBase(resourcesPath);

  const cfgCandidates = [
    joinPath(profilePath, 'server.cfg'),
    joinPath(profilePath, 'config/server.cfg'),
  ];

  let cfgFile: string | null = null;
  for (const candidate of cfgCandidates) {
    if (await hasFile(wings, uuid, candidate)) {
      cfgFile = candidate;
      break;
    }
  }

  if (!cfgFile) {
    const rootCfg = joinPath(profilePath, 'server.cfg');
    cfgFile = rootCfg;
  }

  const profileName = profilePath.split('/').filter(Boolean).pop() ?? null;
  const hasCfg = await hasFile(wings, uuid, cfgFile);

  return {
    layout: 'txadmin',
    resourcesBase,
    cfgFile,
    profileName,
    profilePath,
    confidence: hasCfg ? 'high' : 'medium',
  };
}

export function suggestInstallPathForRepo(layout: FivemServerLayout, repoName: string): string {
  return joinPath(layout.resourcesBase, repoName);
}

export function suggestCfgResource(installPath: string, repoName: string): string {
  const parts = installPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && !last.startsWith('[')) return last;
  return repoName;
}

export async function detectFivemServerLayout(
  wings: WingsClient,
  serverUuid: string,
): Promise<FivemServerLayout> {
  const cached = layoutCache.get(serverUuid);
  if (cached && cached.expiresAt > Date.now()) return cached.layout;

  const root = await listDir(wings, serverUuid, '/');

  // txAdmin: /txData/<profile>/resources/...
  const txData = root.find((e) => e.directory && e.name.toLowerCase() === 'txdata');
  if (txData) {
    const profiles = await listDir(wings, serverUuid, '/txData');
    const candidates: FivemServerLayout[] = [];

    for (const profile of profiles.filter((e) => e.directory && !e.name.startsWith('.'))) {
      const profilePath = joinPath('/txData', profile.name);
      const scored = await scoreProfile(wings, serverUuid, profilePath);
      if (scored) candidates.push(scored);
    }

    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => {
        const rank = (c: FivemServerLayout) => (c.confidence === 'high' ? 2 : c.confidence === 'medium' ? 1 : 0);
        return rank(b) - rank(a);
      })[0]!;
      layoutCache.set(serverUuid, { expiresAt: Date.now() + CACHE_TTL_MS, layout: best });
      return best;
    }
  }

  // Flat layout: /resources at root
  const flatResources = root.find((e) => e.directory && e.name === 'resources');
  if (flatResources) {
    const resourcesPath = '/resources';
    const resourcesBase = marketplaceResourcesBase(resourcesPath);

    let cfgFile = '/server.cfg';
    if (!(await hasFile(wings, serverUuid, cfgFile))) {
      const alt = root.find((e) => !e.directory && e.name === 'server.cfg');
      if (alt) cfgFile = '/server.cfg';
    }

    const layout: FivemServerLayout = {
      layout: 'flat',
      resourcesBase,
      cfgFile,
      profileName: null,
      profilePath: null,
      confidence: (await hasFile(wings, serverUuid, cfgFile)) ? 'high' : 'medium',
    };
    layoutCache.set(serverUuid, { expiresAt: Date.now() + CACHE_TTL_MS, layout });
    return layout;
  }

  const fallback: FivemServerLayout = {
    layout: 'unknown',
    resourcesBase: marketplaceResourcesBase('/resources'),
    cfgFile: '/server.cfg',
    profileName: null,
    profilePath: null,
    confidence: 'low',
  };
  layoutCache.set(serverUuid, { expiresAt: Date.now() + CACHE_TTL_MS, layout: fallback });
  return fallback;
}
