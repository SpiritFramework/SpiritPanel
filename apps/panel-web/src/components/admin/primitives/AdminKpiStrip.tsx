import type { LucideIcon } from 'lucide-react';

export type AdminKpiItem = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'success' | 'warning' | 'danger';
  hint?: string;
};

export function AdminKpiStrip({
  items,
  label = 'Summary',
  columns,
}: {
  items: AdminKpiItem[];
  label?: string;
  columns?: 4 | 5;
}) {
  return (
    <div
      className={`ds-adm-kpi-strip ds-nd-list-live${columns === 4 ? ' ds-adm-kpi-strip--4' : ''}`}
      role="list"
      aria-label={label}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`ds-adm-kpi ds-nd-list-live-stat${item.tone ? ` ds-adm-kpi--${item.tone} ds-nd-list-live-stat--${item.tone}` : ''}`}
          role="listitem"
        >
          <span className="ds-adm-kpi-icon ds-nd-list-live-icon" aria-hidden>
            <item.icon className="h-3.5 w-3.5" />
          </span>
          <span className="ds-adm-kpi-copy ds-nd-list-live-copy">
            <span className="ds-adm-kpi-label ds-nd-list-live-label">{item.label}</span>
            <span className="ds-adm-kpi-value ds-nd-list-live-value">{item.value}</span>
            {item.hint ? <span className="ds-adm-kpi-hint">{item.hint}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
