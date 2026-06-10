import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Resolve a tone to token-driven fg/bg/border colors (works in light + dark). */
export function toneStyle(tone: Tone): CSSProperties {
  switch (tone) {
    case 'success':
      return { background: 'var(--success-bg)', color: 'var(--success-fg)', borderColor: 'var(--success-border)' };
    case 'warning':
      return { background: 'var(--warning-bg)', color: 'var(--warning-fg)', borderColor: 'var(--warning-border)' };
    case 'danger':
      return { background: 'var(--danger-bg)', color: 'var(--danger-fg)', borderColor: 'var(--danger-border)' };
    case 'info':
      return { background: 'var(--info-bg)', color: 'var(--info-fg)', borderColor: 'var(--info-border)' };
    case 'default':
      return { background: 'var(--accent-muted)', color: 'var(--accent-hover)', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' };
    case 'neutral':
    default:
      return { background: 'var(--surface-hover)', color: 'var(--muted)', borderColor: 'var(--border)' };
  }
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] ${className}`}
    />
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** The single tokenized base every status pill is built on. */
export function StatusPill({
  label,
  tone,
  compact,
  pulse,
  onDark,
  className = '',
}: {
  label: string;
  tone: Tone;
  compact?: boolean;
  pulse?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const size = compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-0.5 text-xs gap-1.5';
  const dot = compact ? 'h-1 w-1' : 'h-1.5 w-1.5';

  if (onDark) {
    const live = tone === 'success' || tone === 'info';
    return (
      <span
        className={`inline-flex items-center rounded-full border font-medium capitalize bg-black/25 text-white/90 border-white/15 backdrop-blur-sm ${size} ${className}`}
      >
        <span
          className={`${dot} rounded-full ${live ? 'status-pulse' : 'bg-white/50'}`}
          style={live ? { background: 'var(--success-fg)' } : undefined}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium capitalize ${size} ${className}`}
      style={toneStyle(tone)}
    >
      <span className={`${dot} rounded-full bg-current ${pulse ? 'status-pulse' : ''}`} />
      {label}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  running: 'success',
  starting: 'warning',
  stopping: 'warning',
  installing: 'info',
  install_failed: 'danger',
  restoring_backup: 'info',
  suspended: 'warning',
  offline: 'neutral',
  stopped: 'neutral',
  normal: 'neutral',
  crashed: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  normal: 'Offline',
  restoring_backup: 'Restoring backup',
  install_failed: 'Install failed',
};

/** Low-level badge for raw status strings. Prefer ServerStatusBadge when containerState is available. */
export function StatusBadge({
  status,
  suspended,
  compact,
  onDark,
}: {
  status: string;
  suspended?: boolean;
  compact?: boolean;
  onDark?: boolean;
}) {
  if (suspended) {
    return <StatusPill label="Suspended" tone="warning" compact={compact} onDark={onDark} />;
  }
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const tone = STATUS_TONES[normalized] ?? 'neutral';
  const label = STATUS_LABELS[normalized] ?? status.replace(/_/g, ' ');
  const pulse = normalized === 'running' || normalized === 'installing' || normalized === 'starting';
  return <StatusPill label={label} tone={tone} compact={compact} pulse={pulse} onDark={onDark} />;
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={toneStyle(tone)}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  className = '',
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`stat-card rounded-xl border border-[var(--border)] p-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-[var(--muted)]">{label}</div>
        <div className="rounded-lg border p-1.5 shadow-sm" style={toneStyle(tone ?? 'default')}>
          {icon}
        </div>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value ?? 0}</div>
      {hint && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-4 py-10 text-center">
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-[var(--muted)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Loading placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: 'color-mix(in srgb, var(--border) 60%, transparent)' }}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
