import { Link } from 'react-router-dom';
import { ArrowUpRight, Gauge, Server } from 'lucide-react';
import { AdminSection, AdminToolButton } from '../../primitives';
import type { UserServerFleetStats, UserServerStatusRow } from './user-server-utils';

export function UserServersFleetOverview({
  stats,
  statusRows,
  runningPercent,
}: {
  stats: UserServerFleetStats;
  statusRows: UserServerStatusRow[];
  runningPercent: number;
}) {
  if (stats.owned === 0) return null;

  const maxStatus = Math.max(1, ...statusRows.map((row) => row.count));
  const attention = stats.suspended + stats.installing + stats.offline;

  return (
    <AdminSection
      tone="capacity"
      icon={Gauge}
      eyebrow="Health"
      title="Owned fleet"
      description={`${stats.running} of ${stats.owned} owned servers running${
        stats.suspended > 0 ? ` · ${stats.suspended} suspended` : ''
      }`}
      actions={
        <AdminToolButton to="/admin/servers">
          <Server className="h-3.5 w-3.5" aria-hidden />
          All servers
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </AdminToolButton>
      }
    >
      <div className="ds-ud-srv-overview">
        <div className="ds-ud-srv-overview-main">
          <div className="ds-ud-srv-overview-meter">
            <div className="ds-ud-srv-overview-meter-head">
              <span>Running instances</span>
              <span className="ds-ud-srv-overview-meter-value">
                {stats.running}/{stats.owned}
              </span>
            </div>
            <div className="ds-ud-srv-overview-meter-track" aria-hidden>
              <span
                className="ds-ud-srv-overview-meter-fill"
                style={{ width: `${runningPercent}%` }}
              />
            </div>
          </div>

          {statusRows.length > 0 ? (
            <ul className="ds-ud-srv-bars" aria-label="Servers by status">
              {statusRows.map((row) => {
                const pct = Math.round((row.count / maxStatus) * 100);
                return (
                  <li key={row.id} className="ds-ud-srv-bar-row">
                    <span className="ds-ud-srv-bar-label">{row.label}</span>
                    <div className="ds-ud-srv-bar-track" aria-hidden>
                      <span
                        className={`ds-ud-srv-bar-fill ds-ud-srv-bar-fill--${row.id}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="ds-ud-srv-bar-value">{row.count}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="ds-ud-srv-overview-side">
          <p className="ds-ud-srv-overview-label">Access summary</p>
          <ul className="ds-ud-srv-usage-list">
            <li>
              <span className="ds-ud-srv-usage-icon" aria-hidden>
                <Server className="h-3.5 w-3.5" />
              </span>
              <span className="ds-ud-srv-usage-copy">
                <span className="ds-ud-srv-usage-label">Total footprint</span>
                <span className="ds-ud-srv-usage-value">{stats.total}</span>
              </span>
            </li>
            <li>
              <span className="ds-ud-srv-usage-icon ds-ud-srv-usage-icon--warn" aria-hidden>
                <Server className="h-3.5 w-3.5" />
              </span>
              <span className="ds-ud-srv-usage-copy">
                <span className="ds-ud-srv-usage-label">Needs attention</span>
                <span className="ds-ud-srv-usage-value">{attention}</span>
              </span>
            </li>
            <li>
              <span className="ds-ud-srv-usage-icon ds-ud-srv-usage-icon--shared" aria-hidden>
                <Server className="h-3.5 w-3.5" />
              </span>
              <span className="ds-ud-srv-usage-copy">
                <span className="ds-ud-srv-usage-label">Shared with user</span>
                <span className="ds-ud-srv-usage-value">{stats.shared}</span>
              </span>
            </li>
          </ul>
          {stats.nodes > 0 ? (
            <p className="ds-ud-srv-overview-foot">
              Spread across {stats.nodes} node{stats.nodes === 1 ? '' : 's'}
            </p>
          ) : null}
          <p className="ds-ud-srv-overview-foot">
            <Link to="/admin/servers" className="ds-ud-srv-overview-link">
              Browse fleet
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </Link>
          </p>
        </div>
      </div>
    </AdminSection>
  );
}
