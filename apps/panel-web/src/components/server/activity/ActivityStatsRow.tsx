import { Activity, Clock, Filter } from 'lucide-react';

export function ActivityStatsRow({
  total,
  loaded,
  filtered,
  hasActiveFilters,
}: {
  total: number;
  loaded: number;
  filtered: number;
  hasActiveFilters: boolean;
}) {
  if (total <= 0) return null;

  return (
    <div className="ds-srv-act-stats" role="list" aria-label="Activity summary">
      <div className="ds-srv-act-stat" role="listitem">
        <span className="ds-srv-act-stat-icon ds-srv-act-stat-icon--total" aria-hidden>
          <Activity className="h-3.5 w-3.5" />
        </span>
        <span className="ds-srv-act-stat-copy">
          <span className="ds-srv-act-stat-label">Total</span>
          <span className="ds-srv-act-stat-value">{total}</span>
        </span>
      </div>
      <div className="ds-srv-act-stat" role="listitem">
        <span className="ds-srv-act-stat-icon ds-srv-act-stat-icon--loaded" aria-hidden>
          <Clock className="h-3.5 w-3.5" />
        </span>
        <span className="ds-srv-act-stat-copy">
          <span className="ds-srv-act-stat-label">Loaded</span>
          <span className="ds-srv-act-stat-value">{loaded}</span>
          <span className="ds-srv-act-stat-sub">
            {loaded < total ? 'Load more for older events' : 'All events loaded'}
          </span>
        </span>
      </div>
      <div className="ds-srv-act-stat" role="listitem">
        <span className={`ds-srv-act-stat-icon ds-srv-act-stat-icon--filtered${hasActiveFilters ? ' ds-srv-act-stat-icon--active' : ''}`} aria-hidden>
          <Filter className="h-3.5 w-3.5" />
        </span>
        <span className="ds-srv-act-stat-copy">
          <span className="ds-srv-act-stat-label">Showing</span>
          <span className="ds-srv-act-stat-value">{filtered}</span>
          <span className="ds-srv-act-stat-sub">{hasActiveFilters ? 'After filters applied' : 'No filters active'}</span>
        </span>
      </div>
    </div>
  );
}
