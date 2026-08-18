import type { Node, Server } from '@prisma/client';
import { computeNodeCapacity } from '../lib/node-capacity.js';
import { mapWithConcurrency } from '../lib/map-concurrency.js';
import { serverResourceContribution } from '../lib/server-resources.js';
import { prisma } from '../lib/prisma.js';
import {
  fetchLiveStats,
  recordStatSnapshot,
  statSnapshotToPoint,
  wingsResourcesToStatPoint,
  type StatPoint,
} from './server-stats.js';

const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const BUCKET_MS: Record<string, number> = {
  '1h': 60_000,
  '24h': 5 * 60_000,
  '7d': 30 * 60_000,
};

const ACTIVE_STATES = new Set(['running', 'starting']);

export interface NodeStatsSeriesPoint {
  recordedAt: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  runningCount: number;
}

export type NodeLiveStatSource = 'wings' | 'snapshot' | null;

export interface NodeServerLiveStats {
  id: string;
  name: string;
  memory: number;
  disk: number;
  cpu: number;
  status: string;
  suspended: boolean;
  installStatus: string | null;
  containerState: string | null;
  live: StatPoint | null;
  liveSource: NodeLiveStatSource;
}

export interface NodeLiveUsageSummary {
  liveMemoryBytes: number;
  liveDiskBytes: number;
  liveCpuPercent: number;
  liveServerCount: number;
  serverCount: number;
  runningCount: number;
}

export interface NodeStatsResponse {
  range: string;
  capacity: ReturnType<typeof computeNodeCapacity>;
  summary: {
    serverCount: number;
    runningCount: number;
    suspendedCount: number;
    totalCpuLimit: number;
    liveCpuPercent: number;
    liveMemoryBytes: number;
    liveDiskBytes: number;
    assignedAllocations: number;
    allocationCount: number;
    liveServerCount: number;
  };
  series: NodeStatsSeriesPoint[];
  servers: NodeServerLiveStats[];
}

function aggregateSeries(
  rows: Array<{
    serverId: string;
    recordedAt: Date;
    cpu: number;
    memoryBytes: bigint;
    diskBytes: bigint;
    state: string;
  }>,
  bucketMs: number,
): NodeStatsSeriesPoint[] {
  const buckets = new Map<number, Map<string, (typeof rows)[number]>>();

  for (const row of rows) {
    const bucket = Math.floor(row.recordedAt.getTime() / bucketMs) * bucketMs;
    if (!buckets.has(bucket)) buckets.set(bucket, new Map());
    const perServer = buckets.get(bucket)!;
    const existing = perServer.get(row.serverId);
    if (!existing || row.recordedAt > existing.recordedAt) {
      perServer.set(row.serverId, row);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, perServer]) => {
      let cpu = 0;
      let memoryBytes = 0;
      let diskBytes = 0;
      let runningCount = 0;
      for (const snap of perServer.values()) {
        cpu += snap.cpu;
        memoryBytes += Number(snap.memoryBytes);
        diskBytes += Number(snap.diskBytes);
        if (snap.state === 'running' || snap.state === 'starting') runningCount++;
      }
      return {
        recordedAt: new Date(t).toISOString(),
        cpu,
        memoryBytes,
        diskBytes,
        runningCount,
      };
    });
}

async function loadLatestSnapshots(serverIds: string[]) {
  if (serverIds.length === 0) {
    return new Map<
      string,
      {
        recordedAt: Date;
        cpu: number;
        memoryBytes: bigint;
        diskBytes: bigint;
        networkRxBytes: bigint;
        networkTxBytes: bigint;
        state: string;
      }
    >();
  }

  const rows = await prisma.serverStatSnapshot.findMany({
    where: { serverId: { in: serverIds } },
    orderBy: { recordedAt: 'desc' },
    distinct: ['serverId'],
  });

  return new Map(rows.map((row) => [row.serverId, row]));
}

function isServerRunning(
  live: StatPoint | null,
  containerState: string | null,
  suspended: boolean,
): boolean {
  if (suspended) return false;
  if (live && ACTIVE_STATES.has(live.state)) return true;
  return containerState === 'running' || containerState === 'starting';
}

async function resolveServerLiveStat(
  server: Server & { node: Node },
  latestSnapshots: Awaited<ReturnType<typeof loadLatestSnapshots>>,
): Promise<{ live: StatPoint | null; liveSource: NodeLiveStatSource }> {
  const liveRaw = await fetchLiveStats(server);
  if (liveRaw) {
    void recordStatSnapshot(server.id, liveRaw).catch(() => {});
    return { live: wingsResourcesToStatPoint(liveRaw), liveSource: 'wings' };
  }

  const snapshot = latestSnapshots.get(server.id);
  if (snapshot) {
    return { live: statSnapshotToPoint(snapshot), liveSource: 'snapshot' };
  }

  return { live: null, liveSource: null };
}

function summarizeLiveUsage(
  servers: NodeServerLiveStats[],
): NodeLiveUsageSummary {
  return {
    serverCount: servers.length,
    runningCount: servers.filter((s) => isServerRunning(s.live, s.containerState, s.suspended)).length,
    liveServerCount: servers.filter((s) => s.liveSource === 'wings').length,
    liveCpuPercent: servers.reduce((sum, s) => sum + (s.live?.cpu ?? 0), 0),
    liveMemoryBytes: servers.reduce((sum, s) => sum + (s.live?.memoryBytes ?? 0), 0),
    liveDiskBytes: servers.reduce((sum, s) => sum + (s.live?.diskBytes ?? 0), 0),
  };
}

/** Poll Wings for current resource usage across all servers on a node. */
export async function getNodeLiveUsageSummary(
  node: Node,
  servers: Server[],
): Promise<NodeLiveUsageSummary | null> {
  if (servers.length === 0) {
    return {
      serverCount: 0,
      runningCount: 0,
      liveServerCount: 0,
      liveCpuPercent: 0,
      liveMemoryBytes: 0,
      liveDiskBytes: 0,
    };
  }

  const latestSnapshots = await loadLatestSnapshots(servers.map((s) => s.id));
  const liveResults = await mapWithConcurrency(servers, 4, async (server) => {
    const { live, liveSource } = await resolveServerLiveStat({ ...server, node }, latestSnapshots);
    return {
      id: server.id,
      name: server.name,
      memory: server.memory,
      disk: server.disk,
      cpu: server.cpu,
      status: server.status,
      suspended: server.suspended,
      installStatus: server.installStatus,
      containerState: server.containerState,
      live,
      liveSource,
    } satisfies NodeServerLiveStats;
  });

  return summarizeLiveUsage(liveResults);
}

export async function getNodeStats(node: Node & { servers: Server[] }, range: string): Promise<NodeStatsResponse> {
  const rangeKey = range in RANGE_MS ? range : '24h';
  const since = new Date(Date.now() - RANGE_MS[rangeKey]);
  const bucketMs = BUCKET_MS[rangeKey];
  const serverIds = node.servers.map((s) => s.id);

  const [snapshots, assignedAllocations, allocationCount, latestSnapshots] = await Promise.all([
    serverIds.length > 0
      ? prisma.serverStatSnapshot.findMany({
          where: { serverId: { in: serverIds }, recordedAt: { gte: since } },
          orderBy: { recordedAt: 'asc' },
        })
      : Promise.resolve([]),
    prisma.allocation.count({ where: { nodeId: node.id, assigned: true } }),
    prisma.allocation.count({ where: { nodeId: node.id } }),
    loadLatestSnapshots(serverIds),
  ]);

  const allocated = node.servers.reduce(
    (acc, s) => ({
      memory: acc.memory + serverResourceContribution(s.memory),
      disk: acc.disk + serverResourceContribution(s.disk),
    }),
    { memory: 0, disk: 0 },
  );
  const capacity = computeNodeCapacity(node, allocated);

  const liveResults = await mapWithConcurrency(node.servers, 4, async (server) => {
    const { live, liveSource } = await resolveServerLiveStat({ ...server, node }, latestSnapshots);
    return { server, live, liveSource };
  });

  const servers: NodeServerLiveStats[] = liveResults.map(({ server, live, liveSource }) => ({
    id: server.id,
    name: server.name,
    memory: server.memory,
    disk: server.disk,
    cpu: server.cpu,
    status: server.status,
    suspended: server.suspended,
    installStatus: server.installStatus,
    containerState: server.containerState,
    live,
    liveSource,
  }));

  const runningCount = servers.filter((s) => isServerRunning(s.live, s.containerState, s.suspended)).length;
  const summary = summarizeLiveUsage(servers);
  const suspendedCount = servers.filter((s) => s.suspended).length;
  const totalCpuLimit = servers.reduce((sum, s) => sum + s.cpu, 0);

  return {
    range: rangeKey,
    capacity,
    summary: {
      ...summary,
      suspendedCount,
      totalCpuLimit,
      assignedAllocations,
      allocationCount,
    },
    series: aggregateSeries(snapshots, bucketMs),
    servers,
  };
}
