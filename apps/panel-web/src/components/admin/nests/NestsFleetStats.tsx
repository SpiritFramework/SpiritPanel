import { Egg, Layers, Server, ShieldOff } from 'lucide-react';
import type { NestFleetStats } from './nest-fleet-utils';

export function NestsFleetStats({
  stats,
  onShowEmpty,
  onShowDisabled,
}: {
  stats: NestFleetStats;
  onShowEmpty: () => void;
  onShowDisabled: () => void;
}) {
  const items = [
    {
      icon: Layers,
      label: 'Nests',
      value: stats.nests,
      hint: `${stats.withEggs} with eggs`,
    },
    {
      icon: Egg,
      label: 'Eggs',
      value: stats.eggs,
      hint: `${stats.enabled} enabled`,
    },
    {
      icon: Server,
      label: 'Deployments',
      value: stats.deployed,
      hint: 'Servers using eggs',
    },
    {
      icon: ShieldOff,
      label: 'Disabled',
      value: stats.disabled,
      hint: stats.disabled > 0 ? 'Click to filter' : 'None',
      action: stats.disabled > 0 ? onShowDisabled : undefined,
    },
  ];

  return (
    <div className="ds-adm-nest-stats" role="list" aria-label="Fleet stats">
      {items.map((item) => {
        const Tag = item.action ? 'button' : 'div';
        return (
          <Tag
            key={item.label}
            type={item.action ? 'button' : undefined}
            className={`ds-adm-nest-stat${item.action ? ' ds-adm-nest-stat--clickable' : ''}`}
            onClick={item.action}
            role="listitem"
          >
            <span className="ds-adm-nest-stat-icon" aria-hidden>
              <item.icon className="h-4 w-4" />
            </span>
            <span className="ds-adm-nest-stat-copy">
              <span className="ds-adm-nest-stat-label">{item.label}</span>
              <span className="ds-adm-nest-stat-value">{item.value}</span>
              <span className="ds-adm-nest-stat-hint">{item.hint}</span>
            </span>
          </Tag>
        );
      })}
      {stats.empty > 0 ? (
        <button type="button" className="ds-adm-nest-stat-banner" onClick={onShowEmpty}>
          {stats.empty} empty nest{stats.empty === 1 ? '' : 's'} — organize or import eggs
        </button>
      ) : null}
    </div>
  );
}
