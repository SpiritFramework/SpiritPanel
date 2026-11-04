import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Globe,
  LayoutGrid,
  List,
  Search,
  Settings,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AdminLayout, Page } from '../../components/Layout';
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
import { DomainsHeader } from '../../components/admin/domains/DomainsHeader';
import {
  AdminCallout,
  AdminFilterChips,
  AdminPageStack,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../../components/admin/primitives';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, EmptyState, Skeleton } from '../../components/ui';

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
        <AdminPageStack>
          <DomainsHeader
            stats={fleetStats}
            refreshing={refreshing}
            loading={initialLoading}
            onRefresh={() => void refresh()}
          />

          {error ? (
            <AlertBanner tone="error">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </AlertBanner>
          ) : null}

          {fleetStats.errors > 0 && !error ? (
            <AdminCallout
              tone="warning"
              icon={AlertTriangle}
              title={`${fleetStats.errors} subdomain error${fleetStats.errors === 1 ? '' : 's'}`}
              description="DNS records may be out of sync — review errors and retry from the server Network tab."
              action={
                <button
                  type="button"
                  className="ds-nd-list-alert-action"
                  onClick={() => setStatusFilter('error')}
                >
                  Show errors
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              }
            />
          ) : null}

          {!initialLoading && rows.length > 0 ? <DomainsFleetOverview rows={rows} /> : null}

          <AdminSection
            icon={Globe}
            eyebrow="Inventory"
            title="All subdomains"
            description="Search and filter Cloudflare DNS records tied to game servers"
            badge={
              lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                : undefined
            }
          >
            <div className="ds-nd-list-toolbar">
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
              <AdminSegmentedControl
                label="View mode"
                value={viewMode}
                onChange={(id) => setViewMode(id as DomainsViewMode)}
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
              label="Subdomain filters"
              value={statusFilter}
              onChange={(id) => setStatusFilter(id as DomainFleetFilter)}
              options={FILTER_OPTIONS.map((opt) => ({
                id: opt.id,
                label: opt.label,
                count: filterCounts[opt.id],
                alert: opt.id === 'error' && filterCounts.error > 0,
              }))}
            />

            <div className="ds-nd-list-meta">
              <span>
                Showing <strong>{filteredRows.length}</strong>
                {hasActiveFilters ? ` of ${rows.length}` : ''} subdomains
              </span>
              {hasActiveFilters ? (
                <button type="button" className="ds-nd-list-clear" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>

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
                    <AdminToolButton to="/admin/settings">
                      <Settings className="h-3.5 w-3.5" aria-hidden />
                      Open settings
                    </AdminToolButton>
                  ) : (
                    <AdminToolButton onClick={clearFilters}>Clear filters</AdminToolButton>
                  )
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
          </AdminSection>
        </AdminPageStack>
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
