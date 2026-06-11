import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Server } from 'lucide-react';
import { api, type AdminNodeSummary, type AdminServerSummary } from '../../lib/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AdminLayout, Button, Card, FilterSelect, Page } from '../../components/Layout';
import { AdminServerTable } from '../../components/AdminServerRow';
import { AlertBanner, DsIcon, EmptyState, PageHeader, Skeleton, StatCard } from '../../components/ui';
import { isServerEffectivelyRunning, isServerEffectivelyInstalling } from '../../lib/server-runtime';

type StatusFilter = 'all' | 'normal' | 'installing' | 'suspended';

export function AdminServers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: nodes } = useAsyncData<AdminNodeSummary[]>('admin-nodes-list', () => api.admin.nodes());

  const queryKey = `admin-servers|${debouncedSearch}|${nodeFilter}|${statusFilter}`;

  const fetchServers = useCallback(
    () =>
      api.admin.servers({
        search: debouncedSearch || undefined,
        nodeId: nodeFilter || undefined,
        suspended: statusFilter === 'suspended' ? 'true' : undefined,
        status: statusFilter === 'normal' || statusFilter === 'installing' ? statusFilter : undefined,
      }),
    [debouncedSearch, nodeFilter, statusFilter],
  );

  const { data: servers, loading, error, refetch } = useAsyncData<AdminServerSummary[]>(
    queryKey,
    fetchServers,
    [debouncedSearch, nodeFilter, statusFilter],
  );

  const list = servers ?? [];
  const nodeList = nodes ?? [];

  useEffect(() => {
    const timer = window.setInterval(() => void refetch(), 15_000);
    return () => window.clearInterval(timer);
  }, [refetch]);

  const stats = useMemo(
    () => ({
      total: list.length,
      running: list.filter(isServerEffectivelyRunning).length,
      suspended: list.filter((s) => s.suspended).length,
      installing: list.filter(isServerEffectivelyInstalling).length,
    }),
    [list],
  );

  return (
    <AdminLayout>
      <Page>
        <PageHeader
          title="Servers"
          description="Provision, manage, and monitor all game servers"
          icon={<DsIcon icon={Server} className="ds-icon--muted" />}
          action={
            <Link to="/admin/servers/new">
              <Button>
                <DsIcon icon={Plus} />
                Provision server
              </Button>
            </Link>
          }
        />

        {error && (
          <AlertBanner tone="error" className="mb-4">
            We couldn&apos;t load the server list. Check your connection and try again.
          </AlertBanner>
        )}

        <div className="ds-grid-stats mb-4">
          <StatCard label="Showing" value={stats.total} icon={<DsIcon icon={Server} />} />
          <StatCard label="Running" value={stats.running} icon={<DsIcon icon={Server} />} tone="success" />
          <StatCard
            label="Suspended"
            value={stats.suspended}
            icon={<DsIcon icon={AlertTriangle} />}
            tone={stats.suspended > 0 ? 'warning' : 'neutral'}
          />
          <StatCard label="Installing" value={stats.installing} icon={<DsIcon icon={Server} />} tone="info" />
        </div>

        <Card title="All servers">
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-0 w-full flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, owner, UUID…"
                className="ds-field py-2 pl-8 pr-3"
              />
            </div>
            <FilterSelect value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}>
              <option value="">All nodes</option>
              {nodeList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="normal">Running</option>
              <option value="installing">Installing</option>
              <option value="suspended">Suspended</option>
            </FilterSelect>
          </div>

          {loading ? (
            <div className="space-y-2 py-1" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={Server} className="ds-icon--md" />}
              title="No servers match your filters"
              description="Broaden your search or provision a new server to populate this list."
              action={
                <Link to="/admin/servers/new">
                  <Button>Provision server</Button>
                </Link>
              }
            />
          ) : (
            <AdminServerTable servers={list} onServerDeleted={() => void refetch()} />
          )}
        </Card>
      </Page>
    </AdminLayout>
  );
}
