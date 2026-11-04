import {
  HardDrive,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AdminHero,
  AdminKpiStrip,
  AdminPageStack,
  AdminToolButton,
} from '../primitives';
import type { FleetStats } from './node-fleet-utils';

export function NodesHeader({
  stats,
  refreshing,
  loading,
  fullAdmin,
  onRefresh,
}: {
  stats: FleetStats;
  refreshing: boolean;
  loading: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
}) {
  const statusLabel =
    stats.total === 0
      ? 'No nodes yet'
      : stats.offline > 0
        ? `${stats.offline} unreachable`
        : stats.maintenance > 0
          ? `${stats.online} online · ${stats.maintenance} maintenance`
          : `${stats.online} online`;

  const pillTone =
    stats.offline > 0 ? 'warn' : stats.total > 0 ? 'ok' : 'neutral';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Fleet"
        title="Nodes"
        description="Wings daemons across your locations — reachability, capacity, and port inventory"
        pill={statusLabel}
        pillTone={pillTone}
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing || loading} aria-label="Refresh nodes">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            <AdminToolButton to="/admin/locations">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Locations
            </AdminToolButton>
            {fullAdmin ? (
              <AdminToolButton to="/admin/nodes/new" primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add node
              </AdminToolButton>
            ) : null}
          </>
        }
      />

      <AdminKpiStrip
        label="Fleet summary"
        items={[
          { icon: HardDrive, label: 'Nodes', value: stats.total },
          {
            icon: Wifi,
            label: 'Online',
            value: stats.online,
            tone: stats.online > 0 ? 'success' : undefined,
          },
          {
            icon: WifiOff,
            label: 'Offline',
            value: stats.offline,
            tone: stats.offline > 0 ? 'warning' : undefined,
          },
          { icon: Server, label: 'Servers', value: stats.servers },
          { icon: Network, label: 'Ports', value: stats.allocations },
        ]}
      />
    </div>
  );
}

/** Re-export for callers that want a page stack wrapper nearby */
export { AdminPageStack };
