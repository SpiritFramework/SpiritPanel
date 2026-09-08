import type { LucideIcon } from 'lucide-react';
import { Globe, MapPin, Network, Server } from 'lucide-react';
import type { LocationFleetStats } from './location-fleet-utils';
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
        className={`ds-nodes-stat ds-nodes-stat--button`}
        onClick={onClick}
        aria-label={`${label}: ${value}. Filter locations.`}
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

export function LocationsFleetStats({
  stats,
  onShowEmpty,
}: {
  stats: LocationFleetStats;
  onShowEmpty?: () => void;
}) {
  return (
    <div className="ds-nodes-stats" role="list" aria-label="Region summary">
      <FleetStatItem label="Regions" value={stats.total} icon={Globe} tone="neutral" />
      <FleetStatItem label="In use" value={stats.inUse} icon={MapPin} tone="success" />
      <FleetStatItem
        label="Empty"
        value={stats.empty}
        icon={Globe}
        tone={stats.empty > 0 ? 'warning' : 'neutral'}
        onClick={stats.empty > 0 ? onShowEmpty : undefined}
      />
      <FleetStatItem label="Nodes" value={stats.nodes} icon={Network} tone="info" />
      <FleetStatItem label="Servers" value={stats.servers} icon={Server} tone="neutral" />
    </div>
  );
}
