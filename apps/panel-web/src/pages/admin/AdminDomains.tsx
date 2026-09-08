import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Globe,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AdminLayout, Button, Card, Page } from '../../components/Layout';
import { DomainFleetCard } from '../../components/admin/domains/DomainFleetCard';
import { DomainFleetTable } from '../../components/admin/domains/DomainFleetTable';
import {
  computeDomainFleetStats,
  matchesDomainFilter,
  matchesDomainSearch,
  type DomainFleetFilter,
  type DomainRow,
} from '../../components/admin/domains/domain-fleet-utils';
import { DomainsFleetOverview } from '../../components/admin/domains/DomainsFleetOverview';
import { DomainsFleetStats } from '../../components/admin/domains/DomainsFleetStats';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, DsIcon, EmptyState, PageHeader, Skeleton } from '../../components/ui';

const FILTER_OPTIONS: { id: DomainFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'prefer_subdomain', label: 'Subdomain shown' },
  { id: 'prefer_ip', label: 'IP shown' },
  { id: 'error', label: 'Errors' },
];

type DomainsViewMode = 'table' | 'cards';

export function AdminDomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DomainFleetFilter>('all');
  const [viewMode, setViewMode] = useState<DomainsViewMode>('cards');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.admin.listDomains();
      setRows(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subdomains');
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

  const fleetStats = useMemo(() => computeDomainFleetStats(rows), [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) => matchesDomainFilter(row, statusFilter) && matchesDomainSearch(row, debouncedSearch),
      ),
    [rows, statusFilter, debouncedSearch],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<DomainFleetFilter, number> = {
      all: rows.length,
      prefer_subdomain: 0,
      prefer_ip: 0,
      error: 0,
    };
    for (const row of rows) {
      if (matchesDomainFilter(row, 'prefer_subdomain')) counts.prefer_subdomain++;
      if (matchesDomainFilter(row, 'prefer_ip')) counts.prefer_ip++;
      if (matchesDomainFilter(row, 'error')) counts.error++;
    }
    return counts;
  }, [rows]);

  const hasActiveFilters = Boolean(debouncedSearch) || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const row = rows.find((r) => r.id === deleteId);
    if (!row) return;
    setDeleting(true);
    try {
      await api.admin.deleteServerDomain(row.server.id);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subdomain');
    } finally {
      setDeleting(false);
    }
  }

  const initialLoading = loading && rows.length === 0;

  return (
    <AdminLayout>
      <Page>
        <PageHeader
          title="Subdomains"
          description="Cloudflare DNS records created for game servers — one subdomain per server"
          icon={<DsIcon icon={Globe} className="ds-icon--muted" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void refresh()}
                disabled={refreshing || initialLoading}
                aria-label="Refresh subdomains"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`}
                  aria-hidden
                />
                Refresh
              </Button>
              <Link to="/admin/settings">
                <Button type="button" variant="secondary" size="sm">
                  <Settings className="h-3.5 w-3.5" aria-hidden />
                  Cloudflare DNS
                </Button>
              </Link>
            </div>
          }
        />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </AlertBanner>
        ) : null}

        {!initialLoading || rows.length > 0 ? (
          <DomainsFleetStats
            stats={fleetStats}
            onShowErrors={() => setStatusFilter('error')}
            onShowPreferSubdomain={() => setStatusFilter('prefer_subdomain')}
          />
        ) : null}

        {!initialLoading && rows.length > 0 ? <DomainsFleetOverview rows={rows} /> : null}

        <Card title="All subdomains">
          <div className="ds-nodes-toolbar mb-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FQDN, server, owner, node, IP…"
                className="ds-field ds-field--icon-left w-full"
                aria-label="Search subdomains"
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

          <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Subdomain filters">
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

          {initialLoading ? (
            <div className="ds-dom-card-grid" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="ds-dom-card-skeleton" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-8 w-8" />}
              title={hasActiveFilters ? 'No matching subdomains' : 'No subdomains yet'}
              description={
                hasActiveFilters
                  ? 'Try a different search or filter.'
                  : 'Users create one subdomain per server from Network once Cloudflare DNS is enabled in Settings.'
              }
              action={
                !hasActiveFilters ? (
                  <Link to="/admin/settings">
                    <Button type="button" variant="secondary" size="sm">
                      <Settings className="h-3.5 w-3.5" aria-hidden />
                      Open settings
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : viewMode === 'table' ? (
            <DomainFleetTable rows={filteredRows} onDelete={setDeleteId} />
          ) : (
            <div className="ds-dom-card-grid">
              {filteredRows.map((row) => (
                <DomainFleetCard key={row.id} row={row} onDelete={setDeleteId} />
              ))}
            </div>
          )}
        </Card>
      </Page>

      <ConfirmModal
        open={deleteId !== null}
        title="Delete subdomain?"
        description="Removes the Cloudflare DNS record and clears the server subdomain."
        confirmLabel="Delete"
        tone="warning"
        loading={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminLayout>
  );
}
