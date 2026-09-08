import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSession } from '../middleware/auth.js';
import { logServerActivity } from '../lib/client-server.js';
import {
  isMinecraftModrinthInstallsAllowed,
  isMinecraftPluginsActive,
} from '../plugins/manager.js';
import { EXPENSIVE_ROUTE_RATE_LIMIT } from '../lib/rate-limits.js';
import { sendClientError } from '../lib/safe-errors.js';
import {
  getModrinthProject,
  listModrinthVersions,
  searchModrinthProjects,
} from '../services/modrinth.js';
import {
  assertMinecraftServerAccess,
  assertMinecraftServerView,
  checkModrinthUpdates,
  gameVersionForServer,
  installModrinthProject,
  serializeMinecraftInstall,
  uninstallModrinthProject,
  updateModrinthProject,
} from '../services/minecraft-plugin-installer.js';
import { scanAndRecognizePlugins, scanMinecraftPluginFiles } from '../services/minecraft-plugin-scan.js';
import { removePathIfExists } from '../services/marketplace-installer.js';
import { wingsForNode } from '../services/wings-client.js';
import { assertSafeMinecraftPluginDeletePath } from '../lib/marketplace-safety.js';

function pluginsError(
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

async function assertFeatureEnabled() {
  if (!(await isMinecraftPluginsActive())) {
    throw Object.assign(new Error('Minecraft plugins are disabled on this panel'), { statusCode: 403 });
  }
}

export async function minecraftPluginRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSession);

  app.get('/servers/:id/plugins', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      const { id } = request.params as { id: string };
      const check = await assertMinecraftServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_minecraft') {
        return reply.status(400).send({ error: 'Plugins are only available for Minecraft servers' });
      }
      if (check.error === 'plan_denied') {
        return reply.status(403).send({ error: 'Minecraft plugins are not included with this server plan.' });
      }

      const allowModrinthInstalls = await isMinecraftModrinthInstallsAllowed();
      const installs = await prisma.minecraftModrinthInstall.findMany({
        where: { serverId: id },
        orderBy: { installedAt: 'desc' },
      });
      const gameVersion = gameVersionForServer(check.server!);
      const updates = await checkModrinthUpdates(id, installs, check.profile!, gameVersion);

      // Hashing / listing plugin JARs requires file.read — never download bodies for console-only users.
      const scan = check.canReadFiles
        ? await scanAndRecognizePlugins(
            check.server!.node,
            check.server!.uuid,
            check.profile!,
            installs.map((i) => i.installPath),
          )
        : {
            filenames: [] as string[],
            paths: [] as string[],
            recognized: [] as Awaited<ReturnType<typeof scanAndRecognizePlugins>>['recognized'],
            unmatched: [] as Awaited<ReturnType<typeof scanAndRecognizePlugins>>['unmatched'],
          };

      const diskPaths = new Set(scan.paths);
      const tracked = installs.map((i) => ({
        ...serializeMinecraftInstall(i),
        source: 'modrinth' as const,
        onDisk: check.canReadFiles
          ? diskPaths.has(i.installPath.startsWith('/') ? i.installPath : `/${i.installPath}`)
          : undefined,
        updateAvailable: updates[i.id] ?? null,
      }));

      const recognized = scan.recognized.map((r) => ({
        id: `disk:${r.installPath}`,
        source: 'disk' as const,
        projectId: r.projectId,
        projectSlug: r.projectSlug,
        versionId: r.versionId,
        versionNumber: r.versionNumber ?? 'on disk',
        displayName: r.displayName,
        name: r.displayName,
        filename: r.filename,
        installPath: r.installPath,
        installDir: r.installDir,
        projectType: r.kind,
        iconUrl: r.iconUrl,
        loaders: [] as string[],
        installedAt: null as string | null,
        modrinthUrl: r.modrinthUrl,
        onDisk: true,
        recognized: true,
        updateAvailable: null,
      }));

      const unmatched = scan.unmatched.map((f) => ({
        id: `disk:${f.installPath}`,
        source: 'disk' as const,
        projectId: null as string | null,
        projectSlug: null as string | null,
        versionId: null as string | null,
        versionNumber: 'on disk',
        displayName: f.filename.replace(/\.(jar|zip)$/i, ''),
        name: f.filename.replace(/\.(jar|zip)$/i, ''),
        filename: f.filename,
        installPath: f.installPath,
        installDir: f.installDir,
        projectType: f.kind,
        iconUrl: null as string | null,
        loaders: [] as string[],
        installedAt: null as string | null,
        modrinthUrl: null as string | null,
        onDisk: true,
        recognized: false,
        updateAvailable: null,
      }));

      const installedProjectIds = [
        ...tracked.map((t) => t.projectId),
        ...recognized.map((r) => r.projectId),
      ].filter(Boolean);

      return {
        isMinecraft: true,
        allowModrinthInstalls,
        canScanDisk: check.canReadFiles,
        platformLabel: check.profile!.platformLabel,
        kind: check.profile!.kind,
        loaders: check.profile!.loaders,
        projectTypes: check.profile!.projectTypes,
        gameVersion,
        diskFilenames: scan.filenames,
        diskPaths: scan.paths,
        installedProjectIds,
        installed: [...tracked, ...recognized, ...unmatched].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        ),
      };
    } catch (err) {
      request.log.error({ err }, 'Minecraft plugins catalog load failed');
      return pluginsError(reply, err, request.log);
    }
  });

  app.get('/servers/:id/plugins/search', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      if (!(await isMinecraftModrinthInstallsAllowed())) {
        return reply.status(403).send({ error: 'Modrinth installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const query = z
        .object({
          q: z.string().max(120).optional().default(''),
          offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
          limit: z.coerce.number().int().min(1).max(50).optional().default(24),
          index: z.enum(['relevance', 'downloads', 'follows', 'newest', 'updated']).optional(),
          category: z.string().max(40).optional().default(''),
        })
        .parse(request.query);

      const check = await assertMinecraftServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_minecraft') {
        return reply.status(400).send({ error: 'Plugins are only available for Minecraft servers' });
      }
      if (check.error === 'plan_denied') {
        return reply.status(403).send({ error: 'Minecraft plugins are not included with this server plan.' });
      }

      const gameVersion = gameVersionForServer(check.server!);
      const page = await searchModrinthProjects({
        query: query.q,
        profile: check.profile!,
        gameVersion,
        offset: query.offset,
        limit: query.limit,
        index: query.index,
        category: query.category || null,
      });
      return {
        ...page,
        gameVersion,
        platformLabel: check.profile!.platformLabel,
        kind: check.profile!.kind,
        loaders: check.profile!.loaders,
        category: query.category || null,
      };
    } catch (err) {
      return pluginsError(reply, err, request.log);
    }
  });

  app.get('/servers/:id/plugins/project/:slug', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      const { id, slug } = request.params as { id: string; slug: string };
      const check = await assertMinecraftServerView(id, request.user!.id);
      if (check.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (check.error === 'not_minecraft') {
        return reply.status(400).send({ error: 'Plugins are only available for Minecraft servers' });
      }
      if (check.error === 'plan_denied') {
        return reply.status(403).send({ error: 'Minecraft plugins are not included with this server plan.' });
      }

      const gameVersion = gameVersionForServer(check.server!);
      const project = await getModrinthProject(slug);
      const loaders = check.profile!.loaders.filter((l) => l !== 'datapack');
      const versions = await listModrinthVersions(project.id, {
        loaders: loaders.length ? loaders : undefined,
        gameVersions: gameVersion ? [gameVersion] : undefined,
      });
      const fallbackVersions =
        versions.length > 0
          ? versions
          : await listModrinthVersions(project.id, {
              loaders: loaders.length ? loaders : undefined,
            });

      const existing = await prisma.minecraftModrinthInstall.findUnique({
        where: { serverId_projectId: { serverId: id, projectId: project.id } },
      });

      const onDisk = check.canReadFiles
        ? await scanMinecraftPluginFiles(wingsForNode(check.server!.node), check.server!.uuid, check.profile!)
        : [];
      const diskFilenames = onDisk.map((f) => f.filename.toLowerCase());
      const diskPaths = onDisk.map((f) => f.installPath);
      const diskByName = new Map(onDisk.map((f) => [f.filename.toLowerCase(), f]));

      const versionPayload = fallbackVersions.slice(0, 40).map((v) => {
        const primaryFilename = v.files.find((f) => f.primary)?.filename ?? v.files[0]?.filename ?? null;
        const onDiskMatch = primaryFilename
          ? diskByName.get(primaryFilename.toLowerCase())
          : undefined;
        return {
          id: v.id,
          name: v.name,
          versionNumber: v.versionNumber,
          versionType: v.versionType,
          loaders: v.loaders,
          gameVersions: v.gameVersions,
          datePublished: v.datePublished,
          downloads: v.downloads,
          primaryFilename,
          onDisk: Boolean(onDiskMatch) || Boolean(existing && diskPaths.includes(existing.installPath)),
        };
      });

      const fileMatch = onDisk.find((f) =>
        fallbackVersions.some((v) => {
          const name = v.files.find((file) => file.primary)?.filename ?? v.files[0]?.filename;
          return name && name.toLowerCase() === f.filename.toLowerCase();
        }),
      );

      return {
        project,
        versions: versionPayload,
        gameVersion,
        platformLabel: check.profile!.platformLabel,
        loaders: check.profile!.loaders,
        diskFilenames,
        diskPaths,
        installed: existing
          ? serializeMinecraftInstall(existing)
          : fileMatch
            ? {
                id: `disk:${fileMatch.installPath}`,
                source: 'disk' as const,
                projectId: project.id,
                projectSlug: project.slug,
                versionId: null,
                versionNumber: 'on disk',
                displayName: project.title,
                name: project.title,
                filename: fileMatch.filename,
                installPath: fileMatch.installPath,
                installDir: fileMatch.installDir,
                projectType: project.projectType,
                iconUrl: project.iconUrl,
                loaders: [],
                installedAt: null,
                modrinthUrl: `https://modrinth.com/project/${project.slug}`,
              }
            : null,
      };
    } catch (err) {
      return pluginsError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/plugins/install', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      if (!(await isMinecraftModrinthInstallsAllowed())) {
        return reply.status(403).send({ error: 'Modrinth installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const body = z
        .object({
          projectId: z.string().min(1).max(128),
          versionId: z.string().min(1).max(128).optional().nullable(),
          installDependencies: z.boolean().optional().default(true),
        })
        .parse(request.body);

      const access = await assertMinecraftServerAccess(id, request.user!.id);
      if (access.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
      if (access.error === 'not_minecraft') {
        return reply.status(400).send({ error: 'Plugins are only available for Minecraft servers' });
      }
      if (access.error === 'plan_denied') {
        return reply.status(403).send({ error: 'Minecraft plugins are not included with this server plan.' });
      }
      if (access.error === 'forbidden') return reply.status(403).send({ error: 'Permission denied' });

      const installed = await installModrinthProject(id, request.user!.id, body);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.plugins.modrinth.install',
        description: `Installed ${(installed as { displayName?: string } | null)?.displayName ?? body.projectId} from Modrinth`,
      });
      return { installed };
    } catch (err) {
      return pluginsError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/plugins/uninstall', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      const { id } = request.params as { id: string };
      const body = z
        .object({
          installId: z.string().min(1).optional(),
          installPath: z.string().min(1).max(400).optional(),
        })
        .parse(request.body);

      const isDiskId = Boolean(body.installId?.startsWith('disk:'));
      // Prefer DB uninstall when a tracked id is provided; only path-delete for disk: ids / path-only.
      if (isDiskId || (body.installPath && !body.installId)) {
        const access = await assertMinecraftServerAccess(id, request.user!.id);
        if (access.error === 'not_found') return reply.status(404).send({ error: 'Not found' });
        if (access.error === 'not_minecraft') {
          return reply.status(400).send({ error: 'Not a Minecraft server' });
        }
        if (access.error === 'plan_denied') {
          return reply.status(403).send({ error: 'Minecraft plugins are not included with this server plan.' });
        }
        if (access.error === 'forbidden') return reply.status(403).send({ error: 'Permission denied' });

        const rawPath = body.installPath || body.installId!.slice('disk:'.length);
        const installPath = assertSafeMinecraftPluginDeletePath(rawPath);

        const wings = wingsForNode(access.server!.node);
        await removePathIfExists(wings, access.server!.uuid, installPath);

        await prisma.minecraftModrinthInstall.deleteMany({
          where: { serverId: id, installPath },
        });

        await logServerActivity(request, {
          serverId: id,
          event: 'server.plugins.modrinth.uninstall',
          description: `Removed on-disk plugin ${installPath}`,
        });
        return { success: true };
      }

      if (!body.installId) {
        return reply.status(400).send({ error: 'installId is required' });
      }

      await uninstallModrinthProject(id, body.installId, request.user!.id);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.plugins.modrinth.uninstall',
        description: 'Uninstalled a Modrinth plugin/mod',
      });
      return { success: true };
    } catch (err) {
      return pluginsError(reply, err, request.log);
    }
  });

  app.post('/servers/:id/plugins/update', { config: { rateLimit: EXPENSIVE_ROUTE_RATE_LIMIT } }, async (request, reply) => {
    try {
      await assertFeatureEnabled();
      if (!(await isMinecraftModrinthInstallsAllowed())) {
        return reply.status(403).send({ error: 'Modrinth installs are disabled on this panel' });
      }
      const { id } = request.params as { id: string };
      const body = z.object({ installId: z.string().min(1) }).parse(request.body);
      const installed = await updateModrinthProject(id, body.installId, request.user!.id);
      await logServerActivity(request, {
        serverId: id,
        event: 'server.plugins.modrinth.update',
        description: `Updated ${(installed as { displayName?: string } | null)?.displayName ?? 'plugin'} from Modrinth`,
      });
      return { installed };
    } catch (err) {
      return pluginsError(reply, err, request.log);
    }
  });
}
