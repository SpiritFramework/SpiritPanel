import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

export function AdminCallout({
  tone = 'warning',
  icon: Icon = AlertTriangle,
  title,
  description,
  action,
}: {
  tone?: 'warning' | 'error' | 'info' | 'success';
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <aside
      className={`ds-adm-callout ds-nd-list-alert ds-adm-callout--${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="ds-adm-callout-icon ds-nd-list-alert-icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="ds-adm-callout-copy ds-nd-list-alert-copy">
        <p className="ds-adm-callout-title ds-nd-list-alert-title">{title}</p>
        {description ? (
          <p className="ds-adm-callout-desc ds-nd-list-alert-desc">{description}</p>
        ) : null}
      </div>
      {action ? <div className="ds-adm-callout-action">{action}</div> : null}
    </aside>
  );
}
