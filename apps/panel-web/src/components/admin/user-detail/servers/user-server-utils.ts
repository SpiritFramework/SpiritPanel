import type { AdminUserDetail } from '../../../../lib/api';
import {
  isServerEffectivelyInstalling,
  isServerEffectivelyRunning,
  matchesServerStatusFilter,
} from '../../../../lib/server-runtime';

export type UserOwnedServer = AdminUserDetail['servers'][number];
export type UserSharedAccess = AdminUserDetail['subuserAccess'][number];

export type UserServerScope = 'all' | 'owned' | 'shared';
export type UserServerStatusFilter = 'all' | 'running' | 'offline' | 'suspended' | 'installing';

export interface UserServerFleetStats {
  owned: number;
  shared: number;
  total: number;
  running: number;
  offline: number;
  suspended: number;
  installing: number;
  nodes: number;
}

export interface UserServerStatusRow {
  id: Exclude<UserServerStatusFilter, 'all'>;
  label: string;
  count: number;
}

export function isServerOffline(server: UserOwnedServer): boolean {
  if (server.suspended) return false;
  if (isServerEffectivelyInstalling(server)) return false;
  return !isServerEffectivelyRunning(server);
}

export function matchesUserServerStatusFilter(
  server: UserOwnedServer,
  filter: UserServerStatusFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'offline') return isServerOffline(server);
  return matchesServerStatusFilter(server, filter);
}

export function computeUserServerFleetStats(detail: AdminUserDetail): UserServerFleetStats {
  const owned = detail.servers;
  const nodes = new Set(owned.map((server) => server.node)).size;
  let running = 0;
  let offline = 0;
  let suspended = 0;
  let installing = 0;

  for (const server of owned) {
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
    owned: owned.length,
    shared: detail.subuserAccess.length,
    total: owned.length + detail.subuserAccess.length,
    running,
    offline,
    suspended,
    installing,
    nodes,
  };
}

export function groupOwnedServersByStatus(servers: UserOwnedServer[]): UserServerStatusRow[] {
  let running = 0;
  let offline = 0;
  let suspended = 0;
  let installing = 0;

  for (const server of servers) {
    if (matchesUserServerStatusFilter(server, 'running')) running++;
    if (matchesUserServerStatusFilter(server, 'offline')) offline++;
    if (matchesUserServerStatusFilter(server, 'suspended')) suspended++;
    if (matchesUserServerStatusFilter(server, 'installing')) installing++;
  }

  const rows: UserServerStatusRow[] = [
    { id: 'running', label: 'Running', count: running },
    { id: 'offline', label: 'Offline', count: offline },
    { id: 'installing', label: 'Installing', count: installing },
    { id: 'suspended', label: 'Suspended', count: suspended },
  ];

  return rows.filter((row) => row.count > 0);
}

export function filterOwnedServers(
  servers: UserOwnedServer[],
  search: string,
  statusFilter: UserServerStatusFilter,
): UserOwnedServer[] {
  const query = search.trim().toLowerCase();
  return servers.filter((server) => {
    if (!matchesUserServerStatusFilter(server, statusFilter)) return false;
    if (!query) return true;
    return (
      server.name.toLowerCase().includes(query) ||
      server.egg.toLowerCase().includes(query) ||
      server.node.toLowerCase().includes(query) ||
      server.address.toLowerCase().includes(query) ||
      server.id.toLowerCase().includes(query)
    );
  });
}

export function filterSharedAccess(rows: UserSharedAccess[], search: string): UserSharedAccess[] {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter(
    (row) =>
      row.serverName.toLowerCase().includes(query) ||
      row.owner.toLowerCase().includes(query) ||
      row.serverId.toLowerCase().includes(query),
  );
}

export function computeUserServerFilterCounts(
  servers: UserOwnedServer[],
): Record<UserServerStatusFilter, number> {
  const counts: Record<UserServerStatusFilter, number> = {
    all: servers.length,
    running: 0,
    offline: 0,
    suspended: 0,
    installing: 0,
  };

  for (const server of servers) {
    if (matchesUserServerStatusFilter(server, 'running')) counts.running++;
    if (matchesUserServerStatusFilter(server, 'offline')) counts.offline++;
    if (matchesUserServerStatusFilter(server, 'suspended')) counts.suspended++;
    if (matchesUserServerStatusFilter(server, 'installing')) counts.installing++;
  }

  return counts;
}
