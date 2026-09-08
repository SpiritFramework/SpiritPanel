import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  LucideIcon,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from './Layout';
import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';
import { AlertBanner, PageLoading } from './ui';

export type AdminDetailTab<T extends string = string> = {
  id: T;
  label: string;
  count?: number;
};

export type AdminHeroStat = {
  label: string;
  value: string;
  icon?: LucideIcon;
  className?: string;
};

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function AdminDetailLoading() {
  return <PageLoading />;
}

export function AdminDetailNotFound({
  message,
  backTo,
  backLabel,
}: {
  message: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <>
      <Link to={backTo} className="ds-admin-breadcrumb mb-4 inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>
      <AlertBanner tone="error">{message}</AlertBanner>
    </>
  );
}

export function AdminDetailPage({
  breadcrumb,
  children,
}: {
  breadcrumb: BreadcrumbItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="ds-admin-page">
      <AdminDetailBreadcrumb items={breadcrumb} />
      <div className="ds-admin-shell">{children}</div>
    </div>
  );
}

export function AdminDetailBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const first = items[0];
  const rest = items.slice(1);

  return (
    <nav className="ds-admin-breadcrumb">
      {first?.to ? (
        <Link to={first.to}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {first.label}
        </Link>
      ) : (
        <span>{first?.label}</span>
      )}
      {rest.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span className="ds-admin-breadcrumb-current">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function AdminDetailHero({
  gradient: _gradient,
  icon: Icon,
  iconContent,
  title,
  subtitle,
  meta,
  badges,
  actions,
  stats,
}: {
  /** @deprecated Ignored — hero uses accent stripe instead of gradients */
  gradient?: string;
  icon?: LucideIcon;
  iconContent?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: AdminHeroStat[];
}) {
  const { branding } = useBranding();
  const showStripe = normalizeAppearance(branding).showHeroStripe;

  return (
    <div className="ds-admin-hero">
      {showStripe && <div className="ds-hero-stripe" />}
      <div className="ds-admin-hero-body">
        {(Icon || iconContent) && (
          <div className="ds-admin-hero-icon">
            {iconContent ?? (Icon && <Icon className="h-5 w-5" />)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ds-admin-hero-title">{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="ds-admin-hero-subtitle">{subtitle}</div>}
          {meta && <div className="ds-admin-hero-meta">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div
          className="ds-admin-hero-stats"
          style={{
            gridTemplateColumns:
              stats.length >= 4
                ? undefined
                : stats.length === 3
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(2, minmax(0, 1fr))',
          }}
        >
          {stats.map((stat) => (
            <AdminHeroStatCell key={stat.label} {...stat} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminHeroStatCell({ icon: Icon, label, value, className = '' }: AdminHeroStat) {
  return (
    <div className={`ds-admin-hero-stat ${className}`}>
      <div className="ds-admin-hero-stat-label">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </div>
      <p className="ds-admin-hero-stat-value">{value}</p>
    </div>
  );
}

export function AdminDetailTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: AdminDetailTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  const { branding } = useBranding();
  const tabsStyle = normalizeAppearance(branding).adminTabsStyle;
  const tabsClass =
    tabsStyle === 'underline'
      ? ' ds-admin-tabs--underline'
      : tabsStyle === 'pills'
        ? ' ds-admin-tabs--pills'
        : '';

  return (
    <div className={`ds-admin-tabs${tabsClass}`}>
      <div className="ds-admin-tabs-inner">
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`ds-admin-tab${selected ? ' is-active' : ''}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ds-admin-tab-count">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDetailBody({ children }: { children: React.ReactNode }) {
  return <div className="ds-admin-body">{children}</div>;
}

export function AdminDetailManageLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:items-start">
      <aside className="space-y-3 xl:sticky xl:top-0">{sidebar}</aside>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

export function AdminSidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ds-admin-sidebar-card">
      <h3 className="ds-admin-sidebar-card-title">{title}</h3>
      {children}
    </div>
  );
}

export function AdminResourcePill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="ds-mini-stat">
      <div className="flex items-center justify-center gap-0.5">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <span className="ds-mini-stat-value">{value}</span>
    </div>
  );
}

export function AdminInfoRow({
  icon: Icon,
  label,
  value,
  mono,
  truncate: truncateValue,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <dl className="ds-admin-meta-row">
      <dt>
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </dt>
      <dd
        className={`${mono ? 'font-mono text-[10px]' : ''} ${truncateValue ? 'max-w-[140px] truncate' : ''}`}
        title={value}
      >
        {value}
      </dd>
    </dl>
  );
}

export function AdminMetaRow({
  label,
  value,
  mono,
  truncate: truncateValue,
  copy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  copy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="ds-admin-meta-field">
      <dt className="ds-admin-meta-field-label">{label}</dt>
      <dd className="ds-admin-meta-field-value">
        <span
          className={`min-w-0 flex-1 ${mono ? 'font-mono' : ''} ${truncateValue ? 'truncate' : 'break-all'}`}
          title={value}
        >
          {value}
        </span>
        {copy && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded p-0.5 text-[var(--muted)] transition hover:text-[var(--text)]"
            aria-label={`Copy ${label}`}
          >
            <Copy className={`h-3 w-3 ${copied ? 'text-green-400' : ''}`} />
          </button>
        )}
      </dd>
    </div>
  );
}

export function AdminCopyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ds-btn ds-btn--secondary flex flex-1 items-center justify-center gap-1 py-2 text-[10px]"
    >
      <Copy className={`h-3 w-3 ${active ? 'text-green-400' : ''}`} />
      {label}
    </button>
  );
}

export function AdminQuickLink({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--surface-hover)]"
    >
      <span className="ds-admin-panel-icon">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{label}</span>
        {hint && <span className="block truncate text-[10px] text-[var(--muted)]">{hint}</span>}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
    </button>
  );
}

export function AdminSettingsPanel({
  title,
  description,
  icon: Icon,
  tone = 'default',
  className = '',
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: 'default' | 'danger';
  className?: string;
  children: React.ReactNode;
}) {
  const isDanger = tone === 'danger';
  return (
    <section
      className={`ds-admin-panel mb-4 ${isDanger ? 'border-red-500/25 bg-red-500/[0.03]' : ''} ${className}`}
    >
      <div className="ds-admin-panel-head">
        <span className={`ds-admin-panel-icon ${isDanger ? 'border-red-500/30 text-red-400' : ''}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`ds-admin-panel-title ${isDanger ? 'text-red-300' : ''}`}>{title}</h2>
          {description && <p className="ds-admin-panel-desc">{description}</p>}
        </div>
      </div>
      <div className="ds-admin-panel-body">{children}</div>
    </section>
  );
}

export function AdminSection({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminFormStatus({ error, saved }: { error?: string; saved?: boolean }) {
  if (!error && !saved) return null;
  if (error) {
    return (
      <AlertBanner tone="error" className="mb-4">
        {error}
      </AlertBanner>
    );
  }
  return (
    <div className="ds-alert ds-alert--info mb-4 border-green-500/30 bg-green-500/10 text-green-400" role="status">
      Changes saved successfully.
    </div>
  );
}

export function AdminSaveBar({
  hasChanges,
  saving,
  error,
  saved,
  onReset,
}: {
  hasChanges: boolean;
  saving: boolean;
  error?: string;
  saved?: boolean;
  onReset: () => void;
}) {
  const showBar = hasChanges || saved || !!error;
  if (!showBar) return null;

  return (
    <div className="ds-admin-save-bar">
      <div className="mr-auto min-w-0 text-[11px]">
        {error && <p className="text-red-400">{error}</p>}
        {!error && saved && <p className="text-green-400">Changes saved</p>}
        {!error && !saved && hasChanges && (
          <span className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            Unsaved changes
          </span>
        )}
      </div>
      <Button type="button" variant="ghost" onClick={onReset} disabled={!hasChanges || saving}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <Button type="submit" disabled={saving || !hasChanges}>
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

export function AdminRelatedTable({
  columns,
  legend,
  rows,
  minWidth = '640px',
}: {
  columns: string[];
  legend?: React.ReactNode;
  rows: { key: string; href: string; cells: React.ReactNode[] }[];
  minWidth?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="ds-table-wrap rounded-xl border border-[var(--border)]">
      <table className="ds-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th className="w-10" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => navigate(row.href)}
              className="group cursor-pointer"
            >
              {row.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
              <td>
                <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--bg-elevated)]/30 px-4 py-2 text-[10px] text-[var(--muted)]">
          {legend}
        </div>
      )}
    </div>
  );
}
