import { assertSafeServerPath, UnsafeFilePathError } from './file-paths.js';

/** GitHub username / repository name (conservative subset). */
const GITHUB_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

/** FiveM resource names used in server.cfg lines. */
const CFG_RESOURCE_RE = /^[a-zA-Z0-9_\-./[\]]+$/;

const CFG_ACTIONS = new Set(['ensure', 'start']);

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function assertSafeGithubName(name: string, label: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 191 || !GITHUB_NAME_RE.test(trimmed)) {
    throw badRequest(`Invalid ${label}`);
  }
  return trimmed;
}

export function assertSafeCfgResource(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 191) {
    throw badRequest('Invalid resource name');
  }
  if (/[\r\n\x00]/.test(trimmed) || !CFG_RESOURCE_RE.test(trimmed)) {
    throw badRequest('Resource name contains invalid characters');
  }
  return trimmed;
}

export function assertSafeCfgAction(action: string): 'ensure' | 'start' {
  if (!CFG_ACTIONS.has(action)) {
    throw badRequest('Invalid config action');
  }
  return action as 'ensure' | 'start';
}

export function assertSafeMarketplacePath(path: string, label = 'path'): string {
  try {
    return assertSafeServerPath(path, label);
  } catch (err) {
    if (err instanceof UnsafeFilePathError) {
      throw badRequest(err.message);
    }
    throw err;
  }
}

/**
 * Disk uninstall may only delete a single plugin/mod/datapack archive —
 * never a directory root like `/plugins` or nested trees.
 */
export function assertSafeMinecraftPluginDeletePath(path: string): string {
  const installPath = assertSafeMarketplacePath(path, 'install path');
  if (
    /^\/plugins\/[^/]+\.(jar|zip)$/i.test(installPath) ||
    /^\/mods\/[^/]+\.(jar|zip)$/i.test(installPath) ||
    /^\/[^/]+\/datapacks\/[^/]+\.(jar|zip)$/i.test(installPath)
  ) {
    return installPath;
  }
  throw badRequest('Can only remove a single .jar/.zip under plugins/, mods/, or <world>/datapacks/');
}
