import { Plus, RefreshCw, Server, Users } from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
import { getServerFleetTone, type ServerFleetStats } from './server-fleet-utils';

export function ServersHeader({
  stats,
  refreshing,
  fullAdmin,
  onRefresh,
}: {
  stats: ServerFleetStats;
  refreshing: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
}) {
  const tone = getServerFleetTone(stats);
  const statusLabel =
    stats.suspended > 0
      ? `${stats.suspended} suspended`
      : stats.installing > 0
        ? `${stats.installing} installing`
        : stats.total > 0
          ? `${stats.running} running`
          : 'No servers';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Fleet"
        title="Game servers"
        description="Provision, monitor, and manage every instance across your fleet"
        pill={statusLabel}
        pillTone={
          stats.suspended > 0 || stats.installing > 0 ? 'warn' : stats.total > 0 ? 'ok' : 'neutral'
        }
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh servers">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            {fullAdmin ? (
              <AdminToolButton to="/admin/servers/new" primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Provision server
              </AdminToolButton>
            ) : null}
          </>
        }
      />
      <AdminKpiStrip
        label="Server summary"
        columns={4}
        items={[
          { icon: Server, label: 'Servers', value: stats.total },
          {
            icon: Server,
            label: 'Running',
            value: stats.running,
            tone: stats.running > 0 ? 'success' : undefined,
          },
          { icon: Users, label: 'Owners', value: stats.owners },
          {
            icon: Server,
            label: 'Nodes',
            value: stats.nodes,
            tone: tone === 'alert' ? 'warning' : undefined,
          },
        ]}
      />
    </div>
  );
}
