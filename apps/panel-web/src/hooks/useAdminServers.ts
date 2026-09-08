import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type AdminNodeSummary, type AdminServerSummary } from '../lib/api';
import {
  computeServerFilterCounts,
  computeServerFleetStats,
  groupServersByNode,
  groupServersByStatus,
  matchesServerFleetFilter,
  type ServerFleetFilter,
  type ServerFleetStats,
  type ServerNodeRow,
  type ServerStatusRow,
} from '../components/admin/servers/server-fleet-utils';

export function useAdminServers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServerFleetFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const wantLiveRef = useRef(false);

  const [nodes, setNodes] = useState<{
    data: AdminNodeSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  const [servers, setServers] = useState<{
    data: AdminServerSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setNodes((prev) => ({ ...prev, loading: true, error: null }));
    api.admin
      .nodes()
      .then((data) => {
        if (!cancelled) setNodes({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setNodes({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadServers = useCallback(() => {
    setServers((prev) => ({ ...prev, loading: !prev.data, error: null }));
    return api.admin
      .servers({
        search: debouncedSearch || undefined,
        nodeId: nodeFilter || undefined,
        refresh: wantLiveRef.current,
      })
      .then((data) => {
        wantLiveRef.current = false;
        setServers({ data, loading: false, error: null });
        setLastUpdated(new Date());
      })
      .catch((err) => {
        wantLiveRef.current = false;
        setServers({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
  }, [debouncedSearch, nodeFilter]);

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  const pollRef = useRef(loadServers);
  pollRef.current = loadServers;
  const pollTickRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      pollTickRef.current += 1;
      wantLiveRef.current = pollTickRef.current % 3 === 0;
      void pollRef.current();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    wantLiveRef.current = true;
    try {
      await loadServers();
    } finally {
      setRefreshing(false);
    }
  }, [loadServers]);

  const allServers = servers.data ?? [];
  const nodeList = nodes.data ?? [];

  const filteredServers = useMemo(
    () => allServers.filter((server) => matchesServerFleetFilter(server, statusFilter)),
    [allServers, statusFilter],
  );

  const fleetStats = useMemo(() => computeServerFleetStats(allServers), [allServers]);
  const statusRows = useMemo(() => groupServersByStatus(allServers), [allServers]);
  const nodeRows = useMemo(() => groupServersByNode(allServers), [allServers]);
  const filterCounts = useMemo(() => computeServerFilterCounts(allServers), [allServers]);

  const runningPercent =
    fleetStats.total > 0 ? Math.round((fleetStats.running / fleetStats.total) * 100) : 0;

  const hasActiveFilters =
    Boolean(debouncedSearch) || statusFilter !== 'all' || Boolean(nodeFilter);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setNodeFilter('');
  }, []);

  return {
    search,
    setSearch,
    nodeFilter,
    setNodeFilter,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading: servers.loading,
    error: servers.error,
    nodesLoading: nodes.loading,
    allServers,
    filteredServers,
    nodeList,
    fleetStats,
    statusRows,
    nodeRows,
    filterCounts,
    runningPercent,
    hasActiveFilters,
    clearFilters,
    refresh,
    reload: loadServers,
  };
}

export type { ServerFleetStats, ServerStatusRow, ServerNodeRow, ServerFleetFilter };
