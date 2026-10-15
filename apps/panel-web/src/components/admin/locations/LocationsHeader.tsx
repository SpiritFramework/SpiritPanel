import { Link } from 'react-router-dom';
import { ChevronRight, Globe, HardDrive, MapPin, Network, Plus, RefreshCw, Server } from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
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
  const tone = stats.total === 0 ? 'idle' : stats.empty > 0 ? 'warn' : 'live';
  const statusLabel =
    stats.total === 0
      ? 'No regions'
      : stats.empty > 0
        ? `${stats.empty} empty`
        : `${stats.inUse} in use`;

  const headerStats = [
    { icon: Globe, label: 'Regions', value: String(stats.total) },
    { icon: MapPin, label: 'In use', value: String(stats.inUse) },
    { icon: Network, label: 'Nodes', value: String(stats.nodes) },
    { icon: Server, label: 'Servers', value: String(stats.servers) },
  ];

  return (
    <div className="ds-plg-header-wrap">
      <header className={`ds-plg-header ds-plg-header--${tone === 'warn' ? 'idle' : tone}`}>
        <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Locations</span>
        </nav>

        <div className="ds-plg-header-body">
          <div className="ds-plg-header-accent" aria-hidden />

          <div className="ds-plg-header-main">
            <div className="ds-plg-header-identity">
              <div className="ds-plg-header-icon-wrap" aria-hidden>
                <Globe className="ds-icon" />
                <span className={`ds-plg-header-pulse ds-plg-header-pulse--${tone === 'warn' ? 'idle' : tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-plg-header-title-row">
                  <h1 className="ds-plg-header-title">Locations</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={tone === 'live' ? 'success' : tone === 'warn' ? 'warning' : 'neutral'}
                    pulse={tone === 'warn'}
                  />
                </div>
                <p className="ds-plg-header-meta">
                  Geographic regions that group your Wings nodes and server fleet
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
                aria-label="Refresh locations"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Link to="/admin/nodes">
                <Button type="button" variant="secondary" size="sm">
                  <HardDrive className="h-3.5 w-3.5" aria-hidden />
                  Nodes
                </Button>
              </Link>
              {fullAdmin ? (
                <Button size="sm" onClick={onCreate}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add location
                </Button>
              ) : null}
            </div>
          </div>

          <div className="ds-plg-header-stats" role="list" aria-label="Location summary">
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
