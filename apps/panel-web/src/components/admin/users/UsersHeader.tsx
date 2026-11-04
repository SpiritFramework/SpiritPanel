import { Plus, RefreshCw, Server, Users } from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
import type { UserFleetStats } from './user-fleet-utils';

export function UsersHeader({
  stats,
  refreshing,
  fullAdmin,
  onRefresh,
}: {
  stats: UserFleetStats;
  refreshing: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
}) {
  const statusLabel =
    stats.suspended > 0
      ? `${stats.suspended} suspended`
      : stats.total > 0
        ? `${stats.active} active`
        : 'No accounts';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Accounts"
        title="Panel accounts"
        description="Manage roles, suspension, and access across your customer base"
        pill={statusLabel}
        pillTone={
          stats.suspended > 0 ? 'warn' : stats.total > 0 ? 'ok' : 'neutral'
        }
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh users">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            {fullAdmin ? (
              <AdminToolButton to="/admin/users/new" primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Create user
              </AdminToolButton>
            ) : null}
          </>
        }
      />
      <AdminKpiStrip
        label="Account summary"
        columns={4}
        items={[
          { icon: Users, label: 'Accounts', value: stats.total },
          {
            icon: Users,
            label: 'Active',
            value: stats.active,
            tone: stats.active > 0 ? 'success' : undefined,
          },
          { icon: Server, label: 'Owned servers', value: stats.totalServers },
          { icon: Users, label: 'With servers', value: stats.withServers },
        ]}
      />
    </div>
  );
}
