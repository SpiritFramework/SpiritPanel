import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Server } from 'lucide-react';
import { api, type AdminNodeSummary, type AdminServerSummary } from '../../lib/api';
import { AdminLayout, Button, Card, FilterSelect } from '../../components/Layout';
import { AdminServerTable } from '../../components/AdminServerRow';
import { EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';
import { isServerEffectivelyRunning, isServerEffectivelyInstalling } from '../../lib/server-runtime';

type StatusFilter = 'all' | 'normal' | 'installing' | 'suspended';

export function AdminServers() {
  const [servers, setServers] = useState<AdminServerSummary[]>([]);
  const [nodes, setNodes] = useState<AdminNodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  async function load(silent = false) {
    if (!silent) setLoading(true);
    if (!silent) setLoadError('');
    try {
      const data = await api.admin.servers({
        search: search.trim() || undefined,
        nodeId: nodeFilter || undefined,
        suspended: statusFilter === 'suspended' ? 'true' : undefined,
        status: statusFilter === 'normal' || statusFilter === 'installing' ? statusFilter : undefined,
      });
      setServers(data);
    } catch (err) {
      if (!silent) {
        setServers([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load servers');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    api.admin.nodes().then(setNodes).catch(console.error);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [search, nodeFilter, statusFilter]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [search, nodeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: servers.length,
      running: servers.filter(isServerEffectivelyRunning).length,
      suspended: servers.filter((s) => s.suspended).length,
      installing: servers.filter(isServerEffectivelyInstalling).length,
    };
  }, [servers]);

  return (
    <AdminLayout>
      <PageHeader
        title="Servers"
        description="Provision, manage, and monitor all game servers"
        action={
          <Link to="/admin/servers/new">
            <Button>
              <Plus className="h-3.5 w-3.5" />
              Provision server
            </Button>
          </Link>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {loadError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Showing" value={stats.total} icon={<Server className="h-4 w-4" />} />
        <StatCard label="Running" value={stats.running} icon={<Server className="h-4 w-4" />} tone="success" />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={stats.suspended > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Installing"
          value={stats.installing}
          icon={<Server className="h-4 w-4" />}
          tone={stats.installing > 0 ? 'default' : 'default'}
        />
      </div>

      <Card title="All servers">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, owner, UUID…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[13px] shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </div>
          <FilterSelect value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}>
            <option value="">All nodes</option>
            {nodes.map((n) => (
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
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : servers.length === 0 ? (
          <EmptyState
            title="No servers found"
            description="Try adjusting your search or filters, or provision a new server."
            action={
              <Link to="/admin/servers/new">
                <Button>Provision server</Button>
              </Link>
            }
          />
        ) : (
          <AdminServerTable servers={servers} onServerDeleted={load} />
        )}
      </Card>
    </AdminLayout>
  );
}
