import type { ComponentType } from 'react';
import { Shield } from 'lucide-react';
import { NodeOverviewSection } from '../admin/node-detail/NodeDetailShell';

export type SecurityOverviewItem = {
  id: string;
  label: string;
  value: string;
  ok: boolean;
  icon: ComponentType<{ className?: string }>;
};

export function ProfileSecuritySidebar({
  items,
  loading,
}: {
  items: SecurityOverviewItem[];
  loading: boolean;
}) {
  const enabledCount = items.filter((item) => item.ok).length;
  const score = items.length ? Math.round((enabledCount / items.length) * 100) : 0;
  const tone = score >= 75 ? 'good' : score >= 50 ? 'fair' : 'low';

  return (
    <aside className="ds-prof-rail">
      <NodeOverviewSection icon={Shield} title="Security score" description="Based on your active protections">
        <div className={`ds-sec-score ds-sec-score--${tone}`}>
          <div className="ds-sec-score-ring" aria-hidden>
            <span className="ds-sec-score-value">{loading ? '…' : `${score}%`}</span>
          </div>
          <p className="ds-sec-score-copy">
            {loading
              ? 'Checking your account…'
              : score >= 75
                ? 'Strong protection — keep recovery codes safe.'
                : score >= 50
                  ? 'Good start — enable remaining options below.'
                  : 'Add more protections to secure your account.'}
          </p>
        </div>
      </NodeOverviewSection>

      <NodeOverviewSection icon={Shield} title="Protection status" description="Live overview">
        <ul className="ds-sec-sidebar-list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className={`ds-sec-sidebar-row${item.ok ? ' ds-sec-sidebar-row--ok' : ''}${loading ? ' ds-sec-sidebar-row--loading' : ''}`}
              >
                <span className="ds-sec-sidebar-icon" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-sec-sidebar-copy">
                  <span className="ds-sec-sidebar-label">{item.label}</span>
                  <span className="ds-sec-sidebar-value">{loading ? '…' : item.value}</span>
                </span>
                <span className={`ds-sec-sidebar-dot${item.ok ? ' ds-sec-sidebar-dot--ok' : ''}`} aria-hidden />
              </li>
            );
          })}
        </ul>
      </NodeOverviewSection>
    </aside>
  );
}
