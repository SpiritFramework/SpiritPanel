import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Puzzle, Search } from 'lucide-react';
import { api, type AdminPanelPlugin } from '../../lib/api';
import { AdminLayout, Card, Page } from '../../components/Layout';
import { PluginFleetCard } from '../../components/admin/plugins/PluginFleetCard';
import { PluginFleetTable } from '../../components/admin/plugins/PluginFleetTable';
import { PluginsFleetOverview } from '../../components/admin/plugins/PluginsFleetOverview';
import { PluginsHeader } from '../../components/admin/plugins/PluginsHeader';
import {
  computePluginFleetStats,
  matchesPluginFilter,
  matchesPluginSearch,
  type PluginFleetFilter,
} from '../../components/admin/plugins/plugin-fleet-utils';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AlertBanner, EmptyState, Skeleton } from '../../components/ui';

const FILTER_OPTIONS: { id: PluginFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'enabled', label: 'Active' },
  { id: 'disabled', label: 'Off' },
];

type PluginsViewMode = 'cards' | 'table';

export function AdminPluginsPage() {
  const [plugins, setPlugins] = useState<AdminPanelPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PluginFleetFilter>('all');
  const [viewMode, setViewMode] = useState<PluginsViewMode>('cards');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.admin.plugins();
      setPlugins(res.plugins);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fleetStats = useMemo(() => computePluginFleetStats(plugins), [plugins]);

  const filtered = useMemo(
    () =>
      plugins.filter(
        (p) => matchesPluginFilter(p, statusFilter) && matchesPluginSearch(p, debouncedSearch),
      ),
    [plugins, statusFilter, debouncedSearch],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<PluginFleetFilter, number> = { all: plugins.length, enabled: 0, disabled: 0 };
    for (const p of plugins) {
      if (matchesPluginFilter(p, 'enabled')) counts.enabled++;
      if (matchesPluginFilter(p, 'disabled')) counts.disabled++;
    }
    return counts;
  }, [plugins]);

  const hasActiveFilters = Boolean(debouncedSearch) || statusFilter !== 'all';
  const initialLoading = loading && plugins.length === 0;

  async function togglePlugin(plugin: AdminPanelPlugin) {
    setBusyId(plugin.id);
    setError('');
    try {
      const res = await api.admin.updatePlugin(plugin.id, { enabled: !plugin.enabled });
      setPlugins((prev) => prev.map((p) => (p.id === plugin.id ? { ...p, ...res.plugin } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plugin');
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  if (initialLoading) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Page className="ds-plg-page">
        <PluginsHeader stats={fleetStats} refreshing={refreshing} onRefresh={() => void refresh()} />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            {error}
          </AlertBanner>
        ) : null}

        <PluginsFleetOverview />

        <Card title="Installed plugins">
          <div className="ds-nodes-toolbar mb-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plugins, games, server tabs…"
                className="ds-field ds-field--icon-left w-full"
                aria-label="Search plugins"
              />
            </div>
            <div className="ds-nodes-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`ds-nodes-view-btn${viewMode === 'cards' ? ' ds-nodes-view-btn--active' : ''}`}
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Cards
              </button>
              <button
                type="button"
                className={`ds-nodes-view-btn${viewMode === 'table' ? ' ds-nodes-view-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                Table
              </button>
            </div>
          </div>

          <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Plugin filters">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === opt.id}
                className={`ds-nodes-status-pill${statusFilter === opt.id ? ' ds-nodes-status-pill--active' : ''}`}
                onClick={() => setStatusFilter(opt.id)}
              >
                {opt.label}
                <span className="ds-nodes-status-pill-count">{filterCounts[opt.id]}</span>
              </button>
            ))}
            {hasActiveFilters ? (
              <button type="button" className="ds-nodes-clear-filters" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>

          {lastUpdated ? (
            <p className="ds-text-xs ds-text-muted mb-3">
              Updated {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Puzzle className="h-8 w-8" />}
              title={hasActiveFilters ? 'No matching plugins' : 'No plugins installed'}
              description={
                hasActiveFilters
                  ? 'Try a different search or filter.'
                  : 'Built-in plugins will appear here after the panel API starts.'
              }
            />
          ) : viewMode === 'table' ? (
            <PluginFleetTable rows={filtered} busyId={busyId} onToggle={(p) => void togglePlugin(p)} />
          ) : (
            <div className="ds-plg-card-grid">
              {filtered.map((plugin) => (
                <PluginFleetCard
                  key={plugin.id}
                  plugin={plugin}
                  busy={busyId === plugin.id}
                  onToggle={() => void togglePlugin(plugin)}
                />
              ))}
            </div>
          )}

          {refreshing && plugins.length > 0 ? (
            <div className="ds-plg-card-grid mt-3" aria-hidden>
              <Skeleton className="ds-plg-card-skeleton" />
            </div>
          ) : null}
        </Card>
      </Page>
    </AdminLayout>
  );
}
