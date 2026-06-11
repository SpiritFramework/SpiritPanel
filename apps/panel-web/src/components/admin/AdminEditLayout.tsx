import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LucideIcon,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '../Layout';
import { PageLoading } from '../ui';

export type AdminEditNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
};

export function AdminEditLoading() {
  return <PageLoading />;
}

export function AdminEditShell({ children }: { children: React.ReactNode }) {
  return <div className="ds-admin-edit-shell">{children}</div>;
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
    <header className="ds-admin-edit-header">
      <div className="flex min-w-0 items-start gap-3">
        <div className="ds-admin-hero-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="ds-admin-hero-title">{title}</h1>
          {subtitle && <p className="ds-admin-hero-subtitle">{subtitle}</p>}
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
    <div className="ds-admin-edit-layout">
      <aside className="ds-admin-edit-sidebar">{sidebar}</aside>
      <div className="ds-admin-edit-content">{children}</div>
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
    <nav className="ds-admin-edit-nav">
      {items.map((item) => {
        const selected = active === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`ds-admin-edit-nav-item${selected ? ' is-active' : ''}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="ds-admin-tab-count">{item.count}</span>
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
    <section className="ds-admin-panel">
      <div className="ds-admin-panel-head">
        <span className="ds-admin-panel-icon">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="ds-admin-panel-title">{title}</h2>
      </div>
      <div className="ds-admin-panel-body">{children}</div>
      {footer && (
        <div className="flex justify-end border-t border-[var(--border)] px-4 py-3">{footer}</div>
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
  return (
    <div className={`ds-alert ds-alert--${tone === 'warning' ? 'warning' : 'info'} text-[11px] leading-relaxed`}>
      {children}
    </div>
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
    <div className="ds-admin-save-bar mt-5">
      <div className="mr-auto min-w-0 text-[11px]">
        {error && <span className="text-red-400">{error}</span>}
        {!error && saved && <span className="text-green-400">Changes saved successfully.</span>}
        {!error && !saved && hasChanges && (
          <span className="text-[var(--muted)]">You have unsaved changes.</span>
        )}
      </div>
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
    <div className="ds-grid-stats mb-5">
      {items.map((item) => (
        <div key={item.label} className="ds-card ds-card--flat p-3">
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
