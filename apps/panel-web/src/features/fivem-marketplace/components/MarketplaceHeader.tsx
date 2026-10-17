import { Github, Package, RefreshCw, Store } from 'lucide-react';
import { StatusPill } from '../../../components/ui';
import { ServerEggIcon } from '../../../components/ServerEggIcon';
import type { FivemMarketplaceOverview } from '../hooks/useFivemMarketplace';

export function MarketplaceHeader({
  serverName,
  eggName,
  eggLogoUrl,
  layoutLabel,
  overview,
  refreshing,
  onRefresh,
  onCatalogClick,
  onInstalledClick,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  layoutLabel: string;
  overview: FivemMarketplaceOverview | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCatalogClick?: () => void;
  onInstalledClick?: () => void;
}) {
  const installed = overview?.stats.installedCount ?? 0;
  const catalog = overview?.stats.catalogCount ?? 0;
  const features = [
    overview?.features.catalog ? 'Host catalog' : null,
    overview?.features.github ? 'GitHub' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const statusLabel =
    installed > 0 ? `${installed} installed` : catalog > 0 ? `${catalog} in catalog` : 'Marketplace';

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
                <span className="ds-srv-plugins-header-route">Marketplace</span>
                <StatusPill label={statusLabel} tone="neutral" compact />
              </div>
              <p className="ds-srv-plugins-header-meta truncate">
                {layoutLabel}
                {features ? ` · ${features}` : ''}
              </p>
            </div>
          </div>

          <div className="ds-srv-plugins-header-actions">
            <div className="ds-srv-plugins-metrics" aria-label="Marketplace totals">
              <button
                type="button"
                className={`ds-srv-plugins-metric${catalog > 0 ? ' ds-srv-plugins-metric--ok' : ''}`}
                onClick={onCatalogClick}
                disabled={!onCatalogClick}
              >
                <span className="ds-srv-plugins-metric-icon" aria-hidden>
                  <Store className="h-3.5 w-3.5" />
                </span>
                <span className="ds-srv-plugins-metric-copy">
                  <span className="ds-srv-plugins-metric-label">Catalog</span>
                  <span className="ds-srv-plugins-metric-value">{catalog}</span>
                </span>
              </button>
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
            </div>
            <button
              type="button"
              className="ds-srv-plugins-action-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh marketplace"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              <span className="ds-srv-plugins-action-label">Refresh</span>
            </button>
          </div>
        </div>

        <div className="ds-srv-plugins-header-kicker" aria-hidden>
          <Github className="h-3 w-3" />
          <span>FiveM resources</span>
        </div>
      </div>
    </header>
  );
}
