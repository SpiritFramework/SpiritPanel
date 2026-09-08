import { Network, Plug, Star, Timer } from 'lucide-react';

export function NetworkStatsRow({
  used,
  limit,
  slotsLeft,
  usagePercent,
  primaryPort,
  additionalCount,
  atLimit,
}: {
  used: number;
  limit: number;
  slotsLeft: number;
  usagePercent: number;
  primaryPort: number | null;
  additionalCount: number;
  atLimit: boolean;
}) {
  return (
    <div className="ds-srv-net-stats">
      <div className="ds-srv-net-stat">
        <span className="ds-srv-net-stat-icon ds-srv-net-stat-icon--ports" aria-hidden>
          <Network className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-net-stat-value">{used}</p>
          <p className="ds-srv-net-stat-label">Ports assigned</p>
        </div>
      </div>
      <div className="ds-srv-net-stat">
        <span className="ds-srv-net-stat-icon ds-srv-net-stat-icon--primary" aria-hidden>
          <Star className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-net-stat-value">{primaryPort !== null ? `:${primaryPort}` : '—'}</p>
          <p className="ds-srv-net-stat-label">Primary port</p>
        </div>
      </div>
      <div className="ds-srv-net-stat">
        <span className="ds-srv-net-stat-icon ds-srv-net-stat-icon--additional" aria-hidden>
          <Plug className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-net-stat-value">{additionalCount}</p>
          <p className="ds-srv-net-stat-label">Additional ports</p>
        </div>
      </div>
      <div className="ds-srv-net-stat ds-srv-net-stat--capacity">
        <span className="ds-srv-net-stat-icon ds-srv-net-stat-icon--capacity" aria-hidden>
          <Timer className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-net-capacity-bar-wrap">
            <div className="ds-srv-net-capacity-bar">
              <div
                className={`ds-srv-net-capacity-fill${atLimit ? ' ds-srv-net-capacity-fill--full' : ''}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="ds-srv-net-capacity-label">
              {limit === 0 ? 'N/A' : `${slotsLeft} left`}
            </span>
          </div>
          <p className="ds-srv-net-stat-label">Port quota</p>
        </div>
      </div>
    </div>
  );
}
