import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Key, Shield, User, Users } from 'lucide-react';
import type { UserFleetStats } from './user-fleet-utils';
import type { Tone } from '../../ui';
import { toneStyle } from '../../ui';

function FleetStatItem({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
}) {
  const iconStyle = toneStyle(tone);
  const content = (
    <>
      <span className="ds-nodes-stat-icon" style={iconStyle} aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="ds-nodes-stat-copy">
        <span className="ds-nodes-stat-label">{label}</span>
        <span className="ds-nodes-stat-value">{value.toLocaleString()}</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="ds-nodes-stat ds-nodes-stat--alert"
        onClick={onClick}
        aria-label={`${label}: ${value}. Filter to suspended accounts.`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`ds-nodes-stat ds-nodes-stat--${tone}`} aria-label={`${label}: ${value}`}>
      {content}
    </div>
  );
}

export function UsersFleetStats({
  stats,
  onShowSuspended,
}: {
  stats: UserFleetStats;
  onShowSuspended?: () => void;
}) {
  return (
    <div className="ds-nodes-stats" role="list" aria-label="Account summary">
      <FleetStatItem label="Accounts" value={stats.total} icon={Users} tone="neutral" />
      <FleetStatItem label="Active" value={stats.active} icon={User} tone="success" />
      <FleetStatItem
        label="Suspended"
        value={stats.suspended}
        icon={AlertTriangle}
        tone={stats.suspended > 0 ? 'warning' : 'neutral'}
        onClick={stats.suspended > 0 ? onShowSuspended : undefined}
      />
      <FleetStatItem label="Admins" value={stats.admins} icon={Shield} tone="info" />
      <FleetStatItem label="API keys" value={stats.totalApiKeys} icon={Key} tone="neutral" />
    </div>
  );
}
