import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  ChevronRight,
  Copy,
  Key,
  Mail,
  Server,
  Users,
} from 'lucide-react';
import type { AdminUserDetail } from '../../../lib/api';
import { AccountStatus, RoleBadge } from '../../UserCard';
import { UserAvatar } from '../../UserAvatar';
import { StatusPill } from '../../ui';
import type { UserDetailTab, UserDetailTone } from '../../../pages/admin/user-detail/helpers';
import { getUserDetailTone, userDisplayName } from '../../../pages/admin/user-detail/helpers';

export function UserDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: UserDetailTab; label: string; count?: number }[];
  active: UserDetailTab;
  onChange: (tab: UserDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs" aria-label="User sections">
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

export function UserDetailHeader({
  detail,
  isSelf,
  onCopyEmail,
  copied,
}: {
  detail: AdminUserDetail;
  isSelf?: boolean;
  onCopyEmail?: () => void;
  copied?: boolean;
}) {
  const tone = getUserDetailTone(detail);
  const name = userDisplayName(detail);
  const joined = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statusLabel = detail.suspended
    ? 'Suspended'
    : detail.role === 'admin'
      ? detail.rootAdmin
        ? 'Root admin'
        : 'Admin'
      : detail.role === 'staff'
        ? 'Staff'
        : 'Active';

  const statusTone = detail.suspended ? 'warning' : detail.role === 'admin' ? 'info' : 'success';

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Server, label: 'Owned', value: String(detail.serverCount) },
    { icon: Users, label: 'Shared', value: String(detail.subuserCount) },
    { icon: Key, label: 'API keys', value: String(detail.apiKeyCount) },
    { icon: Calendar, label: 'Joined', value: joined },
  ];

  return (
    <header className={`ds-ud-header ds-ud-header--${tone}`}>
      <nav className="ds-ud-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/users">Users</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">@{detail.username}</span>
      </nav>

      <div className="ds-ud-header-body">
        <div className="ds-ud-header-accent" aria-hidden />

        <div className="ds-ud-header-main">
          <div className="ds-ud-header-identity">
            <div className="ds-ud-header-avatar-wrap">
              <UserAvatar user={detail} size="lg" ring />
              <span className={`ds-ud-header-pulse ds-ud-header-pulse--${tone}`} aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <div className="ds-ud-header-title-row">
                <h1 className="ds-ud-header-title">{name}</h1>
                {isSelf ? <span className="ds-ud-header-self">You</span> : null}
                <StatusPill label={statusLabel} tone={statusTone} pulse={!detail.suspended} />
              </div>

              <div className="ds-ud-header-email-row">
                <Mail className="ds-icon ds-icon--sm opacity-70" aria-hidden />
                <span className="truncate">{detail.email}</span>
                {onCopyEmail ? (
                  <button type="button" className="ds-ud-header-email-copy" onClick={onCopyEmail}>
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>

              <div className="ds-ud-header-badges">
                <RoleBadge role={detail.role} rootAdmin={detail.rootAdmin} />
                <AccountStatus suspended={detail.suspended} />
                <span className="ds-ud-header-tag">@{detail.username}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-ud-header-stats" role="list" aria-label="User summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-ud-header-stat" role="listitem">
              <span className="ds-ud-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-ud-header-stat-copy">
                <span className="ds-ud-header-stat-label">{stat.label}</span>
                <span className="ds-ud-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function UserDetailQuickDock({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string; onClick: () => void }[];
}) {
  return (
    <nav className="ds-ud-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <button key={item.label} type="button" className="ds-ud-dock-item" onClick={item.onClick}>
          <span className="ds-ud-dock-icon" aria-hidden>
            <item.icon className="ds-icon ds-icon--sm" />
          </span>
          <span className="ds-ud-dock-copy">
            <span className="ds-ud-dock-label">{item.label}</span>
            <span className="ds-ud-dock-hint">{item.hint}</span>
          </span>
          <ChevronRight className="ds-ud-dock-chevron ds-icon ds-icon--sm" aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export function UserDetailPanel({
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
      className={`ds-ud-panel${tone ? ` ds-ud-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
    >
      <header className="ds-ud-panel-head">
        <span className="ds-ud-panel-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="ds-ud-panel-title">{title}</h2>
          {description ? <p className="ds-ud-panel-desc">{description}</p> : null}
        </div>
        {badge ? <span className="ds-ud-panel-badge">{badge}</span> : null}
      </header>
      <div className="ds-ud-panel-body">{children}</div>
    </section>
  );
}

export function UserDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-ud-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-ud-meta-item">
          <dt className="ds-ud-meta-label">{item.label}</dt>
          <dd className={`ds-ud-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-ud-meta-copy" onClick={item.onCopy}>
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function UserDetailUsageMeter({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="ds-ud-usage-meter">
      <div className="ds-ud-usage-meter-head">
        <span>{label}</span>
        <span className="ds-ud-usage-meter-value">
          {value}
          {max > 0 ? ` / ${max}` : ''}
        </span>
      </div>
      {max > 0 ? (
        <div className="ds-ud-usage-meter-track" aria-hidden>
          <span className="ds-ud-usage-meter-fill" style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
        </div>
      ) : null}
      {hint ? <p className="ds-ud-usage-meter-hint">{hint}</p> : null}
    </div>
  );
}

export type { UserDetailTone };
