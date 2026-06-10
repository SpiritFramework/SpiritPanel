import { prisma } from '../lib/prisma.js';
import { deprovisionServerDatabase, hostFromRecord } from '../lib/database-provision.js';
import { generateUuidShort } from './server-configuration.js';
import { getServerFull, serverInclude } from './server-helpers.js';
import { releaseServerAllocations, resolveAllocationForCreate } from './allocations.js';
import { effectiveResourceLimit } from '../lib/node-capacity.js';
import { wingsForNode, type WingsClient } from './wings-client.js';

export interface CreateServerInput {
  ownerId: string;
  nodeId: string;
  eggId: string;
  allocationId?: string;
  name: string;
  description?: string;
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
}

/**
 * Reject server creation that would exceed a node's configured memory or disk
 * (respecting overallocation). Server feature limits of 0 mean none allowed.
 */
async function assertNodeHasCapacity(
  node: { id: string; memory: number; disk: number; memoryOverallocate: number; diskOverallocate: number },
  requestedMemory: number,
  requestedDisk: number,
) {
  if (node.memory <= 0 && node.disk <= 0) return;

  const totals = await prisma.server.aggregate({
    where: { nodeId: node.id },
    _sum: { memory: true, disk: true },
  });
  const usedMemory = totals._sum.memory ?? 0;
  const usedDisk = totals._sum.disk ?? 0;

  if (node.memory > 0) {
    const limit = effectiveResourceLimit(node.memory, node.memoryOverallocate);
    if (usedMemory + requestedMemory > limit) {
      const free = Math.max(0, limit - usedMemory);
      throw new Error(
        `Not enough memory on this node. Requested ${requestedMemory} MB but only ${free} MB of ${limit} MB is free.`,
      );
    }
  }

  if (node.disk > 0) {
    const limit = effectiveResourceLimit(node.disk, node.diskOverallocate);
    if (usedDisk + requestedDisk > limit) {
      const free = Math.max(0, limit - usedDisk);
      throw new Error(
        `Not enough disk on this node. Requested ${requestedDisk} MB but only ${free} MB of ${limit} MB is free.`,
      );
    }
  }
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

  const requestedMemory = input.memory ?? 1024;
  const requestedDisk = input.disk ?? 10240;
  await assertNodeHasCapacity(node, requestedMemory, requestedDisk);

  const server = await prisma.$transaction(async (tx) => {
    const uuid = crypto.randomUUID();
    const created = await tx.server.create({
      data: {
        uuid,
        uuidShort: generateUuidShort(uuid),
        ownerId: input.ownerId,
        nodeId: input.nodeId,
        eggId: input.eggId,
        allocationId: allocation.id,
        name: input.name,
        description: input.description ?? '',
        memory: input.memory ?? 1024,
        swap: input.swap ?? 0,
        disk: input.disk ?? 10240,
        io: input.io ?? 500,
        cpu: input.cpu ?? 100,
        image,
        startup,
        allocationLimit,
        backupLimit: input.backupLimit ?? 0,
        databaseLimit: input.databaseLimit ?? 0,
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

export async function powerServer(uuid: string, action: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');

  // Starting a server that is still installing makes the daemon interrupt the
  // running install and re-run it, racing the install temp-dir cleanup and
  // leaving a corrupt install. Block start/restart until installation finishes.
  if ((action === 'start' || action === 'restart') && isServerInstalling(server)) {
    throw new Error('Server is still installing. Wait for installation to finish before starting it.');
  }

  await ensureServerOnWings(uuid);
  const wings = wingsForNode(server.node);
  await wings.power(uuid, action);
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

  if (await wings.waitForOffline(uuid, 90_000)) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return;
  }

  await wings.power(uuid, 'kill');
  if (!(await wings.waitForOffline(uuid, 30_000))) {
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
      .catch(() => {});
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
