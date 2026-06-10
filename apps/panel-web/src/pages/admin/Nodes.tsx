import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Network, Plus, Search, Server, Signal, Wrench } from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { formatResource } from '../../lib/server-theme';
import { AdminLayout, Button, Card, FilterSelect } from '../../components/Layout';
import { AdminNodeTable } from '../../components/AdminNodeRow';
import { FleetCapacityOverview } from '../../components/admin/NodeCapacityOverview';
import { EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

type MaintenanceFilter = 'all' | 'active' | 'maintenance';

export function AdminNodes() {
  const [nodes, setNodes] = useState<AdminNodeSummary[]>([]);
  const [locations, setLocations] = useState<AdminLocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceFilter>('all');

  async function load() {
    setLoading(true);
    try {
      const data = await api.admin.nodes({
        search: search.trim() || undefined,
        locationId: locationFilter || undefined,
        maintenance:
          maintenanceFilter === 'all'
            ? undefined
            : maintenanceFilter === 'maintenance'
              ? 'true'
              : 'false',
      });
      setNodes(data);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.admin.locations().then(setLocations);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, locationFilter, maintenanceFilter]);

  const stats = useMemo(() => {
    const servers = nodes.reduce((n, node) => n + node._count.servers, 0);
    const online = nodes.filter((n) => n.online && !n.maintenanceMode).length;
    const totalMemory = nodes.reduce((n, node) => n + (node.capacity?.allocatedMemory ?? 0), 0);
    const totalDisk = nodes.reduce((n, node) => n + (node.capacity?.allocatedDisk ?? 0), 0);
    return {
      total: nodes.length,
      online,
      servers,
      maintenance: nodes.filter((n) => n.maintenanceMode).length,
      totalMemory,
      totalDisk,
    };
  }, [nodes]);

  return (
    <AdminLayout>
      <PageHeader
        title="Nodes"
        description="Wings daemons, resource capacity, and port allocations"
        action={
          <Link to="/admin/nodes/new">
            <Button>
              <Plus className="h-3.5 w-3.5" />
              Add node
            </Button>
          </Link>
        }
      />

      {!loading && nodes.length > 0 && <FleetCapacityOverview nodes={nodes} />}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Nodes" value={stats.total} icon={<HardDrive className="h-4 w-4" />} />
        <StatCard
          label="Online"
          value={stats.online}
          hint={stats.total - stats.online > 0 ? `${stats.total - stats.online} unreachable` : 'All reachable'}
          icon={<Signal className="h-4 w-4" />}
          tone={stats.online === stats.total && stats.total > 0 ? 'success' : stats.online < stats.total ? 'warning' : 'default'}
        />
        <StatCard label="Servers" value={stats.servers} icon={<Server className="h-4 w-4" />} />
        <StatCard
          label="RAM allocated"
          value={formatResource(stats.totalMemory, 'MiB')}
          icon={<Network className="h-4 w-4" />}
        />
        <StatCard
          label="Disk allocated"
          value={formatResource(stats.totalDisk, 'MiB')}
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          label="Maintenance"
          value={stats.maintenance}
          icon={<Wrench className="h-4 w-4" />}
          tone={stats.maintenance > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card title="All nodes">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, FQDN, UUID…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[13px] shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </div>
          <FilterSelect value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.short}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={maintenanceFilter}
            onChange={(e) => setMaintenanceFilter(e.target.value as MaintenanceFilter)}
          >
            <option value="all">All nodes</option>
            <option value="active">Active only</option>
            <option value="maintenance">Maintenance</option>
          </FilterSelect>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : nodes.length === 0 ? (
          <EmptyState
            title="No nodes found"
            description="Try adjusting your search or add a new Wings node."
            action={
              <Link to="/admin/nodes/new">
                <Button>Add node</Button>
              </Link>
            }
          />
        ) : (
          <AdminNodeTable nodes={nodes} />
        )}
      </Card>
    </AdminLayout>
  );
}
