import { useMemo, useState } from 'react';
import type { UserDetailController } from '../../../pages/admin/user-detail/useUserDetail';
import { UserServersFleetOverview } from './servers/UserServersFleetOverview';
import { UserServersListPanel } from './servers/UserServersListPanel';
import { UserServersStatsRow } from './servers/UserServersStatsRow';
import {
  computeUserServerFilterCounts,
  computeUserServerFleetStats,
  filterOwnedServers,
  filterSharedAccess,
  groupOwnedServersByStatus,
  type UserServerScope,
  type UserServerStatusFilter,
} from './servers/user-server-utils';

export function UserServersDashboard({ ctrl }: { ctrl: UserDetailController }) {
  const { detail } = ctrl;
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<UserServerScope>('all');
  const [statusFilter, setStatusFilter] = useState<UserServerStatusFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const stats = useMemo(
    () => (detail ? computeUserServerFleetStats(detail) : null),
    [detail],
  );

  const statusRows = useMemo(
    () => (detail ? groupOwnedServersByStatus(detail.servers) : []),
    [detail],
  );

  const statusCounts = useMemo(
    () => (detail ? computeUserServerFilterCounts(detail.servers) : null),
    [detail],
  );

  const scopeCounts = useMemo(
    () =>
      detail
        ? {
            all: detail.servers.length + detail.subuserAccess.length,
            owned: detail.servers.length,
            shared: detail.subuserAccess.length,
          }
        : null,
    [detail],
  );

  const filteredOwned = useMemo(
    () => (detail ? filterOwnedServers(detail.servers, search, statusFilter) : []),
    [detail, search, statusFilter],
  );

  const filteredShared = useMemo(
    () => (detail ? filterSharedAccess(detail.subuserAccess, search) : []),
    [detail, search],
  );

  if (!detail || !stats || !statusCounts || !scopeCounts) return null;

  const runningPercent =
    stats.owned > 0 ? Math.round((stats.running / stats.owned) * 100) : 0;
  const hasActiveFilters =
    search.trim().length > 0 || scope !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setScope('all');
    setStatusFilter('all');
  }

  return (
    <div className="ds-ud-srv">
      <UserServersStatsRow stats={stats} />

      {stats.owned > 0 ? (
        <UserServersFleetOverview
          stats={stats}
          statusRows={statusRows}
          runningPercent={runningPercent}
        />
      ) : null}

      <UserServersListPanel
        ownedServers={detail.servers}
        sharedAccess={detail.subuserAccess}
        filteredOwned={filteredOwned}
        filteredShared={filteredShared}
        search={search}
        onSearchChange={setSearch}
        scope={scope}
        onScopeChange={setScope}
        scopeCounts={scopeCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
