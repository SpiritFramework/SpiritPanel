import { Database, Globe, Layers, Server } from 'lucide-react';

export function DatabasesStatsRow({
  used,
  limit,
  slotsLeft,
  usagePercent,
  hostPools,
  atLimit,
}: {
  used: number;
  limit: number;
  slotsLeft: number;
  usagePercent: number;
  hostPools: string[];
  atLimit: boolean;
}) {
  return (
    <div className="ds-srv-db-stats">
      <div className="ds-srv-db-stat">
        <span className="ds-srv-db-stat-icon ds-srv-db-stat-icon--slots" aria-hidden>
          <Layers className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-db-stat-value">{limit === 0 ? '—' : `${used} / ${limit}`}</p>
          <p className="ds-srv-db-stat-label">
            {limit === 0 ? 'Databases disabled' : `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left`}
          </p>
        </div>
      </div>
      <div className="ds-srv-db-stat">
        <span className="ds-srv-db-stat-icon ds-srv-db-stat-icon--engine" aria-hidden>
          <Server className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-db-stat-value">MySQL</p>
          <p className="ds-srv-db-stat-label">MariaDB-compatible</p>
        </div>
      </div>
      <div className="ds-srv-db-stat">
        <span className="ds-srv-db-stat-icon ds-srv-db-stat-icon--hosts" aria-hidden>
          <Globe className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-db-stat-value">
            {hostPools.length === 0 ? '—' : hostPools.length === 1 ? hostPools[0] : `${hostPools.length} pools`}
          </p>
          <p className="ds-srv-db-stat-label">Host pool{hostPools.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="ds-srv-db-stat ds-srv-db-stat--capacity">
        <span className="ds-srv-db-stat-icon ds-srv-db-stat-icon--capacity" aria-hidden>
          <Database className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-db-capacity-bar-wrap">
            <div className="ds-srv-db-capacity-bar">
              <div
                className={`ds-srv-db-capacity-fill${atLimit ? ' ds-srv-db-capacity-fill--full' : ''}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="ds-srv-db-capacity-label">{usagePercent}%</span>
          </div>
          <p className="ds-srv-db-stat-label">Capacity used</p>
        </div>
      </div>
    </div>
  );
}
