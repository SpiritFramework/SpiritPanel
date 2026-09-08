import { Link } from 'react-router-dom';
import { ChevronRight, Plus, RefreshCw, Server, Users } from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
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

  const headerStats = [
    { icon: Server, label: 'Servers', value: String(stats.total) },
    { icon: Server, label: 'Running', value: String(stats.running) },
    { icon: Users, label: 'Owners', value: String(stats.owners) },
    { icon: Server, label: 'Nodes', value: String(stats.nodes) },
  ];

  return (
    <div className="ds-adm-srv-header-wrap">
      <header className={`ds-adm-srv-header ds-adm-srv-header--${tone}`}>
        <nav className="ds-adm-srv-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Servers</span>
        </nav>

        <div className="ds-adm-srv-header-body">
          <div className="ds-adm-srv-header-accent" aria-hidden />

          <div className="ds-adm-srv-header-main">
            <div className="ds-adm-srv-header-identity">
              <div className="ds-adm-srv-header-icon-wrap" aria-hidden>
                <Server className="ds-icon" />
                <span className={`ds-adm-srv-header-pulse ds-adm-srv-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-adm-srv-header-title-row">
                  <h1 className="ds-adm-srv-header-title">Game servers</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={
                      stats.suspended > 0 || stats.installing > 0
                        ? 'warning'
                        : stats.total > 0
                          ? 'success'
                          : 'neutral'
                    }
                    pulse={stats.suspended > 0 || stats.installing > 0}
                  />
                </div>
                <p className="ds-adm-srv-header-meta">
                  Provision, monitor, and manage every instance across your fleet
                </p>
              </div>
            </div>

            <div className="ds-adm-srv-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh servers"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              {fullAdmin ? (
                <Link to="/admin/servers/new">
                  <Button type="button" size="sm">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Provision server
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="ds-adm-srv-header-stats" role="list" aria-label="Server summary">
            {headerStats.map((stat) => (
              <div key={stat.label} className="ds-adm-srv-header-stat" role="listitem">
                <span className="ds-adm-srv-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-adm-srv-header-stat-copy">
                  <span className="ds-adm-srv-header-stat-label">{stat.label}</span>
                  <span className="ds-adm-srv-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
