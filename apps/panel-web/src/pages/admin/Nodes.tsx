import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Network, Plus, Search, Server, Signal, Wrench } from 'lucide-react';
import { api, type AdminLocationSummary, type AdminNodeSummary } from '../../lib/api';
import { formatResource } from '../../lib/server-theme';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AdminLayout, Button, Card, FilterSelect, Page } from '../../components/Layout';
import { AdminNodeTable } from '../../components/AdminNodeRow';
import { FleetCapacityOverview } from '../../components/admin/NodeCapacityOverview';
import { AlertBanner, DsIcon, EmptyState, PageHeader, Skeleton, StatCard } from '../../components/ui';

type MaintenanceFilter = 'all' | 'active' | 'maintenance';

export function AdminNodes() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: locations } = useAsyncData<AdminLocationSummary[]>('admin-locations', () =>
    api.admin.locations(),
  );

  const queryKey = `admin-nodes|${debouncedSearch}|${locationFilter}|${maintenanceFilter}`;

  const fetchNodes = useCallback(
    () =>
      api.admin.nodes({
        search: debouncedSearch || undefined,
        locationId: locationFilter || undefined,
        maintenance:
          maintenanceFilter === 'all'
            ? undefined
            : maintenanceFilter === 'maintenance'
              ? 'true'
              : 'false',
      }),
    [debouncedSearch, locationFilter, maintenanceFilter],
  );

  const { data: nodes, loading, error } = useAsyncData<AdminNodeSummary[]>(
    queryKey,
    fetchNodes,
    [debouncedSearch, locationFilter, maintenanceFilter],
  );

  const list = nodes ?? [];
  const locationList = locations ?? [];

  const stats = useMemo(() => {
    const servers = list.reduce((n, node) => n + node._count.servers, 0);
    const online = list.filter((n) => n.online && !n.maintenanceMode).length;
    const totalMemory = list.reduce((n, node) => n + (node.capacity?.allocatedMemory ?? 0), 0);
    const totalDisk = list.reduce((n, node) => n + (node.capacity?.allocatedDisk ?? 0), 0);
    return {
      total: list.length,
      online,
      servers,
      maintenance: list.filter((n) => n.maintenanceMode).length,
      totalMemory,
      totalDisk,
    };
  }, [list]);

  return (
    <AdminLayout>
      <Page>
        <PageHeader
          title="Nodes"
          description="Wings daemons, resource capacity, and port allocations"
          icon={<DsIcon icon={HardDrive} className="ds-icon--muted" />}
          action={
            <Link to="/admin/nodes/new">
              <Button>
                <DsIcon icon={Plus} />
                Add node
              </Button>
            </Link>
          }
        />

        {error && (
          <AlertBanner tone="error" className="mb-4">
            We couldn&apos;t load nodes. Check your connection and try again.
          </AlertBanner>
        )}

        {!loading && list.length > 0 && <FleetCapacityOverview nodes={list} />}

        <div className="ds-grid-stats mb-4">
          <StatCard label="Nodes" value={stats.total} icon={<DsIcon icon={HardDrive} />} />
          <StatCard
            label="Online"
            value={stats.online}
            hint={stats.total - stats.online > 0 ? `${stats.total - stats.online} unreachable` : 'All reachable'}
            icon={<DsIcon icon={Signal} />}
            tone={stats.online === stats.total && stats.total > 0 ? 'success' : stats.online < stats.total ? 'warning' : 'neutral'}
          />
          <StatCard label="Servers" value={stats.servers} icon={<DsIcon icon={Server} />} />
          <StatCard
            label="RAM allocated"
            value={formatResource(stats.totalMemory, 'MiB')}
            icon={<DsIcon icon={Network} />}
          />
          <StatCard
            label="Disk allocated"
            value={formatResource(stats.totalDisk, 'MiB')}
            icon={<DsIcon icon={HardDrive} />}
          />
          <StatCard
            label="Maintenance"
            value={stats.maintenance}
            icon={<DsIcon icon={Wrench} />}
            tone={stats.maintenance > 0 ? 'warning' : 'neutral'}
          />
        </div>

        <Card title="All nodes">
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-0 w-full flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, FQDN, UUID…"
                className="ds-field py-2 pl-8 pr-3"
              />
            </div>
            <FilterSelect value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="">All locations</option>
              {locationList.map((l) => (
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
            <div className="space-y-2 py-1" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={HardDrive} className="ds-icon--md" />}
              title="No nodes found"
              description="Try adjusting your search or add a new Wings node."
              action={
                <Link to="/admin/nodes/new">
                  <Button>Add node</Button>
                </Link>
              }
            />
          ) : (
            <AdminNodeTable nodes={list} />
          )}
        </Card>
      </Page>
    </AdminLayout>
  );
}
