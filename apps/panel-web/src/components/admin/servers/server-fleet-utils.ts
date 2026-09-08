import type { AdminServerSummary } from '../../../lib/api';
import {
  isServerEffectivelyInstalling,
  isServerEffectivelyRunning,
} from '../../../lib/server-runtime';

export type ServerFleetFilter = 'all' | 'running' | 'offline' | 'installing' | 'suspended';

export interface ServerFleetStats {
  total: number;
  running: number;
  offline: number;
  suspended: number;
  installing: number;
  nodes: number;
  owners: number;
}

export interface ServerStatusRow {
  id: Exclude<ServerFleetFilter, 'all'>;
  label: string;
  count: number;
}

export interface ServerNodeRow {
  id: string;
  label: string;
  count: number;
}

export function isServerOffline(server: AdminServerSummary): boolean {
  if (server.suspended) return false;
  if (isServerEffectivelyInstalling(server)) return false;
  return !isServerEffectivelyRunning(server);
}

export function matchesServerFleetFilter(
  server: AdminServerSummary,
  filter: ServerFleetFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'suspended') return server.suspended;
  if (filter === 'running') return isServerEffectivelyRunning(server);
  if (filter === 'installing') return isServerEffectivelyInstalling(server);
  if (filter === 'offline') return isServerOffline(server);
  return true;
}

export function computeServerFleetStats(servers: AdminServerSummary[]): ServerFleetStats {
  const nodes = new Set(servers.map((server) => server.node.id)).size;
  const owners = new Set(servers.map((server) => server.owner.id)).size;
  let running = 0;
  let offline = 0;
  let suspended = 0;
  let installing = 0;

  for (const server of servers) {
    if (server.suspended) {
      suspended++;
      continue;
    }
    if (isServerEffectivelyInstalling(server)) {
      installing++;
      continue;
    }
    if (isServerEffectivelyRunning(server)) running++;
    else offline++;
  }

  return {
    total: servers.length,
    running,
    offline,
    suspended,
    installing,
    nodes,
    owners,
  };
}

export function groupServersByStatus(servers: AdminServerSummary[]): ServerStatusRow[] {
  let running = 0;
  let offline = 0;
  let suspended = 0;
  let installing = 0;

  for (const server of servers) {
    if (matchesServerFleetFilter(server, 'running')) running++;
    if (matchesServerFleetFilter(server, 'offline')) offline++;
    if (matchesServerFleetFilter(server, 'suspended')) suspended++;
    if (matchesServerFleetFilter(server, 'installing')) installing++;
  }

  const rows: ServerStatusRow[] = [
    { id: 'running', label: 'Running', count: running },
    { id: 'offline', label: 'Offline', count: offline },
    { id: 'installing', label: 'Installing', count: installing },
    { id: 'suspended', label: 'Suspended', count: suspended },
  ];

  return rows.filter((row) => row.count > 0);
}

export function groupServersByNode(servers: AdminServerSummary[], limit = 5): ServerNodeRow[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const server of servers) {
    const existing = counts.get(server.node.id);
    if (existing) {
      existing.count++;
    } else {
      counts.set(server.node.id, { label: server.node.name, count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([id, row]) => ({ id, label: row.label, count: row.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeServerFilterCounts(
  servers: AdminServerSummary[],
): Record<ServerFleetFilter, number> {
  const counts: Record<ServerFleetFilter, number> = {
    all: servers.length,
    running: 0,
    offline: 0,
    installing: 0,
    suspended: 0,
  };

  for (const server of servers) {
    if (matchesServerFleetFilter(server, 'running')) counts.running++;
    if (matchesServerFleetFilter(server, 'offline')) counts.offline++;
    if (matchesServerFleetFilter(server, 'installing')) counts.installing++;
    if (matchesServerFleetFilter(server, 'suspended')) counts.suspended++;
  }

  return counts;
}

export function getServerFleetTone(stats: ServerFleetStats): 'live' | 'alert' | 'idle' {
  if (stats.suspended > 0 || stats.installing > 0) return 'alert';
  if (stats.total > 0) return 'live';
  return 'idle';
}
