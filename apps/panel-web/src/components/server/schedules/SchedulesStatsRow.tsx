import { CalendarClock, Pause, Play, Timer } from 'lucide-react';

export function SchedulesStatsRow({
  total,
  activeCount,
  pausedCount,
  activePercent,
}: {
  total: number;
  activeCount: number;
  pausedCount: number;
  activePercent: number;
}) {
  return (
    <div className="ds-srv-sch-stats">
      <div className="ds-srv-sch-stat">
        <span className="ds-srv-sch-stat-icon ds-srv-sch-stat-icon--total" aria-hidden>
          <CalendarClock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sch-stat-value">{total}</p>
          <p className="ds-srv-sch-stat-label">Total schedules</p>
        </div>
      </div>
      <div className="ds-srv-sch-stat">
        <span className="ds-srv-sch-stat-icon ds-srv-sch-stat-icon--active" aria-hidden>
          <Play className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sch-stat-value">{activeCount}</p>
          <p className="ds-srv-sch-stat-label">Active on cron</p>
        </div>
      </div>
      <div className="ds-srv-sch-stat">
        <span className="ds-srv-sch-stat-icon ds-srv-sch-stat-icon--paused" aria-hidden>
          <Pause className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sch-stat-value">{pausedCount}</p>
          <p className="ds-srv-sch-stat-label">Paused</p>
        </div>
      </div>
      <div className="ds-srv-sch-stat ds-srv-sch-stat--capacity">
        <span className="ds-srv-sch-stat-icon ds-srv-sch-stat-icon--capacity" aria-hidden>
          <Timer className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-sch-capacity-bar-wrap">
            <div className="ds-srv-sch-capacity-bar">
              <div className="ds-srv-sch-capacity-fill" style={{ width: `${activePercent}%` }} />
            </div>
            <span className="ds-srv-sch-capacity-label">{activePercent}%</span>
          </div>
          <p className="ds-srv-sch-stat-label">Enabled</p>
        </div>
      </div>
    </div>
  );
}
