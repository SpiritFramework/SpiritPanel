import { Link } from 'react-router-dom';
import { HardDrive, MapPin, Server } from 'lucide-react';
import type { ServerFleetStats, ServerNodeRow, ServerStatusRow } from './server-fleet-utils';

export function ServersFleetOverview({
  stats,
  statusRows,
  nodeRows,
  runningPercent,
}: {
  stats: ServerFleetStats;
  statusRows: ServerStatusRow[];
  nodeRows: ServerNodeRow[];
  runningPercent: number;
}) {
  if (stats.total === 0) return null;

  const maxStatus = Math.max(1, ...statusRows.map((row) => row.count));
  const maxNode = Math.max(1, ...nodeRows.map((row) => row.count));

  return (
    <section className="ds-adm-srv-overview" aria-label="Fleet distribution">
      <div className="ds-adm-srv-overview-main">
        <div className="ds-adm-srv-overview-head">
          <div>
            <p className="ds-adm-srv-overview-label">Fleet health</p>
            <p className="ds-adm-srv-overview-sub">
              {stats.running} of {stats.total} servers running
              {stats.suspended > 0 ? ` · ${stats.suspended} suspended` : ''}
            </p>
          </div>
          <Link to="/admin/nodes" className="ds-adm-srv-overview-link">
            <HardDrive className="h-3.5 w-3.5" aria-hidden />
            Nodes
          </Link>
        </div>

        <div className="ds-adm-srv-overview-meter">
          <div className="ds-adm-srv-overview-meter-head">
            <span>Running instances</span>
            <span className="ds-adm-srv-overview-meter-value">
              {stats.running}/{stats.total}
            </span>
          </div>
          <div className="ds-adm-srv-overview-meter-track" aria-hidden>
            <span
              className="ds-adm-srv-overview-meter-fill"
              style={{ width: `${runningPercent}%` }}
            />
          </div>
        </div>

        {statusRows.length > 0 ? (
          <ul className="ds-adm-srv-bars" aria-label="Servers by status">
            {statusRows.map((row) => {
              const pct = Math.round((row.count / maxStatus) * 100);
              return (
                <li key={row.id} className="ds-adm-srv-bar-row">
                  <span className="ds-adm-srv-bar-label">{row.label}</span>
                  <div className="ds-adm-srv-bar-track" aria-hidden>
                    <span
                      className={`ds-adm-srv-bar-fill ds-adm-srv-bar-fill--${row.id}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="ds-adm-srv-bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="ds-adm-srv-overview-side">
        <p className="ds-adm-srv-overview-label">Fleet footprint</p>
        <ul className="ds-adm-srv-usage-list">
          <li>
            <span className="ds-adm-srv-usage-icon" aria-hidden>
              <Server className="h-3.5 w-3.5" />
            </span>
            <span className="ds-adm-srv-usage-copy">
              <span className="ds-adm-srv-usage-label">Unique owners</span>
              <span className="ds-adm-srv-usage-value">{stats.owners}</span>
            </span>
          </li>
          <li>
            <span className="ds-adm-srv-usage-icon" aria-hidden>
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <span className="ds-adm-srv-usage-copy">
              <span className="ds-adm-srv-usage-label">Active nodes</span>
              <span className="ds-adm-srv-usage-value">{stats.nodes}</span>
            </span>
          </li>
          <li>
            <span className="ds-adm-srv-usage-icon ds-adm-srv-usage-icon--warn" aria-hidden>
              <Server className="h-3.5 w-3.5" />
            </span>
            <span className="ds-adm-srv-usage-copy">
              <span className="ds-adm-srv-usage-label">Needs attention</span>
              <span className="ds-adm-srv-usage-value">
                {stats.suspended + stats.installing + stats.offline}
              </span>
            </span>
          </li>
        </ul>

        {nodeRows.length > 0 ? (
          <ul className="ds-adm-srv-node-bars" aria-label="Top nodes by server count">
            {nodeRows.map((row) => {
              const pct = Math.round((row.count / maxNode) * 100);
              return (
                <li key={row.id} className="ds-adm-srv-bar-row">
                  <span className="ds-adm-srv-bar-label truncate" title={row.label}>
                    {row.label}
                  </span>
                  <div className="ds-adm-srv-bar-track" aria-hidden>
                    <span className="ds-adm-srv-bar-fill ds-adm-srv-bar-fill--node" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ds-adm-srv-bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
