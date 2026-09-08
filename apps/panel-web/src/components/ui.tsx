import { useEffect, useId, type CSSProperties, type ReactNode } from 'react';
import { AlertTriangle, X, type LucideIcon } from 'lucide-react';

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
      return { background: 'var(--surface-hover)', color: 'var(--muted)', borderColor: 'var(--border)' };
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
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="ds-page-header">
      <div className="min-w-0">
        <h1 className="ds-page-title flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {description && <p className="ds-page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** Full-page or route-level loading with skeleton preview. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="ds-page-loading" role="status" aria-live="polite">
      <Spinner className="h-6 w-6" />
      <span>{label}</span>
    </div>
  );
}

export function PageSkeleton() {
  return <ListPageSkeleton />;
}

/** Standard Lucide icon wrapper — consistent size & alignment. */
export function DsIcon({
  icon: Icon,
  className = '',
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return <Icon className={`ds-icon ${className}`} aria-hidden />;
}

/** Skeleton for list pages (users, servers, admin tables). */
export function ListPageSkeleton() {
  return (
    <div className="ds-page ds-stack" aria-hidden>
      <div className="ds-page-header">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="ds-grid-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
        ))}
      </div>
      <div className="ds-card">
        <div className="ds-card-header">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="ds-card-body space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="ds-ad ds-ad--skeleton" aria-hidden>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="ds-ad-stats">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-lg" />
        ))}
      </div>
      <div className="ds-ad-bento">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <div className="ds-ad-split">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
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
    <div className={`ds-stat-card ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-[var(--muted)]">{label}</div>
        <div className="rounded-lg border p-1.5" style={toneStyle(tone ?? 'neutral')}>
          {icon}
        </div>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums tracking-tight">{value ?? 0}</div>
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
    <div className="ds-empty">
      {icon && <div className="ds-empty-icon">{icon}</div>}
      <h3 className="ds-empty-title">{title}</h3>
      <p className="ds-empty-description">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AlertBanner({
  tone,
  children,
  className = '',
}: {
  tone: 'error' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}) {
  return <div className={`ds-alert ds-alert--${tone} ${className}`} role="alert">{children}</div>;
}

/** Loading placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ds-skeleton ${className}`} />;
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

export function UiCard({
  title,
  children,
  action,
  icon,
  variant = 'base',
  bodyClassName = '',
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'base' | 'elevated' | 'interactive';
  bodyClassName?: string;
  className?: string;
}) {
  const variantClass =
    variant === 'elevated' ? 'ds-card--elevated' : variant === 'interactive' ? 'ds-card--interactive' : '';
  return (
    <div className={`ds-card ${variantClass} ${className}`}>
      {title && (
        <div className="ds-card-header">
          <h2 className="ds-card-title">
            {icon}
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={`ds-card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`ds-modal ${wide ? 'ds-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-header">
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="ds-modal-title">
              {title}
            </h2>
            {description && (
              <p id={descId} className="ds-modal-description">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="ds-icon-btn ds-icon-btn--bordered shrink-0"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
  error?: string;
}) {
  const body = (
    <div className="space-y-3">
      <p className="ds-text-sm leading-relaxed">{description}</p>
      {tone === 'danger' && (
        <div className="ds-alert ds-alert--warning">
          <AlertTriangle className="ds-icon ds-icon--md shrink-0" aria-hidden />
          <span>This action is permanent and cannot be undone.</span>
        </div>
      )}
      {error && (
        <AlertBanner tone="error">{error}</AlertBanner>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={detail ?? (tone === 'danger' ? 'Please confirm before continuing.' : undefined)}
      footer={
        <>
          <button type="button" className="ds-btn ds-btn--ghost ds-btn--md" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ds-btn ds-btn--md ${tone === 'danger' ? 'ds-btn--danger' : 'ds-btn--primary'}`}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {body}
    </Modal>
  );
}
