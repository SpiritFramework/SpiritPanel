import type { LucideIcon } from 'lucide-react';
import { Github, HardDrive, Package, Sparkles, Store } from 'lucide-react';
import type { FivemMarketplaceOverview } from '../hooks/useFivemMarketplace';

type Tab = 'catalog' | 'github' | 'installed';

const TAB_META: Record<Tab, { icon: LucideIcon; label: string }> = {
  catalog: { icon: Store, label: 'Host catalog' },
  github: { icon: Github, label: 'GitHub' },
  installed: { icon: Package, label: 'Installed' },
};

export function MarketplaceHeader({
  tab,
  layoutLabel,
  overview,
  onTabChange,
}: {
  tab: Tab;
  layoutLabel: string;
  overview: FivemMarketplaceOverview;
  onTabChange: (tab: Tab) => void;
}) {
  const tabs: Tab[] = [
    ...(overview.features.catalog ? (['catalog'] as Tab[]) : []),
    ...(overview.features.github ? (['github'] as Tab[]) : []),
    'installed',
  ];

  const tabBadge = (id: Tab): number | undefined => {
    if (id === 'catalog') return overview.stats.catalogCount;
    if (id === 'installed') return overview.stats.installedCount;
    return undefined;
  };

  return (
    <header className="ds-marketplace-header">
      <div className="ds-marketplace-header__banner">
        <div className="ds-marketplace-header__brand">
          <div className="ds-marketplace-header__logo" aria-hidden>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="ds-eyebrow">Server resources</p>
            <h1 className="ds-marketplace-header__title">FiveM Marketplace</h1>
            <p className="ds-marketplace-header__layout">
              <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {layoutLabel}
            </p>
          </div>
        </div>
      </div>

      <nav className="ds-marketplace-tabs" role="tablist" aria-label="Marketplace sections">
        {tabs.map((id) => {
          const meta = TAB_META[id];
          const Icon = meta.icon;
          const active = tab === id;
          const badge = tabBadge(id);

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              onClick={() => onTabChange(id)}
              className={`ds-marketplace-tab${active ? ' is-active' : ''}`}
            >
              <span className="ds-marketplace-tab__icon">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="ds-marketplace-tab__label">{meta.label}</span>
              {badge !== undefined && badge > 0 ? (
                <span className="ds-marketplace-tab__badge">{badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
