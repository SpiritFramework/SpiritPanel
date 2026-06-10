import { useEffect, useMemo, useState } from 'react';
import { Globe, MapPin, Network, Plus, Search } from 'lucide-react';
import { api, type AdminLocationSummary } from '../../lib/api';
import { AdminLayout, Button, Card } from '../../components/Layout';
import { AdminLocationTable } from '../../components/AdminLocationRow';
import { CreateLocationModal } from '../../components/CreateLocationModal';
import { EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

export function AdminLocations() {
  const [locations, setLocations] = useState<AdminLocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.admin.locations({ search: search.trim() || undefined });
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const stats = useMemo(
    () => ({
      total: locations.length,
      nodes: locations.reduce((n, l) => n + l._count.nodes, 0),
      withNodes: locations.filter((l) => l._count.nodes > 0).length,
      empty: locations.filter((l) => l._count.nodes === 0).length,
    }),
    [locations],
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Locations"
        description="Geographic regions that group your Wings nodes"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add location
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Showing" value={stats.total} icon={<Globe className="h-4 w-4" />} />
        <StatCard label="In use" value={stats.withNodes} icon={<MapPin className="h-4 w-4" />} tone="success" />
        <StatCard label="Total nodes" value={stats.nodes} icon={<Network className="h-4 w-4" />} />
        <StatCard label="Empty" value={stats.empty} icon={<Globe className="h-4 w-4" />} />
      </div>

      <Card title="All locations">
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, UUID…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[13px] shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : locations.length === 0 ? (
          <EmptyState title="No locations found" description="Add a region to organize your nodes." />
        ) : (
          <AdminLocationTable locations={locations} />
        )}
      </Card>

      {showCreate && (
        <CreateLocationModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}
