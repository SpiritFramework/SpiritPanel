import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Globe,
  LayoutGrid,
  List,
  MapPin,
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
import { LocationsHeader } from '../../components/admin/locations/LocationsHeader';
import { CreateLocationModal } from '../../components/CreateLocationModal';
import {
  AdminCallout,
  AdminFilterChips,
  AdminPageStack,
  AdminSection,
  AdminSegmentedControl,
} from '../../components/admin/primitives';
import { AdminLayout, Page } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner, EmptyState, Skeleton } from '../../components/ui';

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
        <AdminPageStack>
          <LocationsHeader
            stats={fleetStats}
            refreshing={refreshing}
            loading={loading}
            fullAdmin={fullAdmin}
            onRefresh={() => void refresh()}
            onCreate={() => setShowCreate(true)}
          />

          {locations.error ? (
            <AlertBanner tone="error">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Couldn&apos;t load locations: {locations.error.message}</span>
              </div>
            </AlertBanner>
          ) : null}

          {nodes.error ? (
            <AlertBanner tone="warning">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Node counts may be incomplete: {nodes.error.message}</span>
              </div>
            </AlertBanner>
          ) : null}

          {fleetStats.empty > 0 && !locations.error ? (
            <AdminCallout
              tone="warning"
              icon={MapPin}
              title={`${fleetStats.empty} empty region${fleetStats.empty === 1 ? '' : 's'}`}
              description="Regions without nodes are unused — assign Wings hosts or remove them to keep inventory tidy."
              action={
                <button
                  type="button"
                  className="ds-nd-list-alert-action"
                  onClick={() => setStatusFilter('empty')}
                >
                  Show empty
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              }
            />
          ) : null}

          {!loading && locationList.length > 0 ? (
            <LocationsFleetOverview metrics={allMetrics} />
          ) : null}

          <AdminSection
            icon={Globe}
            eyebrow="Inventory"
            title="All regions"
            description="Search, filter, and open any geographic region"
            badge={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}
          >
            <div className="ds-nd-list-toolbar">
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
              <AdminSegmentedControl
                label="View mode"
                value={viewMode}
                onChange={(id) => setViewMode(id as LocationsViewMode)}
                options={[
                  {
                    id: 'table',
                    label: (
                      <>
                        <List className="h-3.5 w-3.5" aria-hidden />
                        Table
                      </>
                    ),
                  },
                  {
                    id: 'cards',
                    label: (
                      <>
                        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                        Cards
                      </>
                    ),
                  },
                ]}
              />
            </div>

            <AdminFilterChips
              label="Region filters"
              value={statusFilter}
              onChange={(id) => setStatusFilter(id as LocationFleetFilter)}
              options={FILTER_OPTIONS.map((opt) => ({
                id: opt.id,
                label: opt.label,
                count: filterCounts[opt.id],
                alert: opt.id === 'empty' && filterCounts.empty > 0,
              }))}
            />

            <div className="ds-nd-list-meta">
              <span>
                Showing <strong>{filteredMetrics.length}</strong>
                {hasActiveFilters ? ` of ${allMetrics.length}` : ''} regions
              </span>
              {hasActiveFilters ? (
                <button type="button" className="ds-nd-list-clear" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="ds-nd-list-card-grid" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="ds-nd-list-card-skeleton" />
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
          </AdminSection>

          {fullAdmin && showCreate ? (
            <CreateLocationModal
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                setShowCreate(false);
                void refresh();
              }}
            />
          ) : null}
        </AdminPageStack>
      </Page>
    </AdminLayout>
  );
}
