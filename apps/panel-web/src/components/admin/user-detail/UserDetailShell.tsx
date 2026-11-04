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
  Settings,
  Users,
} from 'lucide-react';
import type { AdminUserDetail } from '../../../lib/api';
import { RoleBadge } from '../../UserCard';
import { UserAvatar } from '../../UserAvatar';
import { StatusPill } from '../../ui';
import type { UserDetailTab, UserDetailTone } from '../../../pages/admin/user-detail/helpers';
import { getUserDetailTone, userDisplayName } from '../../../pages/admin/user-detail/helpers';
import { AdminSection, AdminToolButton } from '../primitives';

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
    <nav className="ds-nd-header-tabs ds-adm-entity-tabs" aria-label="User sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-header-tab ds-adm-entity-tab${active === tab.id ? ' ds-nd-header-tab--active ds-adm-entity-tab--active' : ''}`}
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

function userDetailEntityTone(tone: UserDetailTone): 'online' | 'warn' | 'offline' {
  if (tone === 'suspended') return 'warn';
  return 'online';
}

export function UserDetailHeader({
  detail,
  isSelf,
  onCopyEmail,
  copied,
  onManageAccount,
  onViewServers,
}: {
  detail: AdminUserDetail;
  isSelf?: boolean;
  onCopyEmail?: () => void;
  copied?: boolean;
  onManageAccount?: () => void;
  onViewServers?: () => void;
}) {
  const tone = getUserDetailTone(detail);
  const entityTone = userDetailEntityTone(tone);
  const name = userDisplayName(detail);
  const joined = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statusLabel = detail.suspended ? 'Suspended' : 'Active';
  const statusTone = detail.suspended ? 'warning' : 'success';

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Server, label: 'Owned', value: String(detail.serverCount) },
    { icon: Users, label: 'Shared', value: String(detail.subuserCount) },
    { icon: Key, label: 'API keys', value: String(detail.apiKeyCount) },
    { icon: Calendar, label: 'Joined', value: joined },
  ];

  return (
    <header
      className={`ds-ud-header ds-adm-entity ds-ud-header--${tone} ds-adm-entity--${entityTone}`}
    >
      <nav className="ds-ud-header-crumb ds-adm-entity-crumb" aria-label="Breadcrumb">
        <Link to="/admin/users">Users</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">@{detail.username}</span>
      </nav>

      <div className="ds-ud-header-body">
        <div className="ds-ud-header-glow" aria-hidden />
        <div className="ds-ud-header-accent" aria-hidden />

        <div className="ds-ud-header-main">
          <div className="ds-ud-header-identity">
            <div className="ds-ud-header-avatar-wrap">
              <UserAvatar user={detail} size="lg" ring />
              <span
                className={`ds-ud-header-pulse ds-ud-header-pulse--${tone}`}
                aria-hidden
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="ds-ud-header-eyebrow">User manage</p>
              <div className="ds-ud-header-title-row">
                <h1 className="ds-ud-header-title">{name}</h1>
                {isSelf ? <span className="ds-ud-header-self">You</span> : null}
                <StatusPill
                  label={statusLabel}
                  tone={statusTone}
                  pulse={!detail.suspended}
                />
              </div>

              <p className="ds-ud-header-meta">
                <RoleBadge role={detail.role} rootAdmin={detail.rootAdmin} />
                <span className="ds-ud-header-meta-sep" aria-hidden>
                  ·
                </span>
                <span>@{detail.username}</span>
              </p>

              <div className="ds-ud-header-endpoint">
                <span className="ds-ud-header-scheme" aria-hidden>
                  <Mail className="h-3 w-3" />
                </span>
                <code className="ds-ud-header-fqdn-text">{detail.email}</code>
                {onCopyEmail ? (
                  <button
                    type="button"
                    className="ds-ud-header-fqdn-copy"
                    onClick={onCopyEmail}
                    aria-label="Copy email"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="ds-nd-toolstrip ds-adm-entity-actions ds-ud-header-actions"
            role="group"
            aria-label="User actions"
          >
            {onViewServers ? (
              <AdminToolButton type="button" onClick={onViewServers}>
                <Server className="h-3.5 w-3.5" aria-hidden />
                Servers
              </AdminToolButton>
            ) : null}
            {onManageAccount ? (
              <AdminToolButton type="button" onClick={onManageAccount} primary>
                <Settings className="h-3.5 w-3.5" aria-hidden />
                Manage account
              </AdminToolButton>
            ) : null}
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

export function UserDetailPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className,
  tone,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'danger' | 'warning' | 'identity' | 'capacity' | 'connection' | 'trends';
}) {
  const sectionTone =
    tone === 'danger'
      ? 'danger'
      : tone === 'identity' ||
          tone === 'capacity' ||
          tone === 'connection' ||
          tone === 'trends'
        ? tone
        : 'default';

  return (
    <AdminSection
      className={`ds-ud-panel${tone === 'warning' || tone === 'danger' ? ` ds-ud-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={badge}
      actions={actions}
      tone={sectionTone}
    >
      {children}
    </AdminSection>
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
          <span
            className="ds-ud-usage-meter-fill"
            style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="ds-ud-usage-meter-hint">{hint}</p> : null}
    </div>
  );
}

export type { UserDetailTone };
