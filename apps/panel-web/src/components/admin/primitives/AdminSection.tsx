import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function AdminSection({
  id,
  tone = 'default',
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className,
}: {
  id?: string;
  tone?: 'default' | 'identity' | 'connection' | 'capacity' | 'wings' | 'trends' | 'fleet' | 'danger';
  icon?: LucideIcon;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`ds-adm-section ds-nd-list-block${tone !== 'default' ? ` ds-adm-section--${tone} ds-nd-st-block--${tone}` : ''}${className ? ` ${className}` : ''}`}
    >
      <header className="ds-adm-section-head ds-nd-list-block-head ds-nd-st-block-head ds-nd-ov-card-head">
        {Icon ? (
          <span className="ds-adm-section-icon ds-nd-list-block-icon" aria-hidden>
            <Icon className="ds-icon ds-icon--sm" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="ds-adm-section-eyebrow ds-nd-list-block-eyebrow">{eyebrow}</p>
          ) : null}
          <h2 className="ds-adm-section-title ds-nd-list-block-title">{title}</h2>
          {description ? (
            <p className="ds-adm-section-desc ds-nd-list-block-desc">{description}</p>
          ) : null}
        </div>
        {badge ? <div className="ds-adm-section-badge ds-nd-list-block-badge">{badge}</div> : null}
        {actions ? (
          <div className="ds-adm-section-actions ds-nd-st-block-actions ds-nd-ov-card-actions">
            {actions}
          </div>
        ) : null}
      </header>
      {children != null ? (
        <div className="ds-adm-section-body ds-nd-list-block-body ds-nd-st-block-body ds-nd-ov-card-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}
