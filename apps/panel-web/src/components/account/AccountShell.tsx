import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '../Layout';

export type AccountTab<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
};

export type AccountStat = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function AccountShell<T extends string>({
  avatar,
  title,
  subtitle,
  badges,
  stats,
  adminLink,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  eyebrow?: string;
  avatar: ReactNode;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  stats?: AccountStat[];
  adminLink?: boolean;
  tabs: AccountTab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  children: ReactNode;
}) {
  return (
    <div className="account-shell">
      <header className="account-strip">
        <div className="account-strip-inner">
          <div className="account-strip-identity">
            <div className="account-avatar-wrap">{avatar}</div>
            <div className="account-strip-copy min-w-0">
              <div className="account-strip-title-row">
                <h1 className="account-title">{title}</h1>
                {badges ? <div className="account-strip-badges">{badges}</div> : null}
              </div>
              {subtitle ? <div className="account-subtitle">{subtitle}</div> : null}
              {stats && stats.length > 0 ? (
                <ul className="account-strip-meta">
                  {stats.map((stat) => (
                    <li key={stat.label}>
                      <stat.icon className="h-3.5 w-3.5 shrink-0 opacity-65" aria-hidden />
                      <span>
                        <strong>{stat.value}</strong> {stat.label.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {adminLink ? (
            <Link to="/admin" className="account-strip-admin shrink-0">
              <Button variant="subtle" className="account-admin-btn">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Open admin
              </Button>
            </Link>
          ) : null}
        </div>

        <nav className="account-tabs" aria-label="Account sections">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`account-tab ${selected ? 'account-tab--active' : ''}`}
                aria-current={selected ? 'page' : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 ? (
                  <span className="account-tab-count">{tab.count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="account-body">{children}</div>
    </div>
  );
}

export function AccountSection({
  title,
  description,
  icon: Icon,
  badge,
  children,
  tone = 'default',
  actions,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning';
  actions?: ReactNode;
}) {
  return (
    <section className={`account-section account-section--${tone}`}>
      <div className="account-section-head">
        <span className="account-section-icon" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="account-section-title">{title}</h2>
            {badge}
          </div>
          {description ? <p className="account-section-desc">{description}</p> : null}
        </div>
        {actions ? <div className="account-section-actions shrink-0">{actions}</div> : null}
      </div>
      <div className="account-section-body">{children}</div>
    </section>
  );
}

export function AccountStatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span className={`account-status-badge ${active ? 'account-status-badge--on' : 'account-status-badge--off'}`}>
      <span className="account-status-dot" aria-hidden />
      {active ? (activeLabel ?? 'Active') : (inactiveLabel ?? 'Not set up')}
    </span>
  );
}
