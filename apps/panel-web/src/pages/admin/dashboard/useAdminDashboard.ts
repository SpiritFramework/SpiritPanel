import { useCallback, useEffect } from 'react';
import { api, type AdminDashboardResponse } from '../../../lib/api';
import { useAsyncData } from '../../../hooks/useAsyncData';
import {
  EMPTY_DASHBOARD_STATS,
  EMPTY_TICKET_QUEUE,
  type DashboardData,
} from './types';

const DASHBOARD_KEY = 'admin-dashboard';
const POLL_MS = 45_000;

async function fetchDashboard(): Promise<DashboardData> {
  const data: AdminDashboardResponse = await api.admin.dashboard();
  return {
    stats: data.stats ?? EMPTY_DASHBOARD_STATS,
    ticketQueue: data.ticketQueue ?? EMPTY_TICKET_QUEUE,
    nodeHealth: data.nodeHealth ?? [],
    recentServers: data.recentServers ?? [],
    recentActivity: data.recentActivity ?? [],
  };
}

export function useAdminDashboard() {
  const { data, loading, validating, error, refetch } = useAsyncData(DASHBOARD_KEY, fetchDashboard);

  const stats = data?.stats ?? EMPTY_DASHBOARD_STATS;
  const ticketQueue = data?.ticketQueue ?? EMPTY_TICKET_QUEUE;
  const nodeHealth = data?.nodeHealth ?? [];
  const recentServers = data?.recentServers ?? [];
  const recentActivity = data?.recentActivity ?? [];

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const id = window.setInterval(() => void refetch(), POLL_MS);
    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch]);

  return {
    stats,
    ticketQueue,
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
