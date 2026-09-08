import { HardDrive, Network, Server, Users } from 'lucide-react';
import type { UserServerFleetStats } from './user-server-utils';

export function UserServersStatsRow({ stats }: { stats: UserServerFleetStats }) {
  const runningPercent =
    stats.owned > 0 ? Math.round((stats.running / stats.owned) * 100) : 0;

  return (
    <div className="ds-ud-srv-stats" aria-label="Server footprint">
      <div className="ds-ud-srv-stat">
        <span className="ds-ud-srv-stat-icon ds-ud-srv-stat-icon--owned" aria-hidden>
          <Server className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-srv-stat-value">{stats.owned}</p>
          <p className="ds-ud-srv-stat-label">Owned</p>
        </div>
      </div>

      <div className="ds-ud-srv-stat">
        <span className="ds-ud-srv-stat-icon ds-ud-srv-stat-icon--shared" aria-hidden>
          <Users className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-srv-stat-value">{stats.shared}</p>
          <p className="ds-ud-srv-stat-label">Shared access</p>
        </div>
      </div>

      <div className="ds-ud-srv-stat">
        <span className="ds-ud-srv-stat-icon ds-ud-srv-stat-icon--running" aria-hidden>
          <HardDrive className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ds-ud-srv-stat-value">
            {stats.running}
            {stats.owned > 0 ? (
              <span className="ds-ud-srv-stat-suffix"> · {runningPercent}%</span>
            ) : null}
          </p>
          <p className="ds-ud-srv-stat-label">Running</p>
        </div>
      </div>

      <div className="ds-ud-srv-stat">
        <span className="ds-ud-srv-stat-icon ds-ud-srv-stat-icon--nodes" aria-hidden>
          <Network className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-srv-stat-value">{stats.nodes}</p>
          <p className="ds-ud-srv-stat-label">Nodes</p>
        </div>
      </div>
    </div>
  );
}
