import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type AdminEggSummary, type AdminNestSummary } from '../lib/api';
import {
  computeEggFilterCounts,
  computeNestFilterCounts,
  computeNestFleetStats,
  groupEggsByNest,
  matchesEggFilter,
  matchesNestFilter,
  type EggListFilter,
  type NestFleetStats,
  type NestListFilter,
} from '../components/admin/nests/nest-fleet-utils';

export function useAdminNests() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nestFilter, setNestFilter] = useState('');
  const [nestStatusFilter, setNestStatusFilter] = useState<NestListFilter>('all');
  const [eggStatusFilter, setEggStatusFilter] = useState<EggListFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [nests, setNests] = useState<{
    data: AdminNestSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  const [eggs, setEggs] = useState<{
    data: AdminEggSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setNests((prev) => ({ ...prev, loading: !prev.data, error: null }));
    setEggs((prev) => ({ ...prev, loading: !prev.data, error: null }));
    const term = debouncedSearch || undefined;
    try {
      const [nestData, eggData] = await Promise.all([
        api.admin.nests({ search: term }),
        api.admin.eggs({ search: term, nestId: nestFilter || undefined }),
      ]);
      setNests({ data: nestData, loading: false, error: null });
      setEggs({ data: eggData, loading: false, error: null });
      setLastUpdated(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setNests({ data: null, loading: false, error });
      setEggs({ data: null, loading: false, error });
    }
  }, [debouncedSearch, nestFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const allNests = nests.data ?? [];
  const allEggs = eggs.data ?? [];

  const fleetStats = useMemo(
    () => computeNestFleetStats(allNests, allEggs),
    [allNests, allEggs],
  );

  const filteredNests = useMemo(
    () => allNests.filter((n) => matchesNestFilter(n, nestStatusFilter)),
    [allNests, nestStatusFilter],
  );

  const filteredEggs = useMemo(
    () => allEggs.filter((e) => matchesEggFilter(e, eggStatusFilter)),
    [allEggs, eggStatusFilter],
  );

  const nestFilterCounts = useMemo(() => computeNestFilterCounts(allNests), [allNests]);
  const eggFilterCounts = useMemo(() => computeEggFilterCounts(allEggs), [allEggs]);
  const nestDistribution = useMemo(() => groupEggsByNest(allEggs), [allEggs]);

  const hasActiveNestFilters = nestStatusFilter !== 'all' || Boolean(search.trim());
  const hasActiveEggFilters =
    eggStatusFilter !== 'all' || Boolean(nestFilter) || Boolean(search.trim());

  function clearNestFilters() {
    setSearch('');
    setNestStatusFilter('all');
  }

  function clearEggFilters() {
    setSearch('');
    setNestFilter('');
    setEggStatusFilter('all');
  }

  return {
    search,
    setSearch,
    nestFilter,
    setNestFilter,
    nestStatusFilter,
    setNestStatusFilter,
    eggStatusFilter,
    setEggStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading: nests.loading || eggs.loading,
    error: nests.error ?? eggs.error,
    allNests,
    allEggs,
    filteredNests,
    filteredEggs,
    fleetStats,
    nestFilterCounts,
    eggFilterCounts,
    nestDistribution,
    hasActiveNestFilters,
    hasActiveEggFilters,
    clearNestFilters,
    clearEggFilters,
    refresh,
    reload: load,
  };
}

export type AdminNestsController = ReturnType<typeof useAdminNests>;
