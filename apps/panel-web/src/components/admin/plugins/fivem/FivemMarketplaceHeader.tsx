import { Link } from 'react-router-dom';
import { ChevronRight, Github, Layers, Store } from 'lucide-react';
import { StatusPill } from '../../../ui';

export function FivemMarketplaceHeader({
  catalogCount,
  settings,
}: {
  catalogCount: number;
  settings: { enabled: boolean; allowGithubInstalls: boolean; allowCatalogInstalls: boolean };
}) {
  const live = settings.enabled;
  const tone = live ? 'live' : 'idle';

  const stats = [
    { icon: Store, label: 'Catalog', value: String(catalogCount) },
    { icon: Layers, label: 'Host catalog', value: settings.allowCatalogInstalls ? 'On' : 'Off' },
    { icon: Github, label: 'GitHub', value: settings.allowGithubInstalls ? 'On' : 'Off' },
    { icon: Store, label: 'Status', value: live ? 'Live' : 'Off' },
  ];

  return (
    <div className="ds-plg-header-wrap">
      <header className={`ds-plg-header ds-plg-header--fivem ds-plg-header--${tone}`}>
        <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <Link to="/admin/plugins">Plugins</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>FiveM Marketplace</span>
        </nav>

        <div className="ds-plg-header-body">
          <div className="ds-plg-header-accent" aria-hidden />

          <div className="ds-plg-header-main">
            <div className="ds-plg-header-identity">
              <div className="ds-plg-header-icon-wrap ds-plg-header-icon-wrap--fivem" aria-hidden>
                <Store className="ds-icon" />
                <span className={`ds-plg-header-pulse ds-plg-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-plg-header-title-row">
                  <h1 className="ds-plg-header-title">FiveM Marketplace</h1>
                  <StatusPill label={live ? 'Live' : 'Off'} tone={live ? 'success' : 'neutral'} pulse={live} />
                </div>
                <p className="ds-plg-header-meta">
                  Curated resources and GitHub discovery for FiveM servers — installs patch server.cfg automatically
                </p>
              </div>
            </div>
          </div>

          <div className="ds-plg-header-stats" role="list" aria-label="Marketplace summary">
            {stats.map((stat) => (
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
