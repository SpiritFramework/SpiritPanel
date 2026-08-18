import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function MarketplacePage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`fm-page ${className}`.trim()}>{children}</div>;
}

export function MarketplaceBackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="fm-back">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}

export function MarketplaceEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fm-empty">
      <div className="fm-empty-icon" aria-hidden>
        <Icon className="h-6 w-6" />
      </div>
      <p className="fm-empty-title">{title}</p>
      {description ? <p className="fm-empty-desc">{description}</p> : null}
      {action}
    </div>
  );
}

export function MarketplaceSegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon: LucideIcon; badge?: number }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="fm-seg-tabs" aria-label="Marketplace sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`fm-seg-tab${isActive ? ' fm-seg-tab--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 ? (
              <span className="fm-seg-tab-badge">{tab.badge}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function MarketplaceSectionHead({
  icon: Icon,
  title,
  description,
  count,
  accent,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  count?: number;
  accent?: boolean;
  action?: ReactNode;
}) {
  return (
    <header className="fm-section-head">
      <span className={`fm-section-icon${accent ? ' fm-section-icon--accent' : ''}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="fm-section-title">{title}</h3>
        {description ? <p className="fm-section-desc">{description}</p> : null}
      </div>
      {count !== undefined && count > 0 ? <span className="fm-section-count">{count}</span> : null}
      {action}
    </header>
  );
}

export function MarketplaceAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' }) {
  return <div className={`fm-alert fm-alert--${tone}`}>{children}</div>;
}
