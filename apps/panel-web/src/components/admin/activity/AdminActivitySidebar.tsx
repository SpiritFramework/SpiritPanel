import { Link } from 'react-router-dom';
import { Settings, ShieldAlert, SlidersHorizontal, Users } from 'lucide-react';
import type { PanelCategoryRow } from './panel-activity-utils';

export function AdminActivitySidebar({
  categoryRows,
}: {
  categoryRows: PanelCategoryRow[];
}) {
  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.count));

  return (
    <aside className="ds-admin-act__rail">
      {categoryRows.length > 0 ? (
        <section className="ds-admin-act__rail-card">
          <header className="ds-admin-act__rail-head">
            <span className="ds-admin-act__rail-icon" aria-hidden>
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="ds-admin-act__rail-title">By category</h2>
              <p className="ds-admin-act__rail-desc">From loaded events</p>
            </div>
          </header>
          <ul className="ds-admin-act__bars" aria-label="Events by category">
            {categoryRows.map((row) => {
              const pct = Math.round((row.count / maxCategory) * 100);
              return (
                <li key={row.id} className="ds-admin-act__bar-row">
                  <span className="ds-admin-act__bar-label">{row.label}</span>
                  <div className="ds-admin-act__bar-track" aria-hidden>
                    <span
                      className={`ds-admin-act__bar-fill ds-admin-act__bar-fill--${row.id}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="ds-admin-act__bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="ds-admin-act__rail-card">
        <header className="ds-admin-act__rail-head">
          <span className="ds-admin-act__rail-icon" aria-hidden>
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="ds-admin-act__rail-title">Related</h2>
            <p className="ds-admin-act__rail-desc">Other admin pages</p>
          </div>
        </header>
        <div className="ds-admin-act__related">
          <Link to="/admin/users" className="ds-admin-act__related-link">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Users
          </Link>
          <Link to="/admin/settings" className="ds-admin-act__related-link">
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Panel settings
          </Link>
        </div>
        <p className="ds-admin-act__rail-note">Events older than 30 days are pruned automatically.</p>
      </section>
    </aside>
  );
}
