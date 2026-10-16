import {
  LayoutDashboard,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { normalizeAppearance } from '../../../lib/branding-appearance';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../PanelName';
import { Button } from '../../Layout';

export const ACTIVITY_SCOPES = [
  {
    id: 'panel',
    label: 'All panel',
    shortLabel: 'All',
    description: 'Auth and admin audit events across the panel',
    icon: LayoutDashboard,
  },
  {
    id: 'auth',
    label: 'Auth & signups',
    shortLabel: 'Auth',
    description: 'Logins, registrations, and profile changes',
    icon: Users,
  },
  {
    id: 'admin',
    label: 'Admin actions',
    shortLabel: 'Admin',
    description: 'Staff changes, provisioning, and infrastructure updates',
    icon: ShieldAlert,
  },
] as const;

export type ActivityScope = (typeof ACTIVITY_SCOPES)[number]['id'];

export function isActivityScope(value: string | null): value is ActivityScope {
  return ACTIVITY_SCOPES.some((scope) => scope.id === value);
}

function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  const { user } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const logoSrc = sanitizeImageSrc(branding.logoUrl);
  const name = user?.firstName?.trim() || user?.username || 'Admin';
  const scopeMeta = ACTIVITY_SCOPES.find((s) => s.id === activeScope) ?? ACTIVITY_SCOPES[0];

  const summary = [
    `${total} in scope`,
    `${loaded} loaded`,
    filtered !== loaded ? `${filtered} matching` : null,
    scopeMeta.label,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="ds-servers-fleet">
      {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

      <div className="ds-servers-fleet-top">
        <div className="ds-servers-fleet-identity">
          {logoSrc ? (
            <div className="ds-servers-fleet-mark">
              <img src={logoSrc} alt="" />
            </div>
          ) : (
            <div className="ds-servers-fleet-mark ds-servers-fleet-mark-fallback" style={panelNameGradientStyle()}>
              {panelNameInitial(branding.panelName)}
            </div>
          )}
          <div className="ds-servers-fleet-copy">
            <p className="ds-servers-fleet-greeting">
              {greetingForHour()}, {name}
            </p>
            <h1 className="ds-servers-fleet-title">System activity</h1>
            <div className="ds-servers-fleet-brand">
              <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
              <span className="ds-servers-fleet-tagline">Audit log</span>
            </div>
            <p className="ds-servers-fleet-summary">{summary}</p>
          </div>
        </div>

        <div className="ds-servers-fleet-actions">
          {canClear ? (
            <Button type="button" variant="secondary" onClick={onClear} disabled={clearing}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear scope
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh activity"
          >
            <RefreshCw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="ds-servers-fleet-stats" role="list" aria-label="Activity scopes and totals">
        {ACTIVITY_SCOPES.map((scope) => (
          <ScopeStat
            key={scope.id}
            icon={scope.icon}
            label={scope.shortLabel}
            value={activeScope === scope.id ? loaded : '—'}
            hint={scope.description}
            active={activeScope === scope.id}
            onClick={() => onScopeChange(scope.id)}
          />
        ))}
        <StaticStat icon={ScrollText} label="Total" value={total} />
        <StaticStat icon={LayoutDashboard} label="Showing" value={filtered} />
      </div>
    </header>
  );
}

function ScopeStat({
  icon: Icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="listitem"
      className={`ds-servers-stat${active ? ' is-active ds-servers-stat--info' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={hint}
    >
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value}</span>
    </button>
  );
}

function StaticStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="ds-servers-stat" role="listitem">
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value}</span>
    </div>
  );
}
