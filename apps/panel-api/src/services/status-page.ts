import type { Node, Server } from '@prisma/client';
import { computeNodeCapacity } from '../lib/node-capacity.js';
import { mapWithConcurrency } from '../lib/map-concurrency.js';
import { probeNodeHealth } from '../lib/node-health.js';
import { prisma } from '../lib/prisma.js';
import { serverResourceContribution } from '../lib/server-resources.js';
import type { StatusPageDetail } from '../lib/panel-settings.js';
import { getNodeLiveUsageSummary } from './node-stats.js';

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted' | 'info';

export interface StatusServerRow {
  id: string;
  name: string;
  statusTone: StatusTone;
  statusLabel: string;
  suspended: boolean;
  containerState: string | null;
}

export interface StatusNodePayload {
  id: string;
  name: string;
  location: { short: string; long: string; flagUrl: string | null };
  online: boolean;
  maintenanceMode: boolean;
  counts: {
    total: number;
    running: number;
    offline: number;
    suspended: number;
    installing: number;
  };
  allocated: {
    memoryMiB: number;
    diskMiB: number;
    memoryPercent: number;
    diskPercent: number;
    /** Sum of server CPU limits (100 = 1 core). */
    cpuAllocated: number;
    /** Host CPU capacity in the same units (cores × 100), when Wings reports cores. */
    cpuLimit: number;
    /** Host CPU thread/core count from Wings, when known. */
    cpuCores: number | null;
    effectiveMemoryLimitMiB: number;
    effectiveDiskLimitMiB: number;
  };
  live: {
    memoryBytes: number;
    diskBytes: number;
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    serverCount: number;
  } | null;
  servers?: StatusServerRow[];
}

export interface StatusNodesResponse {
  detail: StatusPageDetail;
  nodes: StatusNodePayload[];
  summary: {
    nodesOnline: number;
    nodesTotal: number;
    serversRunning: number;
    serversTotal: number;
  };
}

function normalizeState(raw: string | null | undefined): string {
  if (!raw) return 'offline';
  return raw.toLowerCase().replace(/\s+/g, '_');
}

function classifyServer(server: {
  status: string;
  suspended: boolean;
  installStatus: string | null;
  containerState: string | null;
}): { bucket: 'running' | 'offline' | 'suspended' | 'installing'; tone: StatusTone; label: string } {
  if (server.suspended || server.status === 'suspended') {
    return { bucket: 'suspended', tone: 'warning', label: 'Suspended' };
  }

  const installing =
    server.status === 'installing' ||
    server.installStatus === 'installing' ||
    normalizeState(server.containerState) === 'installing';
  if (installing) {
    return { bucket: 'installing', tone: 'info', label: 'Installing' };
  }

  const state = normalizeState(server.containerState);
  if (state === 'running' || state === 'starting') {
    return { bucket: 'running', tone: 'success', label: state === 'starting' ? 'Starting' : 'Running' };
  }
  if (state === 'stopping') {
    return { bucket: 'offline', tone: 'warning', label: 'Stopping' };
  }
  if (state === 'crashed' || state === 'crash') {
    return { bucket: 'offline', tone: 'danger', label: 'Crashed' };
  }
  return { bucket: 'offline', tone: 'muted', label: 'Offline' };
}

function emptyLive() {
  return {
    memoryBytes: 0,
    diskBytes: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    diskPercent: 0,
    serverCount: 0,
  };
}

async function buildNodeStatus(
  node: Node & {
    location: { short: string; long: string; flagUrl: string | null };
    servers: Server[];
  },
  detail: StatusPageDetail,
): Promise<StatusNodePayload> {
  const allocated = node.servers.reduce(
    (acc, s) => ({
      memory: acc.memory + serverResourceContribution(s.memory),
      disk: acc.disk + serverResourceContribution(s.disk),
      cpu: acc.cpu + s.cpu,
    }),
    { memory: 0, disk: 0, cpu: 0 },
  );
  const capacity = computeNodeCapacity(node, allocated);

  const counts = {
    total: node.servers.length,
    running: 0,
    offline: 0,
    suspended: 0,
    installing: 0,
  };
  const serverRows: StatusServerRow[] = [];
  for (const server of node.servers) {
    const classified = classifyServer(server);
    counts[classified.bucket] += 1;
    if (detail === 'servers') {
      serverRows.push({
        id: server.id,
        name: server.name,
        statusTone: classified.tone,
        statusLabel: classified.label,
        suspended: server.suspended,
        containerState: server.containerState,
      });
    }
  }

  const health = await probeNodeHealth(node);
  const cpuCores = health.cpuCores;
  const cpuLimit = cpuCores != null && cpuCores > 0 ? cpuCores * 100 : 0;

  let live: StatusNodePayload['live'] = null;
  if (health.online) {
    const summary = await getNodeLiveUsageSummary(node, node.servers);
    if (summary) {
      const memLimitBytes = capacity.effectiveMemoryLimit * 1024 * 1024;
      const diskLimitBytes = capacity.effectiveDiskLimit * 1024 * 1024;
      live = {
        memoryBytes: summary.liveMemoryBytes,
        diskBytes: summary.liveDiskBytes,
        cpuPercent: summary.liveCpuPercent,
        memoryPercent:
          memLimitBytes > 0
            ? Math.min(100, Math.round((summary.liveMemoryBytes / memLimitBytes) * 100))
            : 0,
        diskPercent:
          diskLimitBytes > 0
            ? Math.min(100, Math.round((summary.liveDiskBytes / diskLimitBytes) * 100))
            : 0,
        serverCount: summary.liveServerCount,
      };
    }
  } else {
    live = emptyLive();
  }

  return {
    id: node.id,
    name: node.name,
    location: {
      short: node.location.short,
      long: node.location.long,
      flagUrl: node.location.flagUrl,
    },
    online: health.online,
    maintenanceMode: node.maintenanceMode,
    counts,
    allocated: {
      memoryMiB: capacity.allocatedMemory,
      diskMiB: capacity.allocatedDisk,
      memoryPercent: capacity.memoryUsedPercent,
      diskPercent: capacity.diskUsedPercent,
      cpuAllocated: allocated.cpu,
      cpuLimit,
      cpuCores,
      effectiveMemoryLimitMiB: capacity.effectiveMemoryLimit,
      effectiveDiskLimitMiB: capacity.effectiveDiskLimit,
    },
    live,
    ...(detail === 'servers' ? { servers: serverRows } : {}),
  };
}

export async function getStatusNodesPayload(detail: StatusPageDetail): Promise<StatusNodesResponse> {
  const nodes = await prisma.node.findMany({
    include: {
      location: { select: { short: true, long: true, flagUrl: true } },
      servers: true,
    },
    orderBy: { name: 'asc' },
  });

  const payloads = await mapWithConcurrency(nodes, 2, (node) => buildNodeStatus(node, detail));

  return {
    detail,
    nodes: payloads,
    summary: {
      nodesOnline: payloads.filter((n) => n.online).length,
      nodesTotal: payloads.length,
      serversRunning: payloads.reduce((sum, n) => sum + n.counts.running, 0),
      serversTotal: payloads.reduce((sum, n) => sum + n.counts.total, 0),
    },
  };
}
