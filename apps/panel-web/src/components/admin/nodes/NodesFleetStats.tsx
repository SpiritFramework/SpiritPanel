import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, HardDrive, Network, Server, SignalHigh } from 'lucide-react';
import type { FleetStats } from './node-fleet-utils';
import type { Tone } from '../../ui';
import { toneStyle } from '../../ui';

type StatTone = Tone;

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
  tone?: StatTone;
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
        className={`ds-nodes-stat ds-nodes-stat--${tone === 'warning' || tone === 'danger' ? 'alert' : 'button'}`}
        onClick={onClick}
        aria-label={`${label}: ${value}. Filter to offline nodes.`}
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

export function NodesFleetStats({
  stats,
  onShowOffline,
}: {
  stats: FleetStats;
  onShowOffline?: () => void;
}) {
  return (
    <div className="ds-nodes-stats" role="list" aria-label="Fleet summary">
      <FleetStatItem label="Nodes" value={stats.total} icon={HardDrive} tone="neutral" />
      <FleetStatItem label="Online" value={stats.online} icon={SignalHigh} tone="success" />
      <FleetStatItem
        label="Offline"
        value={stats.offline}
        icon={AlertTriangle}
        tone={stats.offline > 0 ? 'warning' : 'neutral'}
        onClick={stats.offline > 0 ? onShowOffline : undefined}
      />
      <FleetStatItem label="Servers" value={stats.servers} icon={Server} tone="info" />
      <FleetStatItem label="Ports" value={stats.allocations} icon={Network} tone="neutral" />
    </div>
  );
}
