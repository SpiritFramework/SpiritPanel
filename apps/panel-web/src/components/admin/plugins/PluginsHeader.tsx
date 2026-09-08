import { Link } from 'react-router-dom';
import { ChevronRight, Layers, Puzzle, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import type { PluginFleetStats } from './plugin-fleet-utils';

export function PluginsHeader({
  stats,
  refreshing,
  onRefresh,
}: {
  stats: PluginFleetStats;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const tone = stats.enabled > 0 ? 'live' : 'idle';
  const statusLabel = stats.enabled > 0 ? `${stats.enabled} active` : 'All off';

  const headerStats = [
    { icon: Puzzle, label: 'Installed', value: String(stats.total) },
    { icon: Zap, label: 'Enabled', value: String(stats.enabled) },
    { icon: Layers, label: 'Catalog items', value: String(stats.catalogEntries) },
    { icon: Sparkles, label: 'Type', value: 'Built-in' },
  ];

  return (
    <div className="ds-plg-header-wrap">
      <header className={`ds-plg-header ds-plg-header--${tone}`}>
        <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Plugins</span>
        </nav>

        <div className="ds-plg-header-body">
          <div className="ds-plg-header-accent" aria-hidden />

          <div className="ds-plg-header-main">
            <div className="ds-plg-header-identity">
              <div className="ds-plg-header-icon-wrap" aria-hidden>
                <Puzzle className="ds-icon" />
                <span className={`ds-plg-header-pulse ds-plg-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-plg-header-title-row">
                  <h1 className="ds-plg-header-title">Panel plugins</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={stats.enabled > 0 ? 'success' : 'neutral'}
                    pulse={stats.enabled > 0}
                  />
                </div>
                <p className="ds-plg-header-meta">
                  Enable built-in features, configure catalogs, and control what server owners can install
                </p>
              </div>
            </div>

            <div className="ds-plg-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh plugins"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
            </div>
          </div>

          <div className="ds-plg-header-stats" role="list" aria-label="Plugin summary">
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
