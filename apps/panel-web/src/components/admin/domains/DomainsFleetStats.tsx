import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Globe, HardDrive, Link2, Users } from 'lucide-react';
import type { DomainFleetStats } from './domain-fleet-utils';
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
        className="ds-nodes-stat ds-nodes-stat--button"
        onClick={onClick}
        aria-label={`${label}: ${value}. Filter subdomains.`}
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

export function DomainsFleetStats({
  stats,
  onShowErrors,
  onShowPreferSubdomain,
}: {
  stats: DomainFleetStats;
  onShowErrors?: () => void;
  onShowPreferSubdomain?: () => void;
}) {
  return (
    <div className="ds-nodes-stats" role="list" aria-label="Subdomain summary">
      <FleetStatItem label="Subdomains" value={stats.total} icon={Globe} tone="neutral" />
      <FleetStatItem
        label="Prefer subdomain"
        value={stats.preferSubdomain}
        icon={Link2}
        tone="success"
        onClick={stats.preferSubdomain > 0 ? onShowPreferSubdomain : undefined}
      />
      <FleetStatItem label="Nodes" value={stats.nodes} icon={HardDrive} tone="info" />
      <FleetStatItem label="Owners" value={stats.owners} icon={Users} tone="neutral" />
      <FleetStatItem
        label="Errors"
        value={stats.errors}
        icon={AlertTriangle}
        tone={stats.errors > 0 ? 'danger' : 'neutral'}
        onClick={stats.errors > 0 ? onShowErrors : undefined}
      />
    </div>
  );
}
