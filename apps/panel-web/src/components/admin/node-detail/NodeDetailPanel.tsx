import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared section chrome for node detail tabs — matches overview cards. */
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
    <section
      className={`ds-nd-ov-card${tone === 'danger' ? ' ds-nd-ov-card--danger' : ''}`}
    >
      <header className="ds-nd-ov-card-head">
        {Icon ? (
          <span className="ds-nd-ov-card-icon" aria-hidden>
            <Icon className="ds-icon ds-icon--sm" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="ds-nd-ov-card-title">{title}</h2>
          {description ? <p className="ds-nd-ov-card-desc">{description}</p> : null}
        </div>
        {actions ? <div className="ds-nd-ov-card-actions">{actions}</div> : null}
      </header>
      <div className="ds-nd-ov-card-body">{children}</div>
    </section>
  );
}
