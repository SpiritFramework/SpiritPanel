import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { sanitizeLinkHref } from '../../../lib/safe-url';

export function MarketplaceBackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}

export function MarketplaceEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ds-page ds-card ds-card-body py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-[var(--muted)]" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-[var(--text)]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ResourceHero({
  eyebrow,
  title,
  subtitle,
  description,
  icon,
  badges,
  actions,
  stats,
}: {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
}) {
  return (
    <header className="ds-card ds-card--elevated overflow-hidden">
      <div className="ds-hero-stripe" />
      <div className="ds-card-body">
        {badges ? <div className="mb-3 flex flex-wrap gap-2">{badges}</div> : null}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {icon ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--accent)]">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
              <h1 className="ds-page-title mt-1 break-words text-2xl">{title}</h1>
              {subtitle ? (
                <p className="mt-1 break-all font-mono text-sm text-[var(--muted)]">{subtitle}</p>
              ) : null}
              {description ? (
                <p className="ds-page-description mt-2 max-w-2xl break-words text-sm leading-relaxed">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div>
          ) : null}
        </div>
        {stats ? <div className="mt-6 border-t border-[var(--border)] pt-4">{stats}</div> : null}
      </div>
    </header>
  );
}

export function HeroStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="list">
      {children}
    </div>
  );
}

export function HeroStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="ds-mini-stat" role="listitem">
      <span className="inline-flex items-center justify-center gap-1 text-[var(--muted)]">
        <Icon className="h-3 w-3" style={accent ? { color: accent } : undefined} aria-hidden />
        {label}
      </span>
      <span className="ds-mini-stat-value text-[var(--text)]">{value}</span>
    </div>
  );
}

export function DetailPanel({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ds-card min-w-0">
      <header className="ds-card-header">
        <div className="min-w-0">
          <h2 className="ds-card-title">
            {Icon ? <Icon className="h-4 w-4 text-[var(--muted)]" aria-hidden /> : null}
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="ds-card-body">{children}</div>
    </section>
  );
}

export function DetailRow({
  label,
  value,
  icon: Icon,
  mono,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  mono?: boolean;
  href?: string;
}) {
  const safeHref = href ? sanitizeLinkHref(href) : null;
  const valueClass = mono ? 'ds-detail-row__value ds-detail-row__value--mono' : 'ds-detail-row__value';
  const linkClass = mono
    ? 'ds-detail-row__link ds-detail-row__link--mono'
    : 'ds-detail-row__link';

  return (
    <div className="ds-detail-row">
      <div className="ds-detail-row__label">
        <Icon className="ds-detail-row__label-icon" aria-hidden />
        {label}
      </div>
      {safeHref ? (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title={value}
        >
          <span className="min-w-0">{value}</span>
          <ExternalLink className="ds-detail-row__link-icon" aria-hidden />
        </a>
      ) : (
        <p className={valueClass} title={value.length > 48 ? value : undefined}>
          {value}
        </p>
      )}
    </div>
  );
}

export function StatusBanner({
  tone,
  title,
  detail,
  action,
}: {
  tone: 'success' | 'warning' | 'info';
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10'
        : 'border-[var(--border)] bg-[var(--bg-elevated)]';

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${toneClass}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text)]">{title}</p>
        {detail ? <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}
