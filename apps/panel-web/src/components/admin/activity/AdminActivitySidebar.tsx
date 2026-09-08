import { Link } from 'react-router-dom';
import { CalendarClock, LayoutDashboard, Settings, ShieldAlert, SlidersHorizontal, Users } from 'lucide-react';
import { NodeOverviewSection } from '../node-detail/NodeDetailShell';
import { ACTIVITY_SCOPES, type ActivityScope } from './AdminActivityHeader';
import type { PanelCategoryRow } from './panel-activity-utils';

export function AdminActivitySidebar({
  scope,
  total,
  loaded,
  categoryRows,
}: {
  scope: ActivityScope;
  total: number;
  loaded: number;
  categoryRows: PanelCategoryRow[];
}) {
  const scopeMeta = ACTIVITY_SCOPES.find((s) => s.id === scope) ?? ACTIVITY_SCOPES[0];
  const samplePercent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.count));

  return (
    <aside className="ds-ad-act-rail">
      <NodeOverviewSection
        icon={LayoutDashboard}
        title="Active scope"
        description="What this view includes"
      >
        <div className="ds-ad-act-rail-scope">
          <scopeMeta.icon className="h-4 w-4 shrink-0 text-[var(--accent-hover)]" aria-hidden />
          <div className="min-w-0">
            <p className="ds-ad-act-rail-scope-title">{scopeMeta.label}</p>
            <p className="ds-ad-act-rail-scope-desc">{scopeMeta.description}</p>
          </div>
        </div>
      </NodeOverviewSection>

      <NodeOverviewSection icon={CalendarClock} title="Retention" description="Automatic log pruning">
        <ul className="ds-ad-act-rail-list">
          <li className="ds-ad-act-rail-row">
            <span className="ds-ad-act-rail-row-label">Retention window</span>
            <span className="ds-ad-act-rail-row-value">30 days</span>
          </li>
          <li className="ds-ad-act-rail-row">
            <span className="ds-ad-act-rail-row-label">Events in scope</span>
            <span className="ds-ad-act-rail-row-value">{total}</span>
          </li>
          <li className="ds-ad-act-rail-row">
            <span className="ds-ad-act-rail-row-label">Loaded into view</span>
            <span className="ds-ad-act-rail-row-value">
              {loaded}/{total}
            </span>
          </li>
        </ul>

        {total > 0 ? (
          <div className="ds-ad-act-rail-meter">
            <div className="ds-ad-act-rail-meter-head">
              <span>Loaded events</span>
              <span>{samplePercent}%</span>
            </div>
            <div className="ds-ad-act-rail-meter-track" aria-hidden>
              <span className="ds-ad-act-rail-meter-fill" style={{ width: `${samplePercent}%` }} />
            </div>
          </div>
        ) : null}
      </NodeOverviewSection>

      {categoryRows.length > 0 ? (
        <NodeOverviewSection icon={ShieldAlert} title="By category" description="Loaded event breakdown">
          <ul className="ds-ad-act-bars" aria-label="Events by category">
            {categoryRows.map((row) => {
              const pct = Math.round((row.count / maxCategory) * 100);
              return (
                <li key={row.id} className="ds-ad-act-bar-row">
                  <span className="ds-ad-act-bar-label">{row.label}</span>
                  <div className="ds-ad-act-bar-track" aria-hidden>
                    <span
                      className={`ds-ad-act-bar-fill ds-ad-act-bar-fill--${row.id}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="ds-ad-act-bar-value">{row.count}</span>
                </li>
              );
            })}
          </ul>
        </NodeOverviewSection>
      ) : null}

      <NodeOverviewSection icon={SlidersHorizontal} title="Related" description="Other admin pages">
        <div className="ds-ad-act-related">
          <Link to="/admin/users" className="ds-ad-act-related-link">
            <Users className="h-3.5 w-3.5" />
            Users
          </Link>
          <Link to="/admin/settings" className="ds-ad-act-related-link">
            <Settings className="h-3.5 w-3.5" />
            Panel settings
          </Link>
        </div>
      </NodeOverviewSection>
    </aside>
  );
}
