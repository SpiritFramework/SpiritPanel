import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  HardDrive,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Wrench,
} from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { AdminLayout, Button, FilterSelect, Page } from '../../components/Layout';
import { NodeFleetCard } from '../../components/admin/nodes/NodeFleetCard';
import { NodeFleetSidebar } from '../../components/admin/nodes/NodeFleetSidebar';
import {
  computeFleetStats,
  groupNodesByLocation,
  matchesFleetFilter,
  type NodeFleetFilter,
} from '../../components/admin/nodes/node-fleet-utils';
import { formatResourceAmount } from '../../lib/server-theme';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner, DsIcon, EmptyState, Skeleton } from '../../components/ui';

const FILTER_OPTIONS: { id: NodeFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'offline', label: 'Offline' },
];

export function AdminNodes() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeFleetFilter>('all');
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

  const memPct =
    fleetStats.memoryLimit > 0
      ? Math.round((fleetStats.allocatedMemory / fleetStats.memoryLimit) * 100)
      : 0;
  const heroTone =
    fleetStats.offline > 0 ? 'warn' : onlinePercent < 60 && fleetStats.total > 0 ? 'bad' : 'good';
  const healthTone = onlinePercent >= 85 ? 'good' : onlinePercent >= 60 ? 'warn' : 'bad';

  return (
    <AdminLayout>
      <Page className="ds-fleet-page">
        <header className={`ds-fleet-hero ds-fleet-hero--${heroTone}`}>
          <div className="ds-fleet-hero-glow" aria-hidden />
          <div className="ds-fleet-hero-glow ds-fleet-hero-glow--right" aria-hidden />

          <div className="ds-fleet-hero-inner">
            <div className="ds-fleet-hero-copy">
              <p className="ds-fleet-hero-eyebrow">
                Infrastructure
                <span aria-hidden>·</span>
                Wings daemons
              </p>
              <h1 className="ds-fleet-hero-title">Node fleet</h1>
              <p className="ds-fleet-hero-sub">
                Reachability, capacity, and port inventory across every location.
              </p>
              <div className="ds-fleet-hero-actions">
                {fullAdmin && (
                <Link to="/admin/nodes/new" className="ds-btn ds-btn--primary ds-btn--sm">
                  <Plus className="ds-icon ds-icon--sm" aria-hidden />
                  Add node
                </Link>
                )}
                <Link to="/admin/locations" className="ds-btn ds-btn--secondary ds-btn--sm">
                  <MapPin className="ds-icon ds-icon--sm" aria-hidden />
                  Locations
                </Link>
                <button
                  type="button"
                  className="ds-btn ds-btn--ghost ds-btn--sm"
                  onClick={() => void refresh()}
                  disabled={refreshing || nodes.loading}
                  aria-label="Refresh nodes"
                >
                  <RefreshCw
                    className={`ds-icon ds-icon--sm${refreshing ? ' animate-spin' : ''}`}
                    aria-hidden
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="ds-fleet-hero-pulse" aria-label={`Fleet online ${onlinePercent}%`}>
              <div
                className={`ds-fleet-health-ring ds-fleet-health-ring--${healthTone}`}
                style={{ ['--fleet-health' as string]: `${onlinePercent}%` }}
                aria-hidden
              >
                <span className="ds-fleet-health-value">{onlinePercent}%</span>
              </div>
              <div>
                <span className="ds-fleet-hero-pulse-label">Online</span>
                <strong className="ds-fleet-hero-pulse-value">
                  {fleetStats.online}/{fleetStats.total || '—'}
                </strong>
                <small>
                  {fleetStats.offline > 0
                    ? `${fleetStats.offline} unreachable`
                    : fleetStats.maintenance > 0
                      ? `${fleetStats.maintenance} in maintenance`
                      : 'All reachable'}
                </small>
              </div>
            </div>
          </div>

          <div className="ds-fleet-kpis" aria-label="Fleet metrics">
            <div className="ds-fleet-kpi">
              <span className="ds-fleet-kpi-icon" aria-hidden>
                <HardDrive className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-fleet-kpi-copy">
                <span className="ds-fleet-kpi-label">Nodes</span>
                <strong className="ds-fleet-kpi-value">{fleetStats.total}</strong>
                <small className="ds-fleet-kpi-hint">{fleetStats.online} online</small>
              </span>
            </div>
            <button
              type="button"
              className="ds-fleet-kpi"
              onClick={() => setStatusFilter('offline')}
            >
              <span className="ds-fleet-kpi-icon ds-fleet-kpi-icon--warn" aria-hidden>
                <AlertTriangle className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-fleet-kpi-copy">
                <span className="ds-fleet-kpi-label">Offline</span>
                <strong className="ds-fleet-kpi-value">{fleetStats.offline}</strong>
                <small className="ds-fleet-kpi-hint">
                  {fleetStats.maintenance} maintenance
                </small>
              </span>
            </button>
            <div className="ds-fleet-kpi">
              <span className="ds-fleet-kpi-icon" aria-hidden>
                <Server className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-fleet-kpi-copy">
                <span className="ds-fleet-kpi-label">Servers</span>
                <strong className="ds-fleet-kpi-value">{fleetStats.servers}</strong>
                <small className="ds-fleet-kpi-hint">On this fleet</small>
              </span>
            </div>
            <div className="ds-fleet-kpi">
              <span className="ds-fleet-kpi-icon" aria-hidden>
                <Network className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-fleet-kpi-copy">
                <span className="ds-fleet-kpi-label">Ports</span>
                <strong className="ds-fleet-kpi-value">{fleetStats.allocations}</strong>
                <small className="ds-fleet-kpi-hint">Allocations</small>
              </span>
            </div>
            <div className="ds-fleet-kpi">
              <span className="ds-fleet-kpi-icon" aria-hidden>
                <Wrench className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-fleet-kpi-copy">
                <span className="ds-fleet-kpi-label">Memory</span>
                <strong className="ds-fleet-kpi-value">
                  {fleetStats.memoryLimit > 0 ? `${memPct}%` : '—'}
                </strong>
                <small className="ds-fleet-kpi-hint">
                  {formatResourceAmount(fleetStats.allocatedMemory, 'MiB')} used
                </small>
              </span>
            </div>
          </div>
        </header>

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

        {fleetStats.offline > 0 && !nodes.error ? (
          <div className="ds-fleet-banner ds-fleet-banner--warn">
            <AlertTriangle className="ds-icon ds-icon--sm shrink-0" aria-hidden />
            <p>
              {fleetStats.offline} node{fleetStats.offline === 1 ? '' : 's'} unreachable
              {fleetStats.maintenance > 0
                ? ` · ${fleetStats.maintenance} in maintenance`
                : ''}
            </p>
            <button
              type="button"
              className="ds-fleet-banner-link"
              onClick={() => setStatusFilter('offline')}
            >
              Show offline
            </button>
          </div>
        ) : null}

        <div className="ds-fleet-layout">
          <div className="ds-fleet-main">
            <div className="ds-fleet-toolbar">
              <div className="ds-fleet-search">
                <Search className="ds-fleet-search-icon" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, FQDN, or UUID…"
                  className="ds-field ds-fleet-search-input"
                  aria-label="Search nodes"
                />
              </div>
              <FilterSelect
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                disabled={locations.loading}
                className="ds-fleet-location-select"
                aria-label="Filter by location"
              >
                <option value="">All locations</option>
                {locationList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.short}
                  </option>
                ))}
              </FilterSelect>
            </div>

            <div className="ds-fleet-filters" role="tablist" aria-label="Node status filters">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === opt.id}
                  className={`ds-fleet-filter${statusFilter === opt.id ? ' ds-fleet-filter--active' : ''}${
                    opt.id === 'offline' && filterCounts.offline > 0 ? ' ds-fleet-filter--alert' : ''
                  }`}
                  onClick={() => setStatusFilter(opt.id)}
                >
                  {opt.label}
                  <span className="ds-fleet-filter-count">{filterCounts[opt.id]}</span>
                </button>
              ))}
            </div>

            <div className="ds-fleet-results-meta">
              <span>
                Showing <strong>{filteredNodes.length}</strong>
                {hasActiveFilters ? ` of ${allNodes.length}` : ''} nodes
              </span>
              {lastUpdated ? (
                <span className="ds-text-muted">Updated {lastUpdated.toLocaleTimeString()}</span>
              ) : null}
            </div>

            {nodes.loading && allNodes.length === 0 ? (
              <div className="ds-fleet-card-grid" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="ds-fleet-card-skeleton" />
                ))}
              </div>
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSearch('');
                        setLocationFilter('');
                        setStatusFilter('all');
                      }}
                    >
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
            ) : (
              <div className="ds-fleet-card-grid">
                {filteredNodes.map((node) => (
                  <NodeFleetCard key={node.id} node={node} />
                ))}
              </div>
            )}
          </div>

          {!nodes.loading || allNodes.length > 0 ? (
            <NodeFleetSidebar
              stats={fleetStats}
              locationRows={locationRows}
              onlinePercent={onlinePercent}
            />
          ) : null}
        </div>
      </Page>
    </AdminLayout>
  );
}
