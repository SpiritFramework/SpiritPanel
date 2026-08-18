import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function NodeDetailPanel({
  title,
  description,
  icon: Icon,
  tone,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: 'danger';
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={`ds-nd-panel${tone === 'danger' ? ' ds-nd-panel--danger' : ''}`}>
      <header className="ds-nd-panel-head">
        {Icon ? (
          <span className="ds-nd-panel-icon" aria-hidden>
            <Icon className="ds-icon ds-icon--sm" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="ds-nd-panel-title">{title}</h2>
          {description ? <p className="ds-nd-panel-desc">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="ds-nd-panel-body">{children}</div>
    </section>
  );
}
