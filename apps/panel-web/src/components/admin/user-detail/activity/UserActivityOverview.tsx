import { History, RefreshCw } from 'lucide-react';
import type { AdminUserDetail } from '../../../../lib/api';
import { UserAvatar } from '../../../UserAvatar';
import { userDisplayName } from '../../../../pages/admin/user-detail/helpers';
import type { UserActivityCategoryRow } from './user-activity-utils';

export function UserActivityToolbar({
  detail,
  totalEvents,
  lastActivityLabel,
  refreshing,
  onRefresh,
}: {
  detail: AdminUserDetail;
  totalEvents: number;
  lastActivityLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const name = userDisplayName(detail);

  return (
    <header className="ds-ud-act-toolbar">
      <div className="ds-ud-act-toolbar-accent" aria-hidden />
      <div className="ds-ud-act-toolbar-body">
        <div className="ds-ud-act-toolbar-main">
          <div className="ds-ud-act-toolbar-identity">
            <UserAvatar user={detail} size="sm" ring />
            <div className="min-w-0">
              <p className="ds-ud-act-toolbar-title truncate">{name}</p>
              <p className="ds-ud-act-toolbar-meta truncate">
                Audit trail · 30-day retention · Last activity {lastActivityLabel}
              </p>
            </div>
          </div>
          <div className="ds-ud-act-toolbar-actions">
            {totalEvents > 0 ? (
              <span className="ds-ud-act-toolbar-count">{totalEvents} events</span>
            ) : null}
            <button
              type="button"
              className="ds-ud-act-refresh-btn"
              title="Refresh activity"
              aria-label="Refresh activity"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
          </div>
        </div>
        <div className="ds-ud-act-toolbar-kicker" aria-hidden>
          <History className="h-3 w-3" />
          <span>Power, files, settings, admin actions &amp; auth events</span>
        </div>
      </div>
    </header>
  );
}

export function UserActivityOverview({
  categoryRows,
  loadedCount,
  totalCount,
}: {
  categoryRows: UserActivityCategoryRow[];
  loadedCount: number;
  totalCount: number;
}) {
  if (totalCount <= 0) return null;

  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.count));
  const samplePercent = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;

  return (
    <section className="ds-ud-act-overview" aria-label="Activity breakdown">
      <div className="ds-ud-act-overview-main">
        <div>
          <p className="ds-ud-act-overview-label">Event coverage</p>
          <p className="ds-ud-act-overview-sub">
            {loadedCount} of {totalCount} events loaded into view
          </p>
        </div>

        <div className="ds-ud-act-overview-meter">
          <div className="ds-ud-act-overview-meter-head">
            <span>Loaded events</span>
            <span className="ds-ud-act-overview-meter-value">
              {loadedCount}/{totalCount}
            </span>
          </div>
          <div className="ds-ud-act-overview-meter-track" aria-hidden>
            <span className="ds-ud-act-overview-meter-fill" style={{ width: `${samplePercent}%` }} />
          </div>
        </div>

        {categoryRows.length > 0 ? (
          <ul className="ds-ud-act-bars" aria-label="Events by category">
            {categoryRows.map((row) => {
              const pct = Math.round((row.count / maxCategory) * 100);
              return (
                <li key={row.id} className="ds-ud-act-bar-row">
                  <span className="ds-ud-act-bar-label">{row.label}</span>
                  <div className="ds-ud-act-bar-track" aria-hidden>
                    <span
                      className={`ds-ud-act-bar-fill ds-ud-act-bar-fill--${row.id}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="ds-ud-act-bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
