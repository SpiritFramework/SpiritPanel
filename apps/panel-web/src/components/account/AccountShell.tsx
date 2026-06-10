import type { LucideIcon } from 'lucide-react';
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
  avatar: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  stats?: AccountStat[];
  adminLink?: boolean;
  tabs: AccountTab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="account-shell flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/5">
      <header className="account-header shrink-0">
        <div className="account-header-accent" aria-hidden />
        <div className="account-header-body">
          <div className="account-avatar-wrap">{avatar}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="account-title">{title}</h1>
              {badges}
            </div>
            {subtitle && <div className="account-subtitle">{subtitle}</div>}
          </div>
          {adminLink && (
            <Link to="/admin" className="shrink-0">
              <Button variant="subtle" className="account-admin-btn">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="account-stat-row">
            {stats.map((stat) => (
              <div key={stat.label} className="account-stat-chip">
                <stat.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="account-stat-label">{stat.label}</span>
                <span className="account-stat-value">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <nav className="account-tabs shrink-0" aria-label="Account sections">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`account-tab ${selected ? 'account-tab--active' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="account-tab-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="account-body min-h-0 flex-1 overflow-y-auto">{children}</div>
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
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <section className={`account-section account-section--${tone}`}>
      <div className="account-section-head">
        <span className="account-section-icon">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="account-section-title">{title}</h2>
            {badge}
          </div>
          {description && <p className="account-section-desc">{description}</p>}
        </div>
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
