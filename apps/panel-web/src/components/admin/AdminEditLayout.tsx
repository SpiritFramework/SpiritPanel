import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LucideIcon,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '../Layout';
import { Spinner } from '../ui';

export type AdminEditNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
};

export function AdminEditLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function AdminEditShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-edit-shell flex min-h-[calc(100vh-3rem)] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      {children}
    </div>
  );
}

export function AdminEditHeader({
  icon: Icon,
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  actions,
  onSave,
  saving,
  saveDisabled,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel?: string;
  actions?: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/25">
          <Icon className="h-5 w-5 accent-text" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold uppercase tracking-wide sm:text-lg">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to={backTo}>
          <Button type="button" variant="ghost">
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Button>
        </Link>
        {actions}
        {onSave && (
          <Button type="button" disabled={saveDisabled || saving} onClick={onSave}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </div>
    </header>
  );
}

export function AdminEditBody({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="admin-edit-sidebar shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)]/40 p-2 lg:w-56 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        {sidebar}
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">{children}</div>
    </div>
  );
}

export function AdminEditNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: AdminEditNavItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-0.5 lg:flex-col lg:space-y-0.5 lg:overflow-visible">
      {items.map((item) => {
        const selected = active === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition lg:w-full ${
              selected
                ? 'bg-[var(--accent-muted)] accent-text shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${selected ? 'accent-text' : 'opacity-70'}`} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  selected ? 'bg-[var(--surface)]/80' : 'bg-[var(--surface)]'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function AdminEditPanel({
  title,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/25 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <Icon className="h-4 w-4 accent-text" />
        <h2 className="text-xs font-bold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      {footer && (
        <div className="flex justify-end border-t border-[var(--border)] px-4 py-3 sm:px-5">{footer}</div>
      )}
    </section>
  );
}

export function AdminEditNotice({
  children,
  tone = 'warning',
}: {
  children: React.ReactNode;
  tone?: 'warning' | 'info';
}) {
  const styles =
    tone === 'warning'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200/90'
      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200/90';
  return (
    <p className={`rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed ${styles}`}>{children}</p>
  );
}

export function AdminEditFormFooter({
  hasChanges,
  saving,
  error,
  saved,
  onReset,
  onSave,
}: {
  hasChanges: boolean;
  saving: boolean;
  error?: string;
  saved?: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {(error || saved || hasChanges) && (
        <p className="mr-auto text-[11px]">
          {error && <span className="text-red-400">{error}</span>}
          {!error && saved && <span className="text-green-400">Changes saved successfully.</span>}
          {!error && !saved && hasChanges && (
            <span className="text-[var(--muted)]">You have unsaved changes.</span>
          )}
        </p>
      )}
      <Button type="button" variant="ghost" onClick={onReset} disabled={!hasChanges || saving}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <Button type="button" disabled={saving || !hasChanges} onClick={onSave}>
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

export function AdminEditStatStrip({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }>;
}) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{item.label}</p>
          <p
            className={`mt-1 text-sm font-semibold tabular-nums ${
              item.tone === 'success'
                ? 'text-green-400'
                : item.tone === 'warning'
                  ? 'text-yellow-400'
                  : item.tone === 'danger'
                    ? 'text-red-400'
                    : ''
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
