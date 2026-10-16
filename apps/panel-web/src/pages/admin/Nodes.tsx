import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  HardDrive,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { AdminNodeTable } from '../../components/AdminNodeRow';
import { AdminLayout, Button, Page } from '../../components/Layout';
import { NodeFleetCard } from '../../components/admin/nodes/NodeFleetCard';
import { NodesFleetOverview } from '../../components/admin/nodes/NodesFleetOverview';
import { NodesHeader } from '../../components/admin/nodes/NodesHeader';
import {
  computeFleetStats,
  groupNodesByLocation,
  matchesFleetFilter,
  type NodeFleetFilter,
} from '../../components/admin/nodes/node-fleet-utils';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner, DsIcon, EmptyState, Skeleton } from '../../components/ui';

type NodesViewMode = 'table' | 'cards';

export function AdminNodes() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeFleetFilter>('all');
  const [viewMode, setViewMode] = useState<NodesViewMode>('cards');
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
  }, [debouncedSearch, locationFilter]);

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
        <div className="ds-admin-nodes">
          <NodesHeader
            stats={fleetStats}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
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

          {fleetStats.offline > 0 && !nodes.error && statusFilter !== 'offline' ? (
            <button
              type="button"
              className="ds-admin-nodes__callout"
              onClick={() => setStatusFilter('offline')}
            >
              <span className="ds-admin-nodes__callout-body">
                <strong>
                  {fleetStats.offline} node{fleetStats.offline === 1 ? '' : 's'} unreachable
                </strong>
                <span>
                  {fleetStats.maintenance > 0
                    ? `${fleetStats.maintenance} also in maintenance · check Wings reachability`
                    : 'Wings did not respond on the last health probe'}
                </span>
              </span>
              <span className="ds-admin-nodes__callout-action inline-flex items-center gap-1">
                Show offline
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
          ) : null}

          {!nodes.loading || allNodes.length > 0 ? (
            <NodesFleetOverview
              stats={fleetStats}
              locationRows={locationRows}
              onlinePercent={onlinePercent}
              locationFilter={locationFilter}
              onLocationChange={setLocationFilter}
            />
          ) : null}

          <section className="ds-admin-nodes__list" aria-label="All nodes">
            <div className="ds-admin-nodes__list-head">
              <span className="ds-admin-nodes__list-head-icon" aria-hidden>
                <HardDrive className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="ds-admin-nodes__list-title">All nodes</h2>
                <p className="ds-admin-nodes__list-desc">
                  Reachability, capacity, and connection details across your Wings fleet
                </p>
              </div>
            </div>

            <div className="ds-admin-nodes__list-body">
              <div className="ds-nodes-toolbar">
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

              <div className="ds-nodes-results-meta">
                <span>
                  Showing <strong>{filteredNodes.length}</strong>
                  {hasActiveFilters ? ` of ${allNodes.length}` : ''} nodes
                </span>
                {lastUpdated ? (
                  <span className="ds-text-muted">Updated {lastUpdated.toLocaleTimeString()}</span>
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
                  <div className="ds-nodes-card-grid" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="ds-nodes-card-skeleton" />
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
                      <Button type="button" variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : fullAdmin ? (
                      <Link to="/admin/nodes/new">
                        <Button>
                          <Plus className="h-4 w-4" />
                          Add node
                        </Button>
                      </Link>
                    ) : null
                  }
                />
              ) : viewMode === 'table' ? (
                <AdminNodeTable nodes={filteredNodes} />
              ) : (
                <div className="ds-nodes-card-grid">
                  {filteredNodes.map((node) => (
                    <NodeFleetCard key={node.id} node={node} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Page>
    </AdminLayout>
  );
}
