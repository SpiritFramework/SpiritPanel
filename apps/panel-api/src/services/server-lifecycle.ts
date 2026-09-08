import { prisma } from '../lib/prisma.js';
import {
  applyContainerStatusUpdate,
  deleteContainerStatus,
  forcePanelServerOffline,
  suppressTransitionalContainerReports,
} from '../lib/container-state.js';
import { deprovisionServerDatabase, hostFromRecord } from '../lib/database-provision.js';
import { generateUuidShort } from './server-configuration.js';
import { getServerFull, serverInclude } from './server-helpers.js';
import { releaseServerAllocations, resolveAllocationForCreate } from './allocations.js';
import { effectiveResourceLimit } from '../lib/node-capacity.js';
import { serverResourceContribution } from '../lib/server-resources.js';
import { inferStateFromWingsResources } from '../lib/wings-resources.js';
import { logWingsFailure } from '../lib/wings-sync.js';
import { wingsForNode, type WingsClient } from './wings-client.js';

export interface CreateServerInput {
  ownerId: string;
  nodeId: string;
  eggId: string;
  allocationId?: string;
  name: string;
  description?: string;
  externalId?: string;
  memory?: number;
  swap?: number;
  disk?: number;
  io?: number;
  cpu?: number;
  image?: string;
  startup?: string;
  environment?: Record<string, string>;
  allocationLimit?: number;
  backupLimit?: number;
  databaseLimit?: number;
  subdomainAccess?: boolean;
  fivemMarketplaceAccess?: boolean;
  minecraftPluginsAccess?: boolean;
}

/**
 * Reject server creation/update that would exceed a node's configured memory or disk.
 * Server build resources of 0 are unlimited and do not count against the node.
 * Allocation, backup, and database limits use separate quota rules (0 = disabled).
 */
async function sumNodeResourceUsage(nodeId: string, excludeServerId?: string) {
  const servers = await prisma.server.findMany({
    where: {
      nodeId,
      ...(excludeServerId ? { id: { not: excludeServerId } } : {}),
    },
    select: { memory: true, disk: true },
  });

  return servers.reduce(
    (acc, server) => ({
      memory: acc.memory + serverResourceContribution(server.memory),
      disk: acc.disk + serverResourceContribution(server.disk),
    }),
    { memory: 0, disk: 0 },
  );
}

async function assertNodeHasCapacity(
  node: { id: string; memory: number; disk: number; memoryOverallocate: number; diskOverallocate: number },
  requestedMemory: number,
  requestedDisk: number,
  excludeServerId?: string,
) {
  const memoryNeed = serverResourceContribution(requestedMemory);
  const diskNeed = serverResourceContribution(requestedDisk);
  if (node.memory <= 0 && node.disk <= 0) return;
  if (node.memory > 0 && memoryNeed <= 0 && node.disk > 0 && diskNeed <= 0) return;

  const used = await sumNodeResourceUsage(node.id, excludeServerId);

  if (node.memory > 0 && memoryNeed > 0) {
    const limit = effectiveResourceLimit(node.memory, node.memoryOverallocate);
    if (used.memory + memoryNeed > limit) {
      const free = Math.max(0, limit - used.memory);
      throw new Error(
        `Not enough memory on this node. Requested ${requestedMemory} MB but only ${free} MB of ${limit} MB is free.`,
      );
    }
  }

  if (node.disk > 0 && diskNeed > 0) {
    const limit = effectiveResourceLimit(node.disk, node.diskOverallocate);
    if (used.disk + diskNeed > limit) {
      const free = Math.max(0, limit - used.disk);
      throw new Error(
        `Not enough disk on this node. Requested ${requestedDisk} MB but only ${free} MB of ${limit} MB is free.`,
      );
    }
  }
}

export async function assertNodeHasCapacityForUpdate(
  node: { id: string; memory: number; disk: number; memoryOverallocate: number; diskOverallocate: number },
  serverId: string,
  memory: number,
  disk: number,
) {
  await assertNodeHasCapacity(node, memory, disk, serverId);
}

export async function createServerOnPanel(input: CreateServerInput) {
  const [egg, node] = await Promise.all([
    prisma.egg.findUnique({ where: { id: input.eggId }, include: { variables: true } }),
    prisma.node.findUnique({ where: { id: input.nodeId } }),
  ]);

  if (!egg || !node) throw new Error('Invalid egg or node');
  if (node.maintenanceMode) throw new Error('Node is in maintenance mode');

  const allocation = await resolveAllocationForCreate(node.id, input.allocationId);

  const dockerImages = egg.dockerImages as Record<string, string>;
  const image = input.image ?? Object.values(dockerImages)[0] ?? 'ghcr.io/pterodactyl/yolks:debian';
  const startup = input.startup ?? egg.startup;
  const allocationLimit = input.allocationLimit ?? 0;

  const memory = input.memory !== undefined ? input.memory : 1024;
  const disk = input.disk !== undefined ? input.disk : 10240;
  const swap = input.swap !== undefined ? input.swap : 0;
  const io = input.io !== undefined ? input.io : 500;
  const cpu = input.cpu !== undefined ? input.cpu : 100;
  await assertNodeHasCapacity(node, memory, disk);

  const server = await prisma.$transaction(async (tx) => {
    const uuid = crypto.randomUUID();
    const created = await tx.server.create({
      data: {
        uuid,
        uuidShort: generateUuidShort(uuid),
        externalId: input.externalId || null,
        ownerId: input.ownerId,
        nodeId: input.nodeId,
        eggId: input.eggId,
        allocationId: allocation.id,
        name: input.name,
        description: input.description ?? '',
        memory,
        swap,
        disk,
        io,
        cpu,
        image,
        startup,
        allocationLimit,
        backupLimit: input.backupLimit ?? 0,
        databaseLimit: input.databaseLimit ?? 0,
        subdomainAccess: input.subdomainAccess ?? true,
        fivemMarketplaceAccess: input.fivemMarketplaceAccess ?? true,
        minecraftPluginsAccess: input.minecraftPluginsAccess ?? true,
        installStatus: 'installing',
        status: 'installing',
        containerState: 'installing',
        variables: {
          create: egg.variables.map((v) => ({
            eggVariableId: v.id,
            variableValue: input.environment?.[v.envVariable] ?? v.defaultValue,
          })),
        },
      },
      include: serverInclude,
    });

    await tx.allocation.update({
      where: { id: allocation.id },
      data: { assigned: true },
    });

    return created;
  });

  try {
    const wings = wingsForNode(node);
    await wings.createServer(server.uuid);
  } catch (e) {
    console.error('FeatherWings create failed:', e);
    await prisma.$transaction(async (tx) => {
      await releaseServerAllocations(server.id, server.allocationId);
      await tx.server.delete({ where: { id: server.id } });
    });
    throw e instanceof Error ? e : new Error(String(e));
  }

  return server;
}

export async function ensureServerOnWings(uuid: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  const wings = wingsForNode(server.node);

  try {
    await wings.getResources(uuid);
    return;
  } catch {
    // Server not reachable on FeatherWings right now.
  }

  // `getResources` also fails transiently while an install container is still
  // running (the server isn't booted yet). If the panel already considers this
  // server to be installing, do NOT call createServer again: a second install
  // collides with the in-progress one on the daemon, which removes the running
  // install container and wipes its `/tmp/<daemon>/<uuid>` script directory,
  // leaving a half-installed (corrupt) server. The install-complete callback
  // (POST /servers/:uuid/install) will clear the installing state when it's done.
  if (isServerInstalling(server)) return;

  await wings.createServer(uuid);
}

export async function syncServerToWings(uuid: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');
  await ensureServerOnWings(uuid);
  const wings = wingsForNode(server.node);
  await wings.syncServer(uuid);
}

async function readWingsContainerState(wings: WingsClient, uuid: string): Promise<string | null> {
  try {
    return inferStateFromWingsResources(await wings.getResources(uuid));
  } catch {
    return null;
  }
}

/** Best-effort Kill to FeatherWings — never waits for the daemon soft-stop window. */
async function sendKillBestEffort(wings: WingsClient, uuid: string): Promise<void> {
  try {
    await wings.power(uuid, 'kill', 0);
  } catch (err) {
    logWingsFailure('kill power action failed', err, { uuid });
  }
}

/**
 * Send a power action to FeatherWings and keep the panel badge usable.
 *
 * FeatherWings accepts power with HTTP 202 and can sit on "stopping" for up to ~10
 * minutes while a soft-stop is wedged (e.g. 0 TPS). The panel must not block on that
 * or re-apply "stopping" from a later Wings poll after the user already Killed.
 */
export async function powerServer(uuid: string, action: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  const wings = wingsForNode(server.node);

  if ((action === 'start' || action === 'restart') && isServerInstalling(server)) {
    // After a Wings restart, panel_db can still say "installing" while Docker is already
    // running (or idle). Trust live Wings state before blocking Start.
    const liveInstall = await readWingsContainerState(wings, uuid);
    if (liveInstall === 'installing') {
      throw Object.assign(
        new Error('Server is still installing. Wait for installation to finish before starting it.'),
        { code: 'server_installing', statusCode: 409 },
      );
    }
    await applyContainerStatusUpdate(prisma, server, liveInstall ?? 'offline');
    if (action === 'start' && (liveInstall === 'running' || liveInstall === 'starting')) {
      return;
    }
  }

  if (action === 'kill') {
    // Do not call ensureServerOnWings / waitForOffline — those hang when the daemon is wedged.
    await sendKillBestEffort(wings, uuid);
    await forcePanelServerOffline(prisma, server);
    return;
  }

  if (action === 'stop') {
    await applyContainerStatusUpdate(prisma, server, 'stopping');
    await wings.power(uuid, 'stop');
    return;
  }

  // start / restart
  await ensureServerOnWings(uuid);
  const liveState = await readWingsContainerState(wings, uuid);
  const stuck =
    liveState === 'stopping' ||
    liveState === 'starting' ||
    server.containerState === 'stopping' ||
    server.containerState === 'starting';

  if (stuck) {
    await sendKillBestEffort(wings, uuid);
    await forcePanelServerOffline(prisma, server);
    // Short poll only — if Wings is still wedged, Start may no-op on the daemon until
    // it finishes its stop window; the panel badge is at least clear.
    await wings.waitForOffline(uuid, 5_000).catch(() => false);
    await wings.power(uuid, 'start');
    suppressTransitionalContainerReports(uuid);
    await applyContainerStatusUpdate(prisma, server, 'starting');
    return;
  }

  // Already running after a Wings reattach — treat Start as success and sync the badge.
  if (action === 'start' && (liveState === 'running' || liveState === 'starting')) {
    await applyContainerStatusUpdate(prisma, server, liveState);
    return;
  }

  await wings.power(uuid, action);
  if (action === 'start') {
    await applyContainerStatusUpdate(prisma, server, 'starting');
  }
}

/** Clear stuck stopping/starting in the panel DB; optionally poke FeatherWings with Kill. */
export async function clearStuckServerPowerState(uuid: string, opts?: { kill?: boolean }) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  if (opts?.kill !== false) {
    await sendKillBestEffort(wingsForNode(server.node), uuid);
  }
  await forcePanelServerOffline(prisma, server);
  return server;
}

async function ensureServerStoppedForReinstall(wings: WingsClient, uuid: string): Promise<void> {
  let resources: Awaited<ReturnType<WingsClient['getResources']>> | null = null;
  try {
    resources = await wings.getResources(uuid);
  } catch {
    return;
  }

  const state = (resources?.state ?? '').toLowerCase();
  if (!state || state === 'offline' || state === 'stopped') return;

  try {
    await wings.power(uuid, 'stop', 60);
  } catch {
    // Stop is best-effort — kill below if the instance is still running.
  }

  const stoppedGracefully = await wings.waitForOffline(uuid, 90_000).catch(() => false);
  if (stoppedGracefully) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return;
  }

  await wings.power(uuid, 'kill');
  const killed = await wings.waitForOffline(uuid, 30_000).catch(() => false);
  if (!killed) {
    throw new Error('Could not stop the server before reinstall. Stop it manually, then try again.');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function reinstallServerOnWings(uuid: string, opts?: { wipeFiles?: boolean }) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  const previous = {
    installStatus: server.installStatus,
    status: server.status,
    containerState: server.containerState,
  };

  await ensureServerOnWings(uuid);
  const wings = wingsForNode(server.node);

  try {
    await ensureServerStoppedForReinstall(wings, uuid);

    if (opts?.wipeFiles) {
      await wings.wipeAllServerFiles(uuid);
    }

    await deleteContainerStatus(uuid);

    await prisma.server.update({
      where: { id: server.id },
      data: { installStatus: 'installing', status: 'installing', containerState: 'installing' },
    });

    await wings.reinstall(uuid);
  } catch (e) {
    await prisma.server
      .update({
        where: { id: server.id },
        data: previous,
      })
      .catch((err) => logWingsFailure('reinstall rollback failed', err, { serverId: server.id }));
    throw e;
  }
}

export function isServerInstalling(server: {
  status: string;
  installStatus: string;
}): boolean {
  return server.status === 'installing' || server.installStatus === 'installing';
}

export async function deleteServerFromPanel(uuid: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  try {
    await wingsForNode(server.node).deleteServer(uuid);
  } catch {
    // wings may already have removed it
  }

  try {
    const { cleanupServerDomainBestEffort } = await import('./server-domains.js');
    await cleanupServerDomainBestEffort(server.id);
  } catch (e) {
    console.error(`Failed to cleanup Cloudflare subdomain for server ${uuid}:`, e);
  }

  const databases = await prisma.serverDatabase.findMany({
    where: { serverId: server.id },
    include: { databaseHost: true },
  });
  for (const row of databases) {
    try {
      await deprovisionServerDatabase(
        hostFromRecord(row.databaseHost),
        row.database,
        row.username,
        row.remote,
      );
    } catch (e) {
      console.error(`Failed to deprovision database ${row.name} for server ${uuid}:`, e);
    }
  }

  await prisma.$transaction(async (tx) => {
    await releaseServerAllocations(server.id, server.allocationId);
    await tx.server.delete({ where: { id: server.id } });
  });
}
