import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type AdminEntityTab = {
  id: string;
  label: string;
  count?: number | string;
};

export function AdminEntityHeader({
  breadcrumb,
  tone = 'neutral',
  icon: Icon,
  title,
  meta,
  badges,
  actions,
  stats,
  tabs,
  activeTab,
  onTabChange,
}: {
  breadcrumb: { label: string; to?: string }[];
  tone?: 'neutral' | 'online' | 'offline' | 'maintenance' | 'warn' | 'ok';
  icon?: LucideIcon;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  tabs?: AdminEntityTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}) {
  return (
    <header className={`ds-adm-entity ds-nd-header ds-adm-entity--${tone}`}>
      <nav className="ds-adm-entity-crumb ds-nd-header-crumb" aria-label="Breadcrumb">
        {breadcrumb.map((item, i) => (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 ? <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden /> : null}
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
          </span>
        ))}
      </nav>

      <div className="ds-adm-entity-body ds-nd-header-body">
        <div className="ds-adm-entity-main ds-nd-header-main">
          <div className="ds-adm-entity-identity ds-nd-header-identity">
            {Icon ? (
              <div className="ds-adm-entity-icon ds-nd-header-icon-wrap" aria-hidden>
                <Icon className="ds-icon" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="ds-adm-entity-title-row ds-nd-header-title-row">
                <h1 className="ds-adm-entity-title ds-nd-header-title">{title}</h1>
                {badges}
              </div>
              {meta ? <div className="ds-adm-entity-meta ds-nd-header-meta">{meta}</div> : null}
            </div>
          </div>
          {actions ? <div className="ds-adm-entity-actions ds-nd-header-actions">{actions}</div> : null}
        </div>
        {stats ? <div className="ds-adm-entity-stats ds-nd-header-stats">{stats}</div> : null}
      </div>

      {tabs && tabs.length > 0 && onTabChange ? (
        <div className="ds-adm-entity-tabs ds-nd-header-tabs" role="tablist" aria-label="Sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ds-adm-entity-tab ds-nd-header-tab${activeTab === tab.id ? ' ds-adm-entity-tab--active ds-nd-header-tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {tab.count != null ? (
                <span className="ds-nd-header-tab-count">{tab.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
