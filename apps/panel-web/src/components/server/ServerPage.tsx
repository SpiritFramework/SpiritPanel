import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spinner } from '../ui';

/** Consistent outer wrapper for every server manage tab. */
export function ServerPage({
  children,
  className = '',
  fullHeight,
}: {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={`server-page ${fullHeight ? 'flex min-h-0 flex-1 flex-col' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function ServerPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="server-page-header flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function ServerPanel({
  title,
  description,
  icon: Icon,
  iconTone = 'accent',
  actions,
  children,
  className = '',
  bodyClassName = '',
  noPadding,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: 'accent' | 'green' | 'cyan' | 'amber' | 'red' | 'violet';
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  const iconTones = {
    accent: 'bg-[var(--accent-muted)] accent-text',
    green: 'bg-green-500/15 text-green-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    amber: 'bg-amber-500/15 text-amber-400',
    red: 'bg-red-500/15 text-red-400',
    violet: 'bg-violet-500/15 text-violet-400',
  };

  const hasHeader = title || description || actions;

  return (
    <section className={`server-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTones[iconTone]}`}>
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold">{title}</h3>}
              {description && <p className="text-[11px] text-[var(--muted)]">{description}</p>}
            </div>
          </div>
          {actions && <div className="server-panel-actions">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? bodyClassName : `p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function ServerErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
      {message}
    </div>
  );
}

export function ServerNotice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'muted';
}) {
  const tones = {
    info: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
    muted: 'border-[var(--border)] bg-[var(--bg-elevated)]/40 text-[var(--muted)]',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>
  );
}

export function ServerLoadingBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-14 ${className}`}>
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function ServerToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
        active
          ? 'border-[var(--accent)]/40 bg-[var(--accent-muted)] accent-text'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

export function ServerListCard({
  children,
  className = '',
  highlight,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-4 transition ${
        highlight
          ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)]/20'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/30 hover:border-[color-mix(in_srgb,var(--accent)_20%,var(--border))] hover:bg-[var(--surface-hover)]/35'
      } ${className}`}
    >
      {children}
    </article>
  );
}
