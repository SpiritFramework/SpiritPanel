import {
  applyContainerStatusUpdate,
  clearContainerStatusCache,
  getContainerStatus,
  setContainerStatus,
  resolveReportedContainerState,
} from '../lib/container-state.js';
import { mapWithConcurrency } from '../lib/map-concurrency.js';
import { inferStateFromWingsResources } from '../lib/wings-resources.js';
import { logWingsFailure } from '../lib/wings-sync.js';
import { prisma } from '../lib/prisma.js';
import { wingsForNode } from './wings-client.js';
import type { Node } from '@prisma/client';

export interface ServerRuntimeRecord {
  id: string;
  uuid: string;
  containerState: string | null;
  node: Node;
}

export interface ServerRuntimeRef {
  id: string;
  uuid: string;
  containerState: string | null;
  nodeId: string;
}

const WINGS_POLL_CONCURRENCY = 6;

/** Read cached Wings status, falling back to the persisted DB value. */
export async function resolveCachedContainerState(uuid: string, persisted: string | null): Promise<string | null> {
  return (await getContainerStatus(uuid)) ?? persisted;
}

/** Poll FeatherWings for the current container state and warm the cache. */
export async function fetchLiveContainerState(node: Node, uuid: string): Promise<string | null> {
  try {
    const resources = await wingsForNode(node).getResources(uuid);
    const state = resolveReportedContainerState(uuid, inferStateFromWingsResources(resources));
    setContainerStatus(uuid, state);
    return state;
  } catch {
    try {
      const legacy = await wingsForNode(node).getResourcesLegacy(uuid);
      const state = resolveReportedContainerState(uuid, inferStateFromWingsResources(legacy));
      setContainerStatus(uuid, state);
      return state;
    } catch (err) {
      logWingsFailure('live container state poll failed', err, { uuid, nodeId: node.id });
      return null;
    }
  }
}

async function persistContainerStateIfChanged(server: ServerRuntimeRecord, state: string) {
  // Always sync when Wings reports an active state so stale install flags get cleared.
  if (state === server.containerState && state !== 'running' && state !== 'starting') return;
  await applyContainerStatusUpdate(prisma, server, state);
}

/** Resolve live container state for one server (cache → Wings → DB). */
export async function resolveServerContainerState(
  server: ServerRuntimeRecord,
  opts?: { refresh?: boolean },
): Promise<string | null> {
  const cached = await getContainerStatus(server.uuid);
  if (cached && !opts?.refresh) return cached;

  const fromWings = await fetchLiveContainerState(server.node, server.uuid);
  const resolved = fromWings ?? cached ?? server.containerState;

  if (fromWings) {
    persistContainerStateIfChanged(server, fromWings).catch((err) => {
      logWingsFailure('persist container state failed', err, { serverUuid: server.uuid });
    });
  }

  return resolved;
}

/** Attach the best-known container state to a batch of servers. */
export async function enrichServersWithLiveState<T extends ServerRuntimeRecord>(
  servers: T[],
  opts?: { refresh?: boolean },
): Promise<(T & { containerState: string | null })[]> {
  if (servers.length === 0) return [];

  const refresh = opts?.refresh ?? false;
  const byNode = new Map<string, T[]>();

  for (const server of servers) {
    if (!refresh && (await getContainerStatus(server.uuid))) continue;
    const list = byNode.get(server.node.id) ?? [];
    list.push(server);
    byNode.set(server.node.id, list);
  }

  const resolved = new Map<string, string | null>();

  await Promise.all(
    [...byNode.values()].map(async (nodeServers) => {
      await mapWithConcurrency(nodeServers, WINGS_POLL_CONCURRENCY, async (server) => {
        const state = refresh
          ? await resolveServerContainerState(server, { refresh: true })
          : await resolveCachedContainerState(server.uuid, server.containerState);
        resolved.set(server.uuid, state);
      });
    }),
  );

  return Promise.all(
    servers.map(async (server) => ({
      ...server,
      containerState:
        resolved.get(server.uuid) ??
        (await resolveCachedContainerState(server.uuid, server.containerState)),
    })),
  );
}

/** Attach live container state to API records that only include nodeId. */
export async function enrichServerRefsWithLiveState<T extends ServerRuntimeRef>(
  servers: T[],
  opts?: { refresh?: boolean },
): Promise<(T & { containerState: string | null })[]> {
  if (servers.length === 0) return [];

  try {
    const nodes = await prisma.node.findMany({
      where: { id: { in: [...new Set(servers.map((server) => server.nodeId))] } },
    });
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    return mapWithConcurrency(servers, WINGS_POLL_CONCURRENCY, async (server) => {
      const node = nodeById.get(server.nodeId);
      if (!node) {
        return {
          ...server,
          containerState: await resolveCachedContainerState(server.uuid, server.containerState),
        };
      }
      try {
        const state = await resolveServerContainerState(
          {
            id: server.id,
            uuid: server.uuid,
            containerState: server.containerState,
            node,
          },
          opts,
        );
        return {
          ...server,
          containerState:
            state ?? (await resolveCachedContainerState(server.uuid, server.containerState)),
        };
      } catch {
        return {
          ...server,
          containerState: await resolveCachedContainerState(server.uuid, server.containerState),
        };
      }
    });
  } catch {
    return Promise.all(
      servers.map(async (server) => ({
        ...server,
        containerState: await resolveCachedContainerState(server.uuid, server.containerState),
      })),
    );
  }
}

/** Clear the in-memory cache and re-poll every server from Wings. */
export async function refreshAllServerContainerStates(): Promise<{
  cacheEntriesCleared: number;
  serversPolled: number;
  serversUpdated: number;
  pollFailures: number;
}> {
  const cacheEntriesCleared = await clearContainerStatusCache();

  const servers = await prisma.server.findMany({
    select: { id: true, uuid: true, containerState: true, nodeId: true },
  });
  const nodes = await prisma.node.findMany();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  let serversUpdated = 0;
  let pollFailures = 0;

  await mapWithConcurrency(servers, WINGS_POLL_CONCURRENCY, async (server) => {
    const node = nodeById.get(server.nodeId);
    if (!node) {
      pollFailures++;
      return;
    }

    const state = await fetchLiveContainerState(node, server.uuid);
    if (!state) {
      pollFailures++;
      return;
    }

    try {
      await persistContainerStateIfChanged({ ...server, node }, state);
      serversUpdated++;
    } catch {
      pollFailures++;
    }
  });

  return {
    cacheEntriesCleared,
    serversPolled: servers.length,
    serversUpdated,
    pollFailures,
  };
}
