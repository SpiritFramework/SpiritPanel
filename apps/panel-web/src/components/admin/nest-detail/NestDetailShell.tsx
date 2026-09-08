import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Copy, Egg, Layers, Server, User } from 'lucide-react';
import type { AdminNestDetail } from '../../../lib/api';
import { StatusPill } from '../../ui';
import type { NestDetailTab } from '../../../pages/admin/nest-detail/helpers';
import { NEST_GRADIENT } from '../../../pages/admin/nest-detail/helpers';

export function NestDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: NestDetailTab; label: string; count?: number }[];
  active: NestDetailTab;
  onChange: (tab: NestDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs" aria-label="Nest sections">
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

export function NestDetailHeader({
  detail,
  fullAdmin,
  onImport,
}: {
  detail: AdminNestDetail;
  fullAdmin: boolean;
  onImport?: () => void;
}) {
  const hasEggs = detail.eggCount > 0;
  const authorShort = detail.author.includes('@')
    ? detail.author.split('@')[0]!
    : detail.author;

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Egg, label: 'Eggs', value: String(detail.eggCount) },
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    { icon: User, label: 'Author', value: authorShort },
  ];

  return (
    <header className={`ds-nst-header${hasEggs ? '' : ' ds-nst-header--empty'}`}>
      <nav className="ds-nst-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/nests">Nests</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-nst-header-body">
        <div className="ds-nst-header-accent" style={{ background: NEST_GRADIENT }} aria-hidden />

        <div className="ds-nst-header-main">
          <div className="ds-nst-header-identity">
            <div className="ds-nst-header-icon-wrap" style={{ background: NEST_GRADIENT }} aria-hidden>
              <Layers className="h-5 w-5 text-white/90" />
              <span className={`ds-nst-header-pulse${hasEggs ? '' : ' ds-nst-header-pulse--empty'}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="ds-nst-header-title-row">
                <h1 className="ds-nst-header-title truncate">{detail.name}</h1>
                <StatusPill
                  label={hasEggs ? `${detail.eggCount} eggs` : 'Empty'}
                  tone={hasEggs ? 'success' : 'neutral'}
                  pulse={hasEggs}
                />
              </div>
              <p className="ds-nst-header-sub truncate">
                {detail.description || 'No description'}
              </p>
              <p className="ds-nst-header-meta truncate">by {detail.author}</p>
            </div>
          </div>

          {fullAdmin && onImport ? (
            <div className="ds-nst-header-actions">
              <button type="button" className="ds-nst-header-action" onClick={onImport}>
                Import egg
              </button>
            </div>
          ) : null}
        </div>

        <div className="ds-nst-header-stats" role="list" aria-label="Nest summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-nst-header-stat" role="listitem">
              <span className="ds-nst-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-nst-header-stat-copy">
                <span className="ds-nst-header-stat-label">{stat.label}</span>
                <span className="ds-nst-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function NestDetailQuickDock({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string; onClick: () => void }[];
}) {
  return (
    <nav className="ds-nst-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <button key={item.label} type="button" className="ds-nst-dock-item" onClick={item.onClick}>
          <span className="ds-nst-dock-icon" aria-hidden>
            <item.icon className="ds-icon ds-icon--sm" />
          </span>
          <span className="ds-nst-dock-copy">
            <span className="ds-nst-dock-label">{item.label}</span>
            <span className="ds-nst-dock-hint">{item.hint}</span>
          </span>
          <ChevronRight className="ds-nst-dock-chevron ds-icon ds-icon--sm" aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export function NestDetailPanel({
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
      className={`ds-nst-panel${tone ? ` ds-nst-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
    >
      <header className="ds-nst-panel-head">
        <span className="ds-nst-panel-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="ds-nst-panel-title">{title}</h2>
          {description ? <p className="ds-nst-panel-desc">{description}</p> : null}
        </div>
        {badge ? <span className="ds-nst-panel-badge">{badge}</span> : null}
      </header>
      <div className="ds-nst-panel-body">{children}</div>
    </section>
  );
}

export function NestDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-nst-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-nst-meta-item">
          <dt className="ds-nst-meta-label">{item.label}</dt>
          <dd className={`ds-nst-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-nst-meta-copy" onClick={item.onCopy}>
                <Copy className="h-3 w-3 inline" aria-hidden />
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
