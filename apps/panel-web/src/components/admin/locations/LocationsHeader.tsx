import { Globe, HardDrive, MapPin, Network, Plus, RefreshCw, Server } from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
import type { LocationFleetStats } from './location-fleet-utils';

export function LocationsHeader({
  stats,
  refreshing,
  loading,
  fullAdmin,
  onRefresh,
  onCreate,
}: {
  stats: LocationFleetStats;
  refreshing: boolean;
  loading: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const statusLabel =
    stats.total === 0
      ? 'No regions'
      : stats.empty > 0
        ? `${stats.empty} empty`
        : `${stats.inUse} in use`;

  const pillTone =
    stats.empty > 0 ? 'warn' : stats.total > 0 ? 'ok' : 'neutral';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Fleet"
        title="Locations"
        description="Geographic regions that group your Wings nodes and server fleet"
        pill={statusLabel}
        pillTone={pillTone}
        actions={
          <>
            <AdminToolButton
              onClick={onRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh locations"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            <AdminToolButton to="/admin/nodes">
              <HardDrive className="h-3.5 w-3.5" aria-hidden />
              Nodes
            </AdminToolButton>
            {fullAdmin ? (
              <AdminToolButton onClick={onCreate} primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add location
              </AdminToolButton>
            ) : null}
          </>
        }
      />
      <AdminKpiStrip
        label="Region summary"
        columns={4}
        items={[
          { icon: Globe, label: 'Regions', value: stats.total },
          {
            icon: MapPin,
            label: 'In use',
            value: stats.inUse,
            tone: stats.inUse > 0 ? 'success' : undefined,
          },
          { icon: Network, label: 'Nodes', value: stats.nodes },
          { icon: Server, label: 'Servers', value: stats.servers },
        ]}
      />
    </div>
  );
}
