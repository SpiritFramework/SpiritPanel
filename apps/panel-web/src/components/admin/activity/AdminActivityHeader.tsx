import { Link } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusPill } from '../../ui';

export const ACTIVITY_SCOPES = [
  {
    id: 'panel',
    label: 'All panel',
    description: 'Everything across the panel — auth, admin, and server events',
    icon: LayoutDashboard,
  },
  {
    id: 'auth',
    label: 'Auth & signups',
    description: 'Logins, registrations, and profile changes',
    icon: Users,
  },
  {
    id: 'admin',
    label: 'Admin actions',
    description: 'Staff changes, provisioning, and infrastructure updates',
    icon: ShieldAlert,
  },
] as const;

export type ActivityScope = (typeof ACTIVITY_SCOPES)[number]['id'];

export function isActivityScope(value: string | null): value is ActivityScope {
  return ACTIVITY_SCOPES.some((scope) => scope.id === value);
}

export function AdminActivityHeader({
  activeScope,
  onScopeChange,
  total,
  loaded,
  filtered,
  refreshing,
  canClear,
  clearing,
  onRefresh,
  onClear,
}: {
  activeScope: ActivityScope;
  onScopeChange: (scope: ActivityScope) => void;
  total: number;
  loaded: number;
  filtered: number;
  refreshing: boolean;
  canClear: boolean;
  clearing: boolean;
  onRefresh: () => void;
  onClear: () => void;
}) {
  const scopeMeta = ACTIVITY_SCOPES.find((s) => s.id === activeScope) ?? ACTIVITY_SCOPES[0];

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: LayoutDashboard, label: 'Scope', value: scopeMeta.label },
    { icon: Activity, label: 'Total', value: String(total) },
    { icon: ScrollText, label: 'Loaded', value: String(loaded) },
    { icon: ShieldAlert, label: 'Showing', value: String(filtered) },
  ];

  return (
    <div className="ds-ad-act-header-wrap">
      <header className="ds-ad-act-header">
        <nav className="ds-ad-act-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Activity</span>
        </nav>

        <div className="ds-ad-act-header-body">
          <div className="ds-ad-act-header-accent" aria-hidden />

          <div className="ds-ad-act-header-main">
            <div className="ds-ad-act-header-identity">
              <div className="ds-ad-act-header-icon-wrap" aria-hidden>
                <Activity className="ds-icon" />
                <span className="ds-ad-act-header-pulse" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-ad-act-header-title-row">
                  <h1 className="ds-ad-act-header-title">System activity</h1>
                  <StatusPill label="Audit log" tone="neutral" />
                </div>
                <p className="ds-ad-act-header-meta">
                  {scopeMeta.description}. Events older than 30 days are removed automatically.
                </p>
              </div>
            </div>

            <div className="ds-ad-act-header-actions">
              {canClear ? (
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary ds-btn--sm"
                  disabled={clearing}
                  onClick={onClear}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Clear scope
                </button>
              ) : null}
              <button
                type="button"
                className="ds-btn ds-btn--secondary ds-btn--sm"
                onClick={onRefresh}
                aria-label="Refresh activity"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
            </div>
          </div>

          <div className="ds-ad-act-header-stats" role="list" aria-label="Activity summary">
            {stats.map((stat) => (
              <div key={stat.label} className="ds-ad-act-header-stat" role="listitem">
                <span className="ds-ad-act-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-ad-act-header-stat-copy">
                  <span className="ds-ad-act-header-stat-label">{stat.label}</span>
                  <span className="ds-ad-act-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>

          <nav className="ds-ad-act-header-tabs" aria-label="Activity scopes">
            {ACTIVITY_SCOPES.map((scope) => (
              <button
                key={scope.id}
                type="button"
                className={`ds-ad-act-header-tab${activeScope === scope.id ? ' ds-ad-act-header-tab--active' : ''}`}
                onClick={() => onScopeChange(scope.id)}
                aria-current={activeScope === scope.id ? 'page' : undefined}
              >
                <scope.icon className="h-3.5 w-3.5" aria-hidden />
                {scope.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
