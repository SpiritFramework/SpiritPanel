import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function ClientSection({
  id,
  icon: Icon,
  title,
  description,
  meta,
  actions,
  children,
  className = '',
}: {
  id?: string;
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`ds-cli-section${className ? ` ${className}` : ''}`}>
      <header className="ds-cli-section-head">
        {Icon ? (
          <span className="ds-cli-section-icon" aria-hidden>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <div className="ds-cli-section-copy min-w-0 flex-1">
          <h3 className="ds-cli-section-title">{title}</h3>
          {description ? <p className="ds-cli-section-desc">{description}</p> : null}
        </div>
        {meta ? <div className="ds-cli-section-meta">{meta}</div> : null}
        {actions ? <div className="ds-cli-section-actions">{actions}</div> : null}
      </header>
      {children != null ? <div className="ds-cli-section-body">{children}</div> : null}
    </section>
  );
}
