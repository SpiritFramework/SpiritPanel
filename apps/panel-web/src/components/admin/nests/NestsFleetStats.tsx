import type { LucideIcon } from 'lucide-react';
import { Egg, Layers, Server, ShieldOff } from 'lucide-react';
import type { NestFleetStats } from './nest-fleet-utils';

function NestStatItem({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  onClick?: () => void;
}) {
  const className = `ds-adm-nest-stat${onClick ? ' ds-adm-nest-stat--clickable' : ''}`;
  const content = (
    <>
      <span className="ds-adm-nest-stat-icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <span className="ds-adm-nest-stat-copy">
        <span className="ds-adm-nest-stat-label">{label}</span>
        <span className="ds-adm-nest-stat-value">{value}</span>
        <span className="ds-adm-nest-stat-hint">{hint}</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        role="listitem"
        aria-label={`${label}: ${value}. ${hint}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} role="listitem" aria-label={`${label}: ${value}`}>
      {content}
    </div>
  );
}

export function NestsFleetStats({
  stats,
  onShowEmpty,
  onShowDisabled,
  onShowNests,
  onShowEggs,
}: {
  stats: NestFleetStats;
  onShowEmpty: () => void;
  onShowDisabled: () => void;
  onShowNests?: () => void;
  onShowEggs?: () => void;
}) {
  return (
    <div className="ds-adm-nest-stats" role="list" aria-label="Fleet stats">
      <NestStatItem
        icon={Layers}
        label="Nests"
        value={stats.nests}
        hint={`${stats.withEggs} with eggs`}
        onClick={onShowNests}
      />
      <NestStatItem
        icon={Egg}
        label="Eggs"
        value={stats.eggs}
        hint={`${stats.enabled} enabled`}
        onClick={onShowEggs}
      />
      <NestStatItem
        icon={Server}
        label="Deployments"
        value={stats.deployed}
        hint="Servers using eggs"
      />
      <NestStatItem
        icon={ShieldOff}
        label="Disabled"
        value={stats.disabled}
        hint={stats.disabled > 0 ? 'Click to filter' : 'None'}
        onClick={stats.disabled > 0 ? onShowDisabled : undefined}
      />
      {stats.empty > 0 ? (
        <button type="button" className="ds-adm-nest-stat-banner" onClick={onShowEmpty}>
          {stats.empty} empty nest{stats.empty === 1 ? '' : 's'} — import eggs or create templates
        </button>
      ) : null}
    </div>
  );
}
