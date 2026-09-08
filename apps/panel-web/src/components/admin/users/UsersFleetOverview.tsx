import { Link } from 'react-router-dom';
import { Key, Server, Users } from 'lucide-react';
import type { UserFleetStats, UserRoleRow } from './user-fleet-utils';

export function UsersFleetOverview({
  stats,
  roleRows,
  activePercent,
}: {
  stats: UserFleetStats;
  roleRows: UserRoleRow[];
  activePercent: number;
}) {
  const maxRole = Math.max(1, ...roleRows.map((row) => row.count));

  if (stats.total === 0) return null;

  return (
    <section className="ds-usr-overview" aria-label="Account distribution">
      <div className="ds-usr-overview-main">
        <div className="ds-usr-overview-head">
          <div>
            <p className="ds-usr-overview-label">Account health</p>
            <p className="ds-usr-overview-sub">
              {stats.active} of {stats.total} accounts active
              {activePercent < 100 ? ` · ${activePercent}% in good standing` : ''}
            </p>
          </div>
          <Link to="/admin/servers" className="ds-usr-overview-link">
            <Server className="h-3.5 w-3.5" aria-hidden />
            Servers
          </Link>
        </div>

        <div className="ds-usr-overview-meter">
          <div className="ds-usr-overview-meter-head">
            <span>Active accounts</span>
            <span className="ds-usr-overview-meter-value">
              {stats.active}/{stats.total}
            </span>
          </div>
          <div className="ds-usr-overview-meter-track" aria-hidden>
            <span className="ds-usr-overview-meter-fill" style={{ width: `${activePercent}%` }} />
          </div>
        </div>

        {roleRows.length > 0 ? (
          <ul className="ds-usr-bars" aria-label="Accounts by role">
            {roleRows.map((row) => {
              const pct = Math.round((row.count / maxRole) * 100);
              return (
                <li key={row.id} className="ds-usr-bar-row">
                  <span className="ds-usr-bar-label">{row.label}</span>
                  <div className="ds-usr-bar-track" aria-hidden>
                    <span className={`ds-usr-bar-fill ds-usr-bar-fill--${row.id}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ds-usr-bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="ds-usr-overview-side">
        <p className="ds-usr-overview-label">Platform usage</p>
        <ul className="ds-usr-usage-list">
          <li>
            <span className="ds-usr-usage-icon" aria-hidden>
              <Server className="h-3.5 w-3.5" />
            </span>
            <span className="ds-usr-usage-copy">
              <span className="ds-usr-usage-label">Owned servers</span>
              <span className="ds-usr-usage-value">{stats.totalServers.toLocaleString()}</span>
            </span>
          </li>
          <li>
            <span className="ds-usr-usage-icon" aria-hidden>
              <Users className="h-3.5 w-3.5" />
            </span>
            <span className="ds-usr-usage-copy">
              <span className="ds-usr-usage-label">Shared access</span>
              <span className="ds-usr-usage-value">{stats.totalSubuserAccess.toLocaleString()}</span>
            </span>
          </li>
          <li>
            <span className="ds-usr-usage-icon" aria-hidden>
              <Key className="h-3.5 w-3.5" />
            </span>
            <span className="ds-usr-usage-copy">
              <span className="ds-usr-usage-label">API keys</span>
              <span className="ds-usr-usage-value">{stats.totalApiKeys.toLocaleString()}</span>
            </span>
          </li>
        </ul>
        {stats.rootAdmins > 0 ? (
          <p className="ds-usr-overview-foot">
            {stats.rootAdmins} root admin{stats.rootAdmins === 1 ? '' : 's'} with full panel access
          </p>
        ) : null}
      </div>
    </section>
  );
}
