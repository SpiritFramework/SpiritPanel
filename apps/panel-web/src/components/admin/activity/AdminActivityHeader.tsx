import {
  HardDrive,
  LayoutDashboard,
  RefreshCw,
  ScrollText,
  Server,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { AdminFilterChips, AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';

export const ACTIVITY_SCOPES = [
  {
    id: 'panel',
    label: 'All panel',
    shortLabel: 'All',
    description: 'Auth and admin audit events across the panel',
    icon: LayoutDashboard,
    tone: 'all',
  },
  {
    id: 'auth',
    label: 'Auth & signups',
    shortLabel: 'Auth',
    description: 'Logins, registrations, Discord links, and profile changes',
    icon: Users,
    tone: 'auth',
  },
  {
    id: 'users',
    label: 'User accounts',
    shortLabel: 'Users',
    description: 'Account create, update, suspend, and delete actions',
    icon: Users,
    tone: 'users',
  },
  {
    id: 'servers',
    label: 'Servers',
    shortLabel: 'Servers',
    description: 'Provisioning, suspend, console, and server admin changes',
    icon: Server,
    tone: 'servers',
  },
  {
    id: 'nodes',
    label: 'Infrastructure',
    shortLabel: 'Nodes',
    description: 'Nodes, locations, and allocation changes',
    icon: HardDrive,
    tone: 'nodes',
  },
  {
    id: 'settings',
    label: 'Config & templates',
    shortLabel: 'Config',
    description: 'Panel settings, nests, eggs, and activity clears',
    icon: Settings,
    tone: 'settings',
  },
  {
    id: 'admin',
    label: 'All admin',
    shortLabel: 'Admin',
    description: 'Every admin.* audit event in one view',
    icon: ShieldAlert,
    tone: 'admin',
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
  const name = user?.firstName?.trim() || user?.username || 'Admin';
  const scopeMeta = ACTIVITY_SCOPES.find((s) => s.id === activeScope) ?? ACTIVITY_SCOPES[0];

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow={`${greetingForHour()}, ${name}`}
        title="Activity"
        description={scopeMeta.description}
        pill={`${filtered} shown`}
        pillTone="neutral"
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh activity">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            {canClear ? (
              <AdminToolButton onClick={onClear} disabled={clearing}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {clearing ? 'Clearing…' : 'Clear'}
              </AdminToolButton>
            ) : null}
          </>
        }
      />
      <AdminKpiStrip
        label="Activity summary"
        columns={4}
        items={[
          { icon: ScrollText, label: 'Total', value: total },
          { icon: LayoutDashboard, label: 'Loaded', value: loaded },
          { icon: Users, label: 'Filtered', value: filtered },
          { icon: scopeMeta.icon, label: 'Scope', value: scopeMeta.shortLabel },
        ]}
      />
      <AdminFilterChips
        className="ds-admin-act__scopes"
        label="Activity scope"
        value={activeScope}
        onChange={(id) => onScopeChange(id as ActivityScope)}
        options={ACTIVITY_SCOPES.map((scope) => ({
          id: scope.id,
          label: scope.shortLabel,
          icon: scope.icon,
          tone: scope.tone,
          hint: scope.description,
        }))}
      />
    </div>
  );
}
