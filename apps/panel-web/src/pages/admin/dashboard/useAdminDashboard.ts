import { useCallback } from 'react';
import { api } from '../../../lib/api';
import { useAsyncData } from '../../../hooks/useAsyncData';
import {
  EMPTY_DASHBOARD_STATS,
  type DashboardActivityItem,
  type DashboardData,
  type DashboardNodeHealth,
  type DashboardRecentServer,
  type DashboardStats,
} from './types';

const DASHBOARD_KEY = 'admin-dashboard';

async function fetchDashboard(): Promise<DashboardData> {
  const data = await api.admin.dashboard();
  return {
    stats: (data.stats ?? EMPTY_DASHBOARD_STATS) as DashboardStats,
    nodeHealth: (data.nodeHealth ?? []) as DashboardNodeHealth[],
    recentServers: (data.recentServers ?? []) as DashboardRecentServer[],
    recentActivity: (data.recentActivity ?? []) as DashboardActivityItem[],
  };
}

export function useAdminDashboard() {
  const { data, loading, validating, error, refetch } = useAsyncData(DASHBOARD_KEY, fetchDashboard);

  const stats = data?.stats ?? EMPTY_DASHBOARD_STATS;
  const nodeHealth = data?.nodeHealth ?? [];
  const recentServers = data?.recentServers ?? [];
  const recentActivity = data?.recentActivity ?? [];

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    stats,
    nodeHealth,
    recentServers,
    recentActivity,
    loading,
    refreshing: validating && data !== null,
    error,
    refresh,
  };
}

export type AdminDashboardController = ReturnType<typeof useAdminDashboard>;
