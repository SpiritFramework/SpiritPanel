import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  EMPTY_DASHBOARD_STATS,
  type DashboardActivityItem,
  type DashboardData,
  type DashboardNodeHealth,
  type DashboardRecentServer,
  type DashboardStats,
} from './types';

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS);
  const [nodeHealth, setNodeHealth] = useState<DashboardNodeHealth[]>([]);
  const [recentServers, setRecentServers] = useState<DashboardRecentServer[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const applyData = useCallback((data: Partial<DashboardData>) => {
    setStats({ ...EMPTY_DASHBOARD_STATS, ...(data.stats ?? {}) });
    setNodeHealth(data.nodeHealth ?? []);
    setRecentServers(data.recentServers ?? []);
    setRecentActivity(data.recentActivity ?? []);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.admin.dashboard();
      applyData({
        stats: (data.stats ?? EMPTY_DASHBOARD_STATS) as DashboardStats,
        nodeHealth: (data.nodeHealth ?? []) as DashboardNodeHealth[],
        recentServers: (data.recentServers ?? []) as DashboardRecentServer[],
        recentActivity: (data.recentActivity ?? []) as DashboardActivityItem[],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyData]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    stats,
    nodeHealth,
    recentServers,
    recentActivity,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}

export type AdminDashboardController = ReturnType<typeof useAdminDashboard>;
