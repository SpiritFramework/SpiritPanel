import { inferStateFromWingsResources, parseWingsResourcesPayload } from '../lib/wings-resources.js';
import { prisma } from '../lib/prisma.js';
import { wingsForNode } from './wings-client.js';
import type { Node, Server } from '@prisma/client';

const ACTIVE_STATES = new Set(['running', 'starting']);

export interface WingsResourceStats {
  state?: string;
  memory_bytes?: number;
  memory_limit_bytes?: number;
  cpu_absolute?: number;
  disk_bytes?: number;
  network?: { rx_bytes?: number; tx_bytes?: number };
  uptime?: number;
}

export interface StatPoint {
  recordedAt: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  state: string;
}

export interface ServerStatsResponse {
  limits: { memory: number; disk: number; cpu: number };
  range: string;
  live: StatPoint | null;
  series: StatPoint[];
  /** Completed backup archive bytes — counted toward disk allocation with live file usage. */
  diskBackupBytes?: number;
}

const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const SNAPSHOT_RETENTION_MS = 8 * 24 * 60 * 60 * 1000;

export async function pruneStatSnapshots(serverId: string) {
  const cutoff = new Date(Date.now() - SNAPSHOT_RETENTION_MS);
  await prisma.serverStatSnapshot.deleteMany({
    where: { serverId, recordedAt: { lt: cutoff } },
  });
}

/** Batch prune expired snapshots for all servers (stats collector hourly job). */
export async function pruneAllStatSnapshots() {
  const cutoff = new Date(Date.now() - SNAPSHOT_RETENTION_MS);
  await prisma.serverStatSnapshot.deleteMany({
    where: { recordedAt: { lt: cutoff } },
  });
}

export async function fetchLiveStats(server: Server & { node: Node }): Promise<WingsResourceStats | null> {
  const wings = wingsForNode(server.node);
  try {
    return await wings.getResources(server.uuid);
  } catch {
    try {
      return await wings.getResourcesLegacy(server.uuid);
    } catch {
      return null;
    }
  }
}

/** Normalize flat or nested FeatherWings resource payloads for DB snapshots. */
export function normalizeWingsStatsSnapshot(raw: unknown) {
  const parsed = parseWingsResourcesPayload(raw);
  const state = inferStateFromWingsResources(raw);
  const active = ACTIVE_STATES.has(state);

  return {
    state,
    cpu: active ? (parsed.cpu_absolute ?? 0) : 0,
    memoryBytes: active ? (parsed.memory_bytes ?? 0) : 0,
    diskBytes: parsed.disk_bytes ?? 0,
    networkRxBytes: active ? (parsed.network?.rx_bytes ?? 0) : 0,
    networkTxBytes: active ? (parsed.network?.tx_bytes ?? 0) : 0,
  };
}

export async function recordStatSnapshot(serverId: string, stats: WingsResourceStats | unknown) {
  const last = await prisma.serverStatSnapshot.findFirst({
    where: { serverId },
    orderBy: { recordedAt: 'desc' },
  });

  const now = Date.now();
  if (last && now - last.recordedAt.getTime() < 30_000) return;

  const normalized = normalizeWingsStatsSnapshot(stats);

  await prisma.serverStatSnapshot.create({
    data: {
      serverId,
      cpu: normalized.cpu,
      memoryBytes: BigInt(normalized.memoryBytes),
      diskBytes: BigInt(normalized.diskBytes),
      networkRxBytes: BigInt(normalized.networkRxBytes),
      networkTxBytes: BigInt(normalized.networkTxBytes),
      state: normalized.state,
    },
  });
}

function serializePoint(row: {
  recordedAt: Date;
  cpu: number;
  memoryBytes: bigint;
  diskBytes: bigint;
  networkRxBytes: bigint;
  networkTxBytes: bigint;
  state: string;
}): StatPoint {
  return {
    recordedAt: row.recordedAt.toISOString(),
    cpu: row.cpu,
    memoryBytes: Number(row.memoryBytes),
    diskBytes: Number(row.diskBytes),
    networkRxBytes: Number(row.networkRxBytes),
    networkTxBytes: Number(row.networkTxBytes),
    state: row.state,
  };
}

export function wingsResourcesToStatPoint(raw: unknown, recordedAt = new Date().toISOString()): StatPoint {
  const normalized = normalizeWingsStatsSnapshot(raw);
  return {
    recordedAt,
    cpu: normalized.cpu,
    memoryBytes: normalized.memoryBytes,
    diskBytes: normalized.diskBytes,
    networkRxBytes: normalized.networkRxBytes,
    networkTxBytes: normalized.networkTxBytes,
    state: normalized.state,
  };
}

export function statSnapshotToPoint(row: {
  recordedAt: Date;
  cpu: number;
  memoryBytes: bigint;
  diskBytes: bigint;
  networkRxBytes: bigint;
  networkTxBytes: bigint;
  state: string;
}): StatPoint {
  return serializePoint(row);
}

function liveToPoint(stats: WingsResourceStats): StatPoint {
  return wingsResourcesToStatPoint(stats);
}

export async function getServerStats(
  server: Server & { node: Node },
  range: string,
): Promise<ServerStatsResponse> {
  const rangeKey = range in RANGE_MS ? range : '24h';
  const since = new Date(Date.now() - RANGE_MS[rangeKey]);

  const [rows, liveRaw, backupAgg] = await Promise.all([
    prisma.serverStatSnapshot.findMany({
      where: { serverId: server.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    }),
    fetchLiveStats(server),
    prisma.backup.aggregate({
      where: { serverId: server.id, bytes: { gt: 0 } },
      _sum: { bytes: true },
    }),
  ]);

  const diskBackupBytes = Number(backupAgg._sum.bytes ?? 0n);
  const series = rows.map((row) => {
    const point = serializePoint(row);
    return { ...point, diskBytes: point.diskBytes + diskBackupBytes };
  });
  const live = liveRaw
    ? (() => {
        const point = liveToPoint(liveRaw);
        return { ...point, diskBytes: point.diskBytes + diskBackupBytes };
      })()
    : null;

  if (liveRaw) {
    // Persist raw Wings file usage only — backup bytes are applied at read time.
    await recordStatSnapshot(server.id, liveRaw).catch(() => {});
  }

  return {
    limits: { memory: server.memory, disk: server.disk, cpu: server.cpu },
    range: rangeKey,
    live,
    series,
    diskBackupBytes,
  };
}

export async function recordStatSnapshotFromPayload(
  serverId: string,
  payload: {
    cpu?: number;
    memoryBytes?: number;
    diskBytes?: number;
    networkRxBytes?: number;
    networkTxBytes?: number;
    state?: string;
  },
) {
  const state = payload.state ?? 'offline';
  const active = ACTIVE_STATES.has(state);
  await recordStatSnapshot(serverId, {
    cpu_absolute: active ? (payload.cpu ?? 0) : 0,
    memory_bytes: active ? (payload.memoryBytes ?? 0) : 0,
    disk_bytes: payload.diskBytes ?? 0,
    network: {
      rx_bytes: active ? (payload.networkRxBytes ?? 0) : 0,
      tx_bytes: active ? (payload.networkTxBytes ?? 0) : 0,
    },
    state,
  });
}

export async function seedDemoStats(serverId: string, memoryLimitMiB: number, diskLimitMiB: number) {
  const existing = await prisma.serverStatSnapshot.count({ where: { serverId } });
  if (existing > 0) return;

  const memoryLimit = memoryLimitMiB * 1024 * 1024;
  const diskLimit = diskLimitMiB * 1024 * 1024;
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  const points = Math.floor((7 * 24 * 60 * 60 * 1000) / intervalMs);

  const data = Array.from({ length: points }, (_, i) => {
    const t = now - (points - i) * intervalMs;
    const hour = new Date(t).getHours();
    const peak = hour >= 18 && hour <= 23 ? 1.4 : hour >= 12 && hour <= 17 ? 1.1 : 0.7;
    const noise = () => 0.85 + Math.random() * 0.3;

    const cpu = Math.min(95, 12 * peak * noise());
    const memoryBytes = Math.floor(memoryLimit * (0.35 + 0.25 * peak * noise()));
    const diskBytes = Math.floor(diskLimit * (0.42 + i * 0.00008));
    const networkRxBytes = BigInt(Math.floor(50_000_000 + i * 120_000 * peak * noise()));
    const networkTxBytes = BigInt(Math.floor(30_000_000 + i * 80_000 * peak * noise()));

    return {
      serverId,
      cpu,
      memoryBytes: BigInt(memoryBytes),
      diskBytes: BigInt(diskBytes),
      networkRxBytes,
      networkTxBytes,
      state: 'running',
      recordedAt: new Date(t),
    };
  });

  await prisma.serverStatSnapshot.createMany({ data });
}
