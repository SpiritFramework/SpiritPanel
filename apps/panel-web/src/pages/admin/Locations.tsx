import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Globe,
  HardDrive,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { LocationFleetCard } from '../../components/admin/locations/LocationFleetCard';
import { LocationFleetTable } from '../../components/admin/locations/LocationFleetTable';
import {
  buildLocationMetrics,
  computeLocationFleetStats,
  matchesLocationFilter,
  matchesLocationSearch,
  type LocationFleetFilter,
} from '../../components/admin/locations/location-fleet-utils';
import { LocationsFleetOverview } from '../../components/admin/locations/LocationsFleetOverview';
import { LocationsFleetStats } from '../../components/admin/locations/LocationsFleetStats';
import { CreateLocationModal } from '../../components/CreateLocationModal';
import { AdminLayout, Button, Card, Page } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner, DsIcon, EmptyState, PageHeader, Skeleton } from '../../components/ui';

const FILTER_OPTIONS: { id: LocationFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_use', label: 'In use' },
  { id: 'empty', label: 'Empty' },
];

type LocationsViewMode = 'table' | 'cards';

export function AdminLocations() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationFleetFilter>('all');
  const [viewMode, setViewMode] = useState<LocationsViewMode>('cards');
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [locations, setLocations] = useState<{
    data: AdminLocationSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  const [nodes, setNodes] = useState<{
    data: AdminNodeSummary[] | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadLocations = useCallback(() => {
    setLocations((prev) => ({ ...prev, loading: !prev.data, error: null }));
    return api.admin
      .locations({ search: debouncedSearch || undefined })
      .then((data) => {
        setLocations({ data, loading: false, error: null });
        setLastUpdated(new Date());
      })
      .catch((err) => {
        setLocations({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
  }, [debouncedSearch]);

  const loadNodes = useCallback(() => {
    setNodes((prev) => ({ ...prev, loading: !prev.data, error: null }));
    return api.admin
      .nodes()
      .then((data) => setNodes({ data, loading: false, error: null }))
      .catch((err) => {
        setNodes({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLocations(), loadNodes()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadLocations, loadNodes]);

  const locationList = locations.data ?? [];
  const nodeList = nodes.data ?? [];
  const loading = locations.loading && !locations.data;

  const allMetrics = useMemo(
    () => buildLocationMetrics(locationList, nodeList),
    [locationList, nodeList],
  );

  const fleetStats = useMemo(
    () => computeLocationFleetStats(locationList, nodeList),
    [locationList, nodeList],
  );

  const filteredMetrics = useMemo(() => {
    return allMetrics.filter(
      (m) => matchesLocationFilter(m, statusFilter) && matchesLocationSearch(m, debouncedSearch),
    );
  }, [allMetrics, statusFilter, debouncedSearch]);

  const filterCounts = useMemo(() => {
    const counts: Record<LocationFleetFilter, number> = {
      all: allMetrics.length,
      in_use: 0,
      empty: 0,
    };
    for (const m of allMetrics) {
      if (matchesLocationFilter(m, 'in_use')) counts.in_use++;
      if (matchesLocationFilter(m, 'empty')) counts.empty++;
    }
    return counts;
  }, [allMetrics]);

  const hasActiveFilters = Boolean(debouncedSearch) || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  return (
    <AdminLayout>
      <Page>
        <PageHeader
          title="Locations"
          description="Geographic regions that group your Wings nodes and server fleet"
          icon={<DsIcon icon={Globe} className="ds-icon--muted" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refresh()}
                disabled={refreshing || loading}
                aria-label="Refresh locations"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`}
                  aria-hidden
                />
                Refresh
              </Button>
              <Link to="/admin/nodes">
                <Button type="button" variant="secondary" size="sm">
                  <HardDrive className="h-3.5 w-3.5" aria-hidden />
                  Nodes
                </Button>
              </Link>
              {fullAdmin ? (
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add location
                </Button>
              ) : null}
            </div>
          }
        />

        {locations.error ? (
          <AlertBanner tone="error" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Couldn&apos;t load locations: {locations.error.message}</span>
            </div>
          </AlertBanner>
        ) : null}

        {nodes.error ? (
          <AlertBanner tone="warning" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Node counts may be incomplete: {nodes.error.message}</span>
            </div>
          </AlertBanner>
        ) : null}

        {!loading || locationList.length > 0 ? (
          <LocationsFleetStats
            stats={fleetStats}
            onShowEmpty={() => setStatusFilter('empty')}
          />
        ) : null}

        {!loading && locationList.length > 0 ? (
          <LocationsFleetOverview metrics={allMetrics} />
        ) : null}

        <Card title="All regions">
          <div className="ds-nodes-toolbar mb-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, UUID…"
                className="ds-field ds-field--icon-left w-full"
                aria-label="Search locations"
              />
            </div>
            <div className="ds-nodes-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`ds-nodes-view-btn${viewMode === 'table' ? ' ds-nodes-view-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                Table
              </button>
              <button
                type="button"
                className={`ds-nodes-view-btn${viewMode === 'cards' ? ' ds-nodes-view-btn--active' : ''}`}
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Cards
              </button>
            </div>
          </div>

          <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Location filters">
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

          {loading ? (
            <div className="ds-locs-card-grid" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="ds-locs-card-skeleton" />
              ))}
            </div>
          ) : filteredMetrics.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'No matching regions' : 'No locations yet'}
              description={
                hasActiveFilters
                  ? 'Try a different search or filter.'
                  : 'Add a region to organize your nodes.'
              }
            />
          ) : viewMode === 'cards' ? (
            <div className="ds-locs-card-grid">
              {filteredMetrics.map((metrics) => (
                <LocationFleetCard key={metrics.location.id} metrics={metrics} />
              ))}
            </div>
          ) : (
            <LocationFleetTable rows={filteredMetrics} />
          )}
        </Card>

        {fullAdmin && showCreate ? (
          <CreateLocationModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              void refresh();
            }}
          />
        ) : null}
      </Page>
    </AdminLayout>
  );
}
