import type { ReactNode } from 'react';

export function AdminHero({
  eyebrow,
  title,
  description,
  pill,
  pillTone,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  pill?: ReactNode;
  pillTone?: 'ok' | 'warn' | 'neutral';
  actions?: ReactNode;
}) {
  return (
    <section className="ds-adm-hero ds-nd-list-hero">
      <div className="ds-adm-hero-copy">
        {eyebrow ? <p className="ds-adm-hero-eyebrow ds-nd-list-hero-eyebrow">{eyebrow}</p> : null}
        <div className="ds-adm-hero-title-row ds-nd-list-hero-title-row">
          <h1 className="ds-adm-hero-title ds-nd-list-hero-title">{title}</h1>
          {pill != null ? (
            <span
              className={`ds-adm-hero-pill ds-nd-list-hero-pill${
                pillTone === 'ok'
                  ? ' ds-adm-hero-pill--ok ds-nd-list-hero-pill--ok'
                  : pillTone === 'warn'
                    ? ' ds-adm-hero-pill--warn ds-nd-list-hero-pill--warn'
                    : ''
              }`}
            >
              {pill}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="ds-adm-hero-desc ds-nd-list-hero-desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="ds-adm-hero-actions ds-nd-list-hero-actions">{actions}</div> : null}
    </section>
  );
}
