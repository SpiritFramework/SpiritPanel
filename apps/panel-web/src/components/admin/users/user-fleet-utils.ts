import type { AdminUserSummary } from '../../../lib/api';

export type UserFleetFilter =
  | 'all'
  | 'active'
  | 'suspended'
  | 'admin'
  | 'staff'
  | 'user'
  | 'with_servers';

export type UserFleetStatus = 'active' | 'suspended';

export interface UserFleetStats {
  total: number;
  active: number;
  suspended: number;
  admins: number;
  staff: number;
  users: number;
  rootAdmins: number;
  withServers: number;
  totalServers: number;
  totalSubuserAccess: number;
  totalApiKeys: number;
}

export interface UserRoleRow {
  id: 'admin' | 'staff' | 'user';
  label: string;
  count: number;
}

export function getUserFleetStatus(user: AdminUserSummary): UserFleetStatus {
  return user.suspended ? 'suspended' : 'active';
}

export function matchesUserFleetFilter(user: AdminUserSummary, filter: UserFleetFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return !user.suspended;
  if (filter === 'suspended') return user.suspended;
  if (filter === 'admin') return user.role === 'admin';
  if (filter === 'staff') return user.role === 'staff';
  if (filter === 'user') return user.role === 'user';
  if (filter === 'with_servers') return user.serverCount > 0;
  return true;
}

export function computeUserFleetStats(users: AdminUserSummary[]): UserFleetStats {
  return users.reduce(
    (acc, user) => ({
      total: acc.total + 1,
      active: acc.active + (user.suspended ? 0 : 1),
      suspended: acc.suspended + (user.suspended ? 1 : 0),
      admins: acc.admins + (user.role === 'admin' ? 1 : 0),
      staff: acc.staff + (user.role === 'staff' ? 1 : 0),
      users: acc.users + (user.role === 'user' ? 1 : 0),
      rootAdmins: acc.rootAdmins + (user.rootAdmin ? 1 : 0),
      withServers: acc.withServers + (user.serverCount > 0 ? 1 : 0),
      totalServers: acc.totalServers + user.serverCount,
      totalSubuserAccess: acc.totalSubuserAccess + user.subuserCount,
      totalApiKeys: acc.totalApiKeys + user.apiKeyCount,
    }),
    {
      total: 0,
      active: 0,
      suspended: 0,
      admins: 0,
      staff: 0,
      users: 0,
      rootAdmins: 0,
      withServers: 0,
      totalServers: 0,
      totalSubuserAccess: 0,
      totalApiKeys: 0,
    },
  );
}

export function groupUsersByRole(users: AdminUserSummary[]): UserRoleRow[] {
  const stats = computeUserFleetStats(users);
  const rows: UserRoleRow[] = [
    { id: 'admin', label: 'Admins', count: stats.admins },
    { id: 'staff', label: 'Staff', count: stats.staff },
    { id: 'user', label: 'Users', count: stats.users },
  ];
  return rows.filter((row) => row.count > 0);
}

export function computeUserFilterCounts(users: AdminUserSummary[]): Record<UserFleetFilter, number> {
  const counts: Record<UserFleetFilter, number> = {
    all: users.length,
    active: 0,
    suspended: 0,
    admin: 0,
    staff: 0,
    user: 0,
    with_servers: 0,
  };

  for (const user of users) {
    if (matchesUserFleetFilter(user, 'active')) counts.active++;
    if (matchesUserFleetFilter(user, 'suspended')) counts.suspended++;
    if (matchesUserFleetFilter(user, 'admin')) counts.admin++;
    if (matchesUserFleetFilter(user, 'staff')) counts.staff++;
    if (matchesUserFleetFilter(user, 'user')) counts.user++;
    if (matchesUserFleetFilter(user, 'with_servers')) counts.with_servers++;
  }

  return counts;
}
