import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, HardDrive, Server, Users } from 'lucide-react';
import type { ServerFleetStats } from './server-fleet-utils';
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
        aria-label={`${label}: ${value}. Filter list.`}
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

export function ServersFleetStats({
  stats,
  onShowSuspended,
  onShowInstalling,
}: {
  stats: ServerFleetStats;
  onShowSuspended?: () => void;
  onShowInstalling?: () => void;
}) {
  return (
    <div className="ds-nodes-stats" role="list" aria-label="Server summary">
      <FleetStatItem label="Servers" value={stats.total} icon={Server} tone="neutral" />
      <FleetStatItem label="Running" value={stats.running} icon={HardDrive} tone="success" />
      <FleetStatItem
        label="Suspended"
        value={stats.suspended}
        icon={AlertTriangle}
        tone={stats.suspended > 0 ? 'warning' : 'neutral'}
        onClick={stats.suspended > 0 ? onShowSuspended : undefined}
      />
      <FleetStatItem
        label="Installing"
        value={stats.installing}
        icon={Server}
        tone={stats.installing > 0 ? 'info' : 'neutral'}
        onClick={stats.installing > 0 ? onShowInstalling : undefined}
      />
      <FleetStatItem label="Owners" value={stats.owners} icon={Users} tone="neutral" />
    </div>
  );
}
