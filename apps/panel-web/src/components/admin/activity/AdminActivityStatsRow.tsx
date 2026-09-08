import { Activity, Clock, Filter, LayoutDashboard } from 'lucide-react';

export function AdminActivityStatsRow({
  total,
  loaded,
  filtered,
  hasActiveFilters,
  scopeLabel,
}: {
  total: number;
  loaded: number;
  filtered: number;
  hasActiveFilters: boolean;
  scopeLabel: string;
}) {
  return (
    <div className="ds-ad-act-stats" aria-label="Activity summary">
      <div className="ds-ad-act-stat">
        <span className="ds-ad-act-stat-icon ds-ad-act-stat-icon--total" aria-hidden>
          <Activity className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ad-act-stat-value">{total}</p>
          <p className="ds-ad-act-stat-label">Total events</p>
        </div>
      </div>

      <div className="ds-ad-act-stat">
        <span className="ds-ad-act-stat-icon ds-ad-act-stat-icon--loaded" aria-hidden>
          <Clock className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ad-act-stat-value">{loaded}</p>
          <p className="ds-ad-act-stat-label">
            {loaded < total ? 'Loaded (load more below)' : 'All loaded'}
          </p>
        </div>
      </div>

      <div className="ds-ad-act-stat">
        <span
          className={`ds-ad-act-stat-icon ds-ad-act-stat-icon--filtered${hasActiveFilters ? ' ds-ad-act-stat-icon--active' : ''}`}
          aria-hidden
        >
          <Filter className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ad-act-stat-value">{filtered}</p>
          <p className="ds-ad-act-stat-label">{hasActiveFilters ? 'After filters' : 'Showing all'}</p>
        </div>
      </div>

      <div className="ds-ad-act-stat">
        <span className="ds-ad-act-stat-icon ds-ad-act-stat-icon--scope" aria-hidden>
          <LayoutDashboard className="h-4 w-4" />
        </span>
        <div>
          <p className="ds-ad-act-stat-value">{scopeLabel}</p>
          <p className="ds-ad-act-stat-label">Active scope</p>
        </div>
      </div>
    </div>
  );
}
