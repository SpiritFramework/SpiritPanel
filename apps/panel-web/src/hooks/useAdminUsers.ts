import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type AdminUserSummary } from '../lib/api';
import {
  computeUserFilterCounts,
  computeUserFleetStats,
  groupUsersByRole,
  matchesUserFleetFilter,
  type UserFleetFilter,
  type UserFleetStats,
  type UserRoleRow,
} from '../components/admin/users/user-fleet-utils';

export function useAdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserFleetFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<{
    data: AdminUserSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(() => {
    setUsers((prev) => ({ ...prev, loading: !prev.data, error: null }));
    return api.admin
      .users({ search: debouncedSearch || undefined })
      .then((data) => {
        setUsers({ data, loading: false, error: null });
        setLastUpdated(new Date());
      })
      .catch((err) => {
        setUsers({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
  }, [debouncedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  }, [loadUsers]);

  const allUsers = users.data ?? [];

  const filteredUsers = useMemo(
    () => allUsers.filter((user) => matchesUserFleetFilter(user, statusFilter)),
    [allUsers, statusFilter],
  );

  const fleetStats = useMemo(() => computeUserFleetStats(allUsers), [allUsers]);
  const roleRows = useMemo(() => groupUsersByRole(allUsers), [allUsers]);
  const filterCounts = useMemo(() => computeUserFilterCounts(allUsers), [allUsers]);

  const activePercent =
    fleetStats.total > 0 ? Math.round((fleetStats.active / fleetStats.total) * 100) : 0;

  const hasActiveFilters = Boolean(debouncedSearch) || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
  }, []);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading: users.loading,
    error: users.error,
    allUsers,
    filteredUsers,
    fleetStats,
    roleRows,
    filterCounts,
    activePercent,
    hasActiveFilters,
    clearFilters,
    refresh,
    reload: loadUsers,
  };
}

export type { UserFleetStats, UserRoleRow, UserFleetFilter };
