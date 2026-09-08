import { Link } from 'react-router-dom';
import { ChevronRight, Plus, RefreshCw, Server, Users } from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import type { UserFleetStats } from './user-fleet-utils';

export function UsersHeader({
  stats,
  refreshing,
  fullAdmin,
  onRefresh,
  onCreate,
}: {
  stats: UserFleetStats;
  refreshing: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const tone = stats.suspended > 0 ? 'alert' : stats.total > 0 ? 'live' : 'idle';
  const statusLabel =
    stats.suspended > 0
      ? `${stats.suspended} suspended`
      : stats.total > 0
        ? `${stats.active} active`
        : 'No accounts';

  const headerStats = [
    { icon: Users, label: 'Accounts', value: String(stats.total) },
    { icon: Users, label: 'Active', value: String(stats.active) },
    { icon: Server, label: 'Owned servers', value: String(stats.totalServers) },
    { icon: Users, label: 'With servers', value: String(stats.withServers) },
  ];

  return (
    <div className="ds-usr-header-wrap">
      <header className={`ds-usr-header ds-usr-header--${tone}`}>
        <nav className="ds-usr-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Users</span>
        </nav>

        <div className="ds-usr-header-body">
          <div className="ds-usr-header-accent" aria-hidden />

          <div className="ds-usr-header-main">
            <div className="ds-usr-header-identity">
              <div className="ds-usr-header-icon-wrap" aria-hidden>
                <Users className="ds-icon" />
                <span className={`ds-usr-header-pulse ds-usr-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-usr-header-title-row">
                  <h1 className="ds-usr-header-title">Panel accounts</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={stats.suspended > 0 ? 'warning' : stats.total > 0 ? 'success' : 'neutral'}
                    pulse={stats.suspended > 0}
                  />
                </div>
                <p className="ds-usr-header-meta">
                  Manage roles, suspension, and access across your customer base
                </p>
              </div>
            </div>

            <div className="ds-usr-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh users"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              {fullAdmin ? (
                <Button type="button" size="sm" onClick={onCreate}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Create user
                </Button>
              ) : null}
            </div>
          </div>

          <div className="ds-usr-header-stats" role="list" aria-label="User summary">
            {headerStats.map((stat) => (
              <div key={stat.label} className="ds-usr-header-stat" role="listitem">
                <span className="ds-usr-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-usr-header-stat-copy">
                  <span className="ds-usr-header-stat-label">{stat.label}</span>
                  <span className="ds-usr-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
