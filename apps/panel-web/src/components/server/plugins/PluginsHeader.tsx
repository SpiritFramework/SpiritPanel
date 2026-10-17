import { ArrowUpCircle, Package, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function PluginsHeader({
  serverName,
  eggName,
  eggLogoUrl,
  routeLabel,
  platformLabel,
  gameVersion,
  installed,
  updates,
  refreshing,
  onRefresh,
  onInstalledClick,
  onUpdatesClick,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  routeLabel: string;
  platformLabel: string;
  gameVersion: string | null;
  installed: number;
  updates: number;
  refreshing: boolean;
  onRefresh: () => void;
  onInstalledClick?: () => void;
  onUpdatesClick?: () => void;
}) {
  const statusLabel =
    updates > 0
      ? `${updates} update${updates === 1 ? '' : 's'}`
      : installed > 0
        ? `${installed} installed`
        : 'Catalog';

  return (
    <header className="ds-srv-plugins-header">
      <div className="ds-srv-plugins-header-accent" aria-hidden />

      <div className="ds-srv-plugins-header-body">
        <div className="ds-srv-plugins-header-main">
          <div className="ds-srv-plugins-header-identity">
            <div className="ds-srv-plugins-header-icon-wrap" aria-hidden>
              <ServerEggIcon
                eggName={eggName}
                logoUrl={eggLogoUrl}
                className="h-5 w-5"
                iconClassName="h-5 w-5 text-white/90"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-plugins-header-title-row">
                <h1 className="ds-srv-plugins-header-title truncate">{serverName}</h1>
                <span className="ds-srv-plugins-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-plugins-header-route">{routeLabel}</span>
                <StatusPill
                  label={statusLabel}
                  tone={updates > 0 ? 'warning' : 'neutral'}
                  compact
                />
              </div>
              <p className="ds-srv-plugins-header-meta truncate">
                {platformLabel}
                {gameVersion ? ` · ${gameVersion}` : ''}
                {' · '}
                Modrinth catalog &amp; on-disk JARs
              </p>
            </div>
          </div>

          <div className="ds-srv-plugins-header-actions">
            <div className="ds-srv-plugins-metrics" aria-label="Plugin totals">
              <button
                type="button"
                className={`ds-srv-plugins-metric${installed > 0 ? ' ds-srv-plugins-metric--ok' : ''}`}
                onClick={onInstalledClick}
                disabled={!onInstalledClick}
              >
                <span className="ds-srv-plugins-metric-icon" aria-hidden>
                  <Package className="h-3.5 w-3.5" />
                </span>
                <span className="ds-srv-plugins-metric-copy">
                  <span className="ds-srv-plugins-metric-label">Installed</span>
                  <span className="ds-srv-plugins-metric-value">{installed}</span>
                </span>
              </button>
              <button
                type="button"
                className={`ds-srv-plugins-metric${updates > 0 ? ' ds-srv-plugins-metric--warn' : ''}`}
                onClick={onUpdatesClick}
                disabled={!onUpdatesClick}
              >
                <span className="ds-srv-plugins-metric-icon" aria-hidden>
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                </span>
                <span className="ds-srv-plugins-metric-copy">
                  <span className="ds-srv-plugins-metric-label">Updates</span>
                  <span className="ds-srv-plugins-metric-value">{updates}</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              className="ds-srv-plugins-action-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh plugins"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              <span className="ds-srv-plugins-action-label">Refresh</span>
            </button>
          </div>
        </div>

        <div className="ds-srv-plugins-header-kicker" aria-hidden>
          <Package className="h-3 w-3" />
          <span>Modrinth</span>
        </div>
      </div>
    </header>
  );
}
