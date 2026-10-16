import { Link } from 'react-router-dom';
import {
  ChevronRight,
  HardDrive,
  MapPin,
  Plus,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
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
  const tone = stats.total === 0 ? 'idle' : stats.offline > 0 ? 'warn' : 'live';
  const statusLabel =
    stats.total === 0
      ? 'No nodes'
      : stats.offline > 0
        ? `${stats.offline} offline`
        : `${stats.online} online`;

  const headerStats = [
    { icon: HardDrive, label: 'Nodes', value: String(stats.total) },
    { icon: Wifi, label: 'Online', value: String(stats.online) },
    { icon: WifiOff, label: 'Offline', value: String(stats.offline) },
    { icon: Server, label: 'Servers', value: String(stats.servers) },
  ];

  return (
    <div className="ds-plg-header-wrap">
      <header className={`ds-plg-header ds-plg-header--${tone === 'warn' ? 'idle' : tone}`}>
        <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Nodes</span>
        </nav>

        <div className="ds-plg-header-body">
          <div className="ds-plg-header-accent" aria-hidden />

          <div className="ds-plg-header-main">
            <div className="ds-plg-header-identity">
              <div className="ds-plg-header-icon-wrap" aria-hidden>
                <HardDrive className="ds-icon" />
                <span className={`ds-plg-header-pulse ds-plg-header-pulse--${tone === 'warn' ? 'idle' : tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-plg-header-title-row">
                  <h1 className="ds-plg-header-title">Nodes</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={tone === 'live' ? 'success' : tone === 'warn' ? 'warning' : 'neutral'}
                    pulse={tone === 'warn'}
                  />
                </div>
                <p className="ds-plg-header-meta">
                  Wings daemons across your locations — reachability, capacity, and port inventory
                </p>
              </div>
            </div>

            <div className="ds-plg-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing || loading}
                aria-label="Refresh nodes"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Link to="/admin/locations">
                <Button type="button" variant="secondary" size="sm">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Locations
                </Button>
              </Link>
              {fullAdmin ? (
                <Link to="/admin/nodes/new">
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add node
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="ds-plg-header-stats" role="list" aria-label="Node summary">
            {headerStats.map((stat) => (
              <div key={stat.label} className="ds-plg-header-stat" role="listitem">
                <span className="ds-plg-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-plg-header-stat-copy">
                  <span className="ds-plg-header-stat-label">{stat.label}</span>
                  <span className="ds-plg-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
