import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Box, ChevronRight, Copy, Layers, Server, Variable } from 'lucide-react';
import type { AdminEggDetail } from '../../../lib/api';
import { getServerTheme } from '../../../lib/server-theme';
import { ServerEggIcon } from '../../ServerEggIcon';
import { StatusPill } from '../../ui';
import type { EggDetailTab } from '../../../pages/admin/egg-detail/helpers';
import { EGG_GRADIENT } from '../../../pages/admin/egg-detail/helpers';

export function EggDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: EggDetailTab; label: string; count?: number }[];
  active: EggDetailTab;
  onChange: (tab: EggDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs" aria-label="Egg sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-header-tab${active === tab.id ? ' ds-nd-header-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? (
            <span className="ds-nd-header-tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export function EggDetailHeader({ detail }: { detail: AdminEggDetail }) {
  const theme = getServerTheme(detail.name);
  const gradient = theme.gradient ?? EGG_GRADIENT;
  const imageCount = Object.keys(detail.dockerImages).length;

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Layers, label: 'Nest', value: detail.nest.name },
    { icon: Variable, label: 'Variables', value: String(detail.variables.length) },
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    { icon: Box, label: 'Images', value: String(imageCount) },
  ];

  return (
    <header className={`ds-egg-header${detail.enabled ? '' : ' ds-egg-header--disabled'}`}>
      <nav className="ds-egg-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/nests">Nests</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <Link to={`/admin/nests/${detail.nestId}`} className="truncate">
          {detail.nest.name}
        </Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-egg-header-body">
        <div className="ds-egg-header-accent" style={{ background: gradient }} aria-hidden />

        <div className="ds-egg-header-main">
          <div className="ds-egg-header-identity">
            <div className="ds-egg-header-icon-wrap" style={{ background: gradient }} aria-hidden>
              <ServerEggIcon
                eggName={detail.name}
                logoUrl={detail.logoUrl}
                className="h-5 w-5"
              />
              <span
                className={`ds-egg-header-pulse${detail.enabled ? '' : ' ds-egg-header-pulse--off'}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="ds-egg-header-title-row">
                <h1 className="ds-egg-header-title truncate">{detail.name}</h1>
                <StatusPill
                  label={detail.enabled ? 'Enabled' : 'Disabled'}
                  tone={detail.enabled ? 'success' : 'warning'}
                  pulse={detail.enabled}
                />
                {detail.serverCount > 0 ? (
                  <StatusPill label="In use" tone="info" compact />
                ) : null}
              </div>
              <p className="ds-egg-header-sub truncate">
                {detail.description || 'No description'}
              </p>
              <p className="ds-egg-header-meta truncate">by {detail.author}</p>
            </div>
          </div>
        </div>

        <div className="ds-egg-header-stats" role="list" aria-label="Egg summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-egg-header-stat" role="listitem">
              <span className="ds-egg-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-egg-header-stat-copy">
                <span className="ds-egg-header-stat-label">{stat.label}</span>
                <span className="ds-egg-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function EggDetailQuickDock({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string; onClick: () => void }[];
}) {
  return (
    <nav className="ds-egg-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <button key={item.label} type="button" className="ds-egg-dock-item" onClick={item.onClick}>
          <span className="ds-egg-dock-icon" aria-hidden>
            <item.icon className="ds-icon ds-icon--sm" />
          </span>
          <span className="ds-egg-dock-copy">
            <span className="ds-egg-dock-label">{item.label}</span>
            <span className="ds-egg-dock-hint">{item.hint}</span>
          </span>
          <ChevronRight className="ds-egg-dock-chevron ds-icon ds-icon--sm" aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export function EggDetailPanel({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
  tone?: 'danger' | 'warning';
}) {
  return (
    <section
      className={`ds-egg-panel${tone ? ` ds-egg-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
    >
      <header className="ds-egg-panel-head">
        <span className="ds-egg-panel-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="ds-egg-panel-title">{title}</h2>
          {description ? <p className="ds-egg-panel-desc">{description}</p> : null}
        </div>
        {badge ? <span className="ds-egg-panel-badge">{badge}</span> : null}
      </header>
      <div className="ds-egg-panel-body">{children}</div>
    </section>
  );
}

export function EggDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-egg-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-egg-meta-item">
          <dt className="ds-egg-meta-label">{item.label}</dt>
          <dd className={`ds-egg-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-egg-meta-copy" onClick={item.onCopy}>
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
