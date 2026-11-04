import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  HardDrive,
  LayoutGrid,
  List,
  Plus,
  Search,
  Server,
} from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { AdminNodeTable } from '../../components/AdminNodeRow';
import { AdminLayout, FilterSelect, Page } from '../../components/Layout';
import { NodeFleetCard } from '../../components/admin/nodes/NodeFleetCard';
import { NodesFleetOverview } from '../../components/admin/nodes/NodesFleetOverview';
import { NodesHeader } from '../../components/admin/nodes/NodesHeader';
import { NodesUnreachableBanner } from '../../components/admin/nodes/NodesUnreachableBanner';
import {
  computeFleetStats,
  groupNodesByLocation,
  matchesFleetFilter,
  type NodeFleetFilter,
} from '../../components/admin/nodes/node-fleet-utils';
import {
  AdminFilterChips,
  AdminPageStack,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../../components/admin/primitives';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner, DsIcon, EmptyState, Skeleton } from '../../components/ui';

const FILTER_OPTIONS: { id: NodeFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'offline', label: 'Offline' },
];

type NodesViewMode = 'table' | 'cards';

export function AdminNodes() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeFleetFilter>('all');
  const [viewMode, setViewMode] = useState<NodesViewMode>('table');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setLocations((prev) => ({ ...prev, loading: true, error: null }));
    api.admin
      .locations()
      .then((data) => {
        if (!cancelled) setLocations({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setLocations({
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

  const loadNodes = useCallback(() => {
    setNodes((prev) => ({ ...prev, loading: !prev.data, error: null }));
    return api.admin
      .nodes({
        search: debouncedSearch || undefined,
        locationId: locationFilter || undefined,
        maintenance: statusFilter === 'maintenance' ? 'true' : undefined,
      })
      .then((data) => {
        setNodes({ data, loading: false, error: null });
        setLastUpdated(new Date());
      })
      .catch((err) => {
        setNodes({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
  }, [debouncedSearch, locationFilter, statusFilter]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNodes();
    } finally {
      setRefreshing(false);
    }
  }, [loadNodes]);

  const allNodes = nodes.data ?? [];
  const locationList = locations.data ?? [];

  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => matchesFleetFilter(node, statusFilter));
  }, [allNodes, statusFilter]);

  const fleetStats = useMemo(() => computeFleetStats(allNodes), [allNodes]);
  const locationRows = useMemo(
    () => groupNodesByLocation(allNodes, locationList),
    [allNodes, locationList],
  );

  const onlinePercent =
    fleetStats.total > 0 ? Math.round((fleetStats.online / fleetStats.total) * 100) : 0;

  const filterCounts = useMemo(() => {
    const counts: Record<NodeFleetFilter, number> = {
      all: allNodes.length,
      online: 0,
      maintenance: 0,
      offline: 0,
    };
    for (const node of allNodes) {
      if (matchesFleetFilter(node, 'online')) counts.online++;
      if (matchesFleetFilter(node, 'maintenance')) counts.maintenance++;
      if (matchesFleetFilter(node, 'offline')) counts.offline++;
    }
    return counts;
  }, [allNodes]);

  const hasActiveFilters =
    Boolean(debouncedSearch) || Boolean(locationFilter) || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setLocationFilter('');
    setStatusFilter('all');
  }

  return (
    <AdminLayout>
      <Page>
        <AdminPageStack>
          <NodesHeader
            stats={fleetStats}
            refreshing={refreshing}
            loading={nodes.loading}
            fullAdmin={fullAdmin}
            onRefresh={() => void refresh()}
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
            <AlertBanner tone="error">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Couldn&apos;t load nodes: {nodes.error.message}</span>
              </div>
            </AlertBanner>
          ) : null}

          {!nodes.error ? (
            <NodesUnreachableBanner
              offlineCount={fleetStats.offline}
              maintenanceCount={fleetStats.maintenance}
              onShowOffline={() => setStatusFilter('offline')}
            />
          ) : null}

          {!nodes.loading || allNodes.length > 0 ? (
            <NodesFleetOverview
              stats={fleetStats}
              locationRows={locationRows}
              onlinePercent={onlinePercent}
            />
          ) : null}

          <AdminSection
            icon={Server}
            eyebrow="Inventory"
            title="All nodes"
            description="Search, filter, and open any Wings host in the fleet"
            badge={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}
          >
              <div className="ds-nd-list-toolbar">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, FQDN, or UUID…"
                    className="ds-field ds-field--icon-left w-full"
                    aria-label="Search nodes"
                  />
                </div>
                <FilterSelect
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  disabled={locations.loading}
                  aria-label="Filter by location"
                >
                  <option value="">All locations</option>
                  {locationList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.short}
                    </option>
                  ))}
                </FilterSelect>
                <AdminSegmentedControl
                  label="View mode"
                  value={viewMode}
                  onChange={(id) => setViewMode(id as NodesViewMode)}
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
                label="Node status filters"
                value={statusFilter}
                onChange={(id) => setStatusFilter(id as NodeFleetFilter)}
                options={FILTER_OPTIONS.map((opt) => ({
                  id: opt.id,
                  label: opt.label,
                  count: filterCounts[opt.id],
                  alert: opt.id === 'offline' && filterCounts.offline > 0,
                }))}
              />

              <div className="ds-nd-list-meta">
                <span>
                  Showing <strong>{filteredNodes.length}</strong>
                  {hasActiveFilters ? ` of ${allNodes.length}` : ''} nodes
                </span>
                {hasActiveFilters ? (
                  <button type="button" className="ds-nd-list-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
              </div>

              {nodes.loading && allNodes.length === 0 ? (
                viewMode === 'table' ? (
                  <div className="space-y-2 py-1" aria-hidden>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="ds-nd-list-card-grid" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="ds-nd-list-card-skeleton" />
                    ))}
                  </div>
                )
              ) : filteredNodes.length === 0 ? (
                <EmptyState
                  icon={<DsIcon icon={HardDrive} className="ds-icon--md" />}
                  title={hasActiveFilters ? 'No nodes match your filters' : 'No nodes registered'}
                  description={
                    hasActiveFilters
                      ? 'Try a different status, location, or search term.'
                      : 'Add your first Wings node to start provisioning game servers.'
                  }
                  action={
                    hasActiveFilters ? (
                      <AdminToolButton onClick={clearFilters}>Clear filters</AdminToolButton>
                    ) : fullAdmin ? (
                      <AdminToolButton to="/admin/nodes/new" primary>
                        <Plus className="h-3.5 w-3.5" />
                        Add node
                      </AdminToolButton>
                    ) : null
                  }
                />
              ) : viewMode === 'table' ? (
                <AdminNodeTable nodes={filteredNodes} />
              ) : (
                <div className="ds-nd-list-card-grid">
                  {filteredNodes.map((node) => (
                    <NodeFleetCard key={node.id} node={node} />
                  ))}
                </div>
              )}
          </AdminSection>
        </AdminPageStack>
      </Page>
    </AdminLayout>
  );
}
