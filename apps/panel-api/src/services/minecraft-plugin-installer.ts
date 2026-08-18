import type { MinecraftModrinthInstall } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { assertSafeServerPath, UnsafeFilePathError } from '../lib/file-paths.js';
import {
  isMinecraftEgg,
  parseMinecraftVersionFromVariables,
  resolveMinecraftEggProfile,
  type MinecraftEggProfile,
} from '../lib/minecraft-egg.js';
import { getServerAccess, hasClientPermission } from '../lib/client-server.js';
import { serverInclude } from './server-helpers.js';
import { wingsForNode, type WingsClient } from './wings-client.js';
import { removePathIfExists } from './marketplace-installer.js';
import {
  downloadModrinthFile,
  getModrinthProject,
  getModrinthVersion,
  listModrinthVersions,
  pickPrimaryFile,
  resolveInstallMeta,
  type ModrinthProject,
  type ModrinthVersion,
} from './modrinth.js';

const MAX_DEPENDENCY_DEPTH = 5;
const MAX_DEPENDENCY_INSTALLS = 12;

const installLocks = new Map<string, Promise<unknown>>();

function bad(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode });
}

function normalizePath(path: string): string {
  try {
    return assertSafeServerPath(path.trim() || '/');
  } catch (err) {
    if (err instanceof UnsafeFilePathError) throw bad(400, err.message);
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

function canReadFiles(access: {
  isOwner: boolean;
  permissions: string[];
  isAdminSupport?: boolean;
}): boolean {
  return Boolean(
    access.isAdminSupport || access.isOwner || hasClientPermission(access.permissions, 'file.read'),
  );
}

export async function assertMinecraftServerView(serverId: string, userId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) return { error: 'not_found' as const, server: null, profile: null, canReadFiles: false };

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: serverInclude,
  });
  if (!server) return { error: 'not_found' as const, server: null, profile: null, canReadFiles: false };
  if (!isMinecraftEgg(server.egg)) {
    return { error: 'not_minecraft' as const, server: null, profile: null, canReadFiles: false };
  }
  const isSupport = 'isAdminSupport' in access && access.isAdminSupport;
  if (!server.minecraftPluginsAccess && !isSupport) {
    return { error: 'plan_denied' as const, server: null, profile: null, canReadFiles: false };
  }

  const profile = resolveMinecraftEggProfile(server.egg);
  return {
    error: null,
    server,
    profile,
    canReadFiles: canReadFiles(access),
  };
}

export async function assertMinecraftServerAccess(serverId: string, userId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) return { error: 'not_found' as const, server: null, profile: null };

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: serverInclude,
  });
  if (!server) return { error: 'not_found' as const, server: null, profile: null };
  if (!isMinecraftEgg(server.egg)) {
    return { error: 'not_minecraft' as const, server: null, profile: null };
  }

  const isSupport = 'isAdminSupport' in access && access.isAdminSupport;
  if (!server.minecraftPluginsAccess && !isSupport) {
    return { error: 'plan_denied' as const, server: null, profile: null };
  }

  const canInstall =
    isSupport ||
    access.isOwner ||
    hasClientPermission(access.permissions, 'marketplace.install');

  if (!canInstall) {
    return { error: 'forbidden' as const, server: null, profile: null };
  }

  return { error: null, server, profile: resolveMinecraftEggProfile(server.egg) };
}

export function gameVersionForServer(
  server: {
    variables: Array<{ variableValue: string; eggVariable: { envVariable: string } }>;
  },
): string | null {
  return parseMinecraftVersionFromVariables(server.variables);
}

async function readWorldName(wings: WingsClient, uuid: string): Promise<string> {
  try {
    const content = await wings.getFileContents(uuid, '/server.properties');
    const match = content.match(/^\s*level-name\s*=\s*(.+)\s*$/m);
    const name = match?.[1]?.trim();
    if (name && !/[\\/]/.test(name) && name !== '.' && name !== '..') return name;
  } catch {
    // default
  }
  return 'world';
}

export function serializeMinecraftInstall(install: MinecraftModrinthInstall) {
  return {
    id: install.id,
    source: 'modrinth' as const,
    projectId: install.projectId,
    projectSlug: install.projectSlug,
    versionId: install.versionId,
    versionNumber: install.versionNumber,
    displayName: install.displayName,
    name: install.displayName,
    filename: install.filename,
    installPath: install.installPath,
    installDir: install.installDir,
    projectType: install.projectType,
    iconUrl: install.iconUrl,
    loaders: Array.isArray(install.loaders) ? (install.loaders as string[]) : [],
    installedAt: install.installedAt.toISOString(),
    modrinthUrl: `https://modrinth.com/project/${install.projectSlug || install.projectId}`,
  };
}

async function deployJarOrPack(
  wings: WingsClient,
  uuid: string,
  installPath: string,
  data: Buffer,
) {
  const path = normalizePath(installPath);
  const { parent, name } = parentAndName(path);
  await ensureDirectoryPath(wings, uuid, parent);
  await removePathIfExists(wings, uuid, path);
  const uploadPath = parent === '/' ? `/${name}` : `${parent}/${name}`;
  await wings.uploadFile(uuid, uploadPath, data, 300_000);
}

function assertVersionCompatible(
  version: ModrinthVersion,
  profile: MinecraftEggProfile,
  gameVersion: string | null,
) {
  const profileLoaders = new Set(
    profile.loaders.map((l) => l.toLowerCase()).filter((l) => l !== 'datapack'),
  );
  const versionLoaders = version.loaders.map((l) => l.toLowerCase());
  const allowsDatapack =
    profile.projectTypes.includes('datapack') || profile.loaders.includes('datapack');

  if (profileLoaders.size && versionLoaders.length) {
    const overlaps = versionLoaders.some((l) => profileLoaders.has(l));
    const datapackOk = allowsDatapack && versionLoaders.includes('datapack');
    if (!overlaps && !datapackOk) {
      throw bad(400, 'This version is not compatible with this server’s loaders');
    }
  }

  if (gameVersion && version.gameVersions.length && !version.gameVersions.includes(gameVersion)) {
    throw bad(400, `This version does not support Minecraft ${gameVersion}`);
  }
}

async function resolveCompatibleVersion(
  projectIdOrSlug: string,
  profile: MinecraftEggProfile,
  gameVersion: string | null,
  preferredVersionId?: string | null,
): Promise<ModrinthVersion> {
  if (preferredVersionId) {
    const version = await getModrinthVersion(preferredVersionId);
    assertVersionCompatible(version, profile, gameVersion);
    return version;
  }

  const loaders = profile.loaders.filter((l) => l !== 'datapack');
  const versions = await listModrinthVersions(projectIdOrSlug, {
    loaders: loaders.length ? loaders : undefined,
    gameVersions: gameVersion ? [gameVersion] : undefined,
  });
  if (versions.length) return versions[0]!;

  const unfiltered = await listModrinthVersions(projectIdOrSlug, {
    loaders: loaders.length ? loaders : undefined,
  });
  if (unfiltered.length) return unfiltered[0]!;

  throw bad(400, 'No compatible Modrinth version found for this server');
}

async function withServerInstallLock<T>(serverId: string, fn: () => Promise<T>): Promise<T> {
  const previous = installLocks.get(serverId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(
    () => gate,
    () => gate,
  );
  installLocks.set(serverId, chained);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (installLocks.get(serverId) === chained) installLocks.delete(serverId);
  }
}

export async function installModrinthProject(
  serverId: string,
  userId: string,
  input: {
    projectId: string;
    versionId?: string | null;
    installDependencies?: boolean;
  },
  visiting = new Set<string>(),
  opts: { locked?: boolean; depDepth?: number; depInstalls?: { count: number } } = {},
): Promise<ReturnType<typeof serializeMinecraftInstall>> {
  if (!opts.locked) {
    return withServerInstallLock(serverId, () =>
      installModrinthProject(serverId, userId, input, visiting, {
        ...opts,
        locked: true,
        depDepth: opts.depDepth ?? 0,
        depInstalls: opts.depInstalls ?? { count: 0 },
      }),
    );
  }

  const depDepth = opts.depDepth ?? 0;
  const depInstalls = opts.depInstalls ?? { count: 0 };

  const check = await assertMinecraftServerAccess(serverId, userId);
  if (check.error === 'not_found') throw bad(404, 'Server not found');
  if (check.error === 'not_minecraft') {
    throw bad(400, 'Plugins are only available for Minecraft servers');
  }
  if (check.error === 'plan_denied') {
    throw bad(403, 'Minecraft plugins are not included with this server plan.');
  }
  if (check.error === 'forbidden') throw bad(403, 'Permission denied');

  const server = check.server!;
  const profile = check.profile!;
  const projectKey = input.projectId.trim();
  if (!projectKey) throw bad(400, 'Invalid project');
  if (visiting.has(projectKey) || visiting.has(projectKey.toLowerCase())) {
    const existingCycle = await prisma.minecraftModrinthInstall.findFirst({
      where: {
        serverId,
        OR: [{ projectId: projectKey }, { projectSlug: projectKey }],
      },
    });
    if (existingCycle) return serializeMinecraftInstall(existingCycle);
    throw bad(400, 'Circular plugin dependency detected');
  }
  visiting.add(projectKey);
  visiting.add(projectKey.toLowerCase());

  const project = await getModrinthProject(projectKey);
  visiting.add(project.id);
  visiting.add(project.slug.toLowerCase());

  const gameVersion = gameVersionForServer(server);
  const version = await resolveCompatibleVersion(project.id, profile, gameVersion, input.versionId);
  if (version.projectId !== project.id) {
    throw bad(400, 'Version does not belong to this project');
  }

  const file = pickPrimaryFile(version);
  const wings = wingsForNode(server.node);
  const worldName = await readWorldName(wings, server.uuid);
  const meta = resolveInstallMeta(version, file, worldName);
  const installPath = normalizePath(`${meta.installDir}/${meta.filename}`);

  const existingByProject = await prisma.minecraftModrinthInstall.findUnique({
    where: { serverId_projectId: { serverId, projectId: project.id } },
  });
  const pathOwner = await prisma.minecraftModrinthInstall.findUnique({
    where: { serverId_installPath: { serverId, installPath } },
  });
  if (pathOwner && pathOwner.projectId !== project.id) {
    throw bad(409, `Another plugin already uses ${installPath}`);
  }

  if (input.installDependencies !== false) {
    const required = version.dependencies.filter(
      (d) => d.dependencyType === 'required' && d.projectId,
    );
    for (const dep of required) {
      const already = await prisma.minecraftModrinthInstall.findUnique({
        where: { serverId_projectId: { serverId, projectId: dep.projectId! } },
      });
      if (already) continue;

      if (depDepth >= MAX_DEPENDENCY_DEPTH) {
        throw bad(400, `Dependency tree is too deep (max ${MAX_DEPENDENCY_DEPTH})`);
      }
      if (depInstalls.count >= MAX_DEPENDENCY_INSTALLS) {
        throw bad(400, `Too many required dependencies (max ${MAX_DEPENDENCY_INSTALLS})`);
      }
      depInstalls.count += 1;

      try {
        await installModrinthProject(
          serverId,
          userId,
          {
            projectId: dep.projectId!,
            versionId: dep.versionId,
            installDependencies: true,
          },
          visiting,
          { locked: true, depDepth: depDepth + 1, depInstalls },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status && status < 500) {
          throw bad(
            400,
            `Required dependency failed (${dep.projectId}): ${err instanceof Error ? err.message : 'error'}`,
          );
        }
        throw err;
      }
    }
  }

  if (existingByProject && existingByProject.installPath !== installPath) {
    await removePathIfExists(wings, server.uuid, existingByProject.installPath);
  }

  const bytes = await downloadModrinthFile(file.url, file.hashes);
  await deployJarOrPack(wings, server.uuid, installPath, bytes);

  const record = await prisma.minecraftModrinthInstall.upsert({
    where: { serverId_projectId: { serverId, projectId: project.id } },
    create: {
      serverId,
      projectId: project.id,
      projectSlug: project.slug,
      versionId: version.id,
      versionNumber: version.versionNumber,
      displayName: project.title,
      filename: meta.filename,
      installPath,
      installDir: meta.installDir,
      projectType: project.projectType,
      iconUrl: project.iconUrl,
      loaders: version.loaders,
      installedById: userId,
    },
    update: {
      projectSlug: project.slug,
      versionId: version.id,
      versionNumber: version.versionNumber,
      displayName: project.title,
      filename: meta.filename,
      installPath,
      installDir: meta.installDir,
      projectType: project.projectType,
      iconUrl: project.iconUrl,
      loaders: version.loaders,
      installedById: userId,
    },
  });

  return serializeMinecraftInstall(record);
}

export async function uninstallModrinthProject(serverId: string, installId: string, userId: string) {
  const check = await assertMinecraftServerAccess(serverId, userId);
  if (check.error === 'not_found') throw bad(404, 'Server not found');
  if (check.error === 'not_minecraft') throw bad(400, 'Not a Minecraft server');
  if (check.error === 'plan_denied') {
    throw bad(403, 'Minecraft plugins are not included with this server plan.');
  }
  if (check.error === 'forbidden') throw bad(403, 'Permission denied');

  const install = await prisma.minecraftModrinthInstall.findFirst({
    where: { id: installId, serverId },
  });
  if (!install) throw bad(404, 'Not installed');

  const wings = wingsForNode(check.server!.node);
  await removePathIfExists(wings, check.server!.uuid, install.installPath);
  await prisma.minecraftModrinthInstall.delete({ where: { id: install.id } });
  return { success: true };
}

export async function updateModrinthProject(serverId: string, installId: string, userId: string) {
  const check = await assertMinecraftServerAccess(serverId, userId);
  if (check.error === 'not_found') throw bad(404, 'Server not found');
  if (check.error === 'not_minecraft') throw bad(400, 'Not a Minecraft server');
  if (check.error === 'plan_denied') {
    throw bad(403, 'Minecraft plugins are not included with this server plan.');
  }
  if (check.error === 'forbidden') throw bad(403, 'Permission denied');

  const install = await prisma.minecraftModrinthInstall.findFirst({
    where: { id: installId, serverId },
  });
  if (!install) throw bad(404, 'Not installed');

  return installModrinthProject(serverId, userId, {
    projectId: install.projectId,
    versionId: null,
    installDependencies: false,
  });
}

export async function checkModrinthUpdates(
  serverId: string,
  installs: MinecraftModrinthInstall[],
  profile: MinecraftEggProfile,
  gameVersion: string | null,
) {
  void serverId;
  const updates: Record<string, { latestVersionId: string; latestVersionNumber: string }> = {};
  // Bound concurrency to avoid stampedes against Modrinth on large installs lists.
  const queue = [...installs];
  const workers = Array.from({ length: Math.min(4, queue.length || 1) }, async () => {
    while (queue.length) {
      const install = queue.shift();
      if (!install) return;
      try {
        const latest = await resolveCompatibleVersion(install.projectId, profile, gameVersion, null);
        if (latest.id !== install.versionId) {
          updates[install.id] = {
            latestVersionId: latest.id,
            latestVersionNumber: latest.versionNumber,
          };
        }
      } catch {
        // ignore per-install failures
      }
    }
  });
  if (installs.length) await Promise.all(workers);
  return updates;
}

export type { ModrinthProject, MinecraftEggProfile };
