import { Link } from 'react-router-dom';
import { ChevronRight, Egg, Layers, Plus, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import { getNestFleetTone, type NestFleetStats } from './nest-fleet-utils';

export function NestsHeader({
  stats,
  refreshing,
  fullAdmin,
  onRefresh,
  onImport,
  onCreate,
}: {
  stats: NestFleetStats;
  refreshing: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
  onImport: () => void;
  onCreate: () => void;
}) {
  const tone = getNestFleetTone(stats);
  const statusLabel =
    stats.nests === 0
      ? 'No nests'
      : stats.empty > 0
        ? `${stats.empty} empty nest${stats.empty === 1 ? '' : 's'}`
        : stats.disabled > 0
          ? `${stats.disabled} disabled egg${stats.disabled === 1 ? '' : 's'}`
          : `${stats.eggs} eggs`;

  const headerStats = [
    { icon: Layers, label: 'Nests', value: String(stats.nests) },
    { icon: Egg, label: 'Eggs', value: String(stats.eggs) },
    { icon: Layers, label: 'With eggs', value: String(stats.withEggs) },
    { icon: Egg, label: 'Deployed', value: String(stats.deployed) },
  ];

  return (
    <div className="ds-adm-nest-header-wrap">
      <header className={`ds-adm-nest-header ds-adm-nest-header--${tone}`}>
        <nav className="ds-adm-nest-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Nests &amp; eggs</span>
        </nav>

        <div className="ds-adm-nest-header-body">
          <div className="ds-adm-nest-header-accent" aria-hidden />

          <div className="ds-adm-nest-header-main">
            <div className="ds-adm-nest-header-identity">
              <div className="ds-adm-nest-header-icon-wrap" aria-hidden>
                <Layers className="ds-icon" />
                <span className={`ds-adm-nest-header-pulse ds-adm-nest-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-adm-nest-header-title-row">
                  <h1 className="ds-adm-nest-header-title">Service templates</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={tone === 'warning' ? 'warning' : tone === 'healthy' ? 'success' : 'neutral'}
                    pulse={tone === 'warning'}
                  />
                </div>
                <p className="ds-adm-nest-header-meta">
                  Nests group eggs — import PTDL_v2 JSON to provision new server types
                </p>
              </div>
            </div>

            <div className="ds-adm-nest-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh nests"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              {fullAdmin ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={onImport}>
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    Import egg
                  </Button>
                  <Button type="button" size="sm" onClick={onCreate}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Create nest
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="ds-adm-nest-header-stats" role="list" aria-label="Template summary">
            {headerStats.map((stat) => (
              <div key={stat.label} className="ds-adm-nest-header-stat" role="listitem">
                <span className="ds-adm-nest-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-adm-nest-header-stat-copy">
                  <span className="ds-adm-nest-header-stat-label">{stat.label}</span>
                  <span className="ds-adm-nest-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
