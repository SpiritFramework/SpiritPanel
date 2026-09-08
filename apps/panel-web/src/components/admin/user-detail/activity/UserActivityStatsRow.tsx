import { Activity, Clock, Filter, Server } from 'lucide-react';

export function UserActivityStatsRow({
  total,
  loaded,
  filtered,
  hasActiveFilters,
  serverCount,
}: {
  total: number;
  loaded: number;
  filtered: number;
  hasActiveFilters: boolean;
  serverCount: number;
}) {
  return (
    <div className="ds-ud-act-stats" aria-label="Activity summary">
      <div className="ds-ud-act-stat">
        <span className="ds-ud-act-stat-icon ds-ud-act-stat-icon--total" aria-hidden>
          <Activity className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-act-stat-value">{total}</p>
          <p className="ds-ud-act-stat-label">Total events</p>
        </div>
      </div>

      <div className="ds-ud-act-stat">
        <span className="ds-ud-act-stat-icon ds-ud-act-stat-icon--loaded" aria-hidden>
          <Clock className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-act-stat-value">{loaded}</p>
          <p className="ds-ud-act-stat-label">
            {loaded < total ? 'Loaded (load more below)' : 'All loaded'}
          </p>
        </div>
      </div>

      <div className="ds-ud-act-stat">
        <span
          className={`ds-ud-act-stat-icon ds-ud-act-stat-icon--filtered${hasActiveFilters ? ' ds-ud-act-stat-icon--active' : ''}`}
          aria-hidden
        >
          <Filter className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-act-stat-value">{filtered}</p>
          <p className="ds-ud-act-stat-label">{hasActiveFilters ? 'After filters' : 'Showing all'}</p>
        </div>
      </div>

      <div className="ds-ud-act-stat">
        <span className="ds-ud-act-stat-icon ds-ud-act-stat-icon--servers" aria-hidden>
          <Server className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ud-act-stat-value">{serverCount}</p>
          <p className="ds-ud-act-stat-label">Servers touched</p>
        </div>
      </div>
    </div>
  );
}
