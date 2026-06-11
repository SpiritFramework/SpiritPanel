import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  LucideIcon,
  RotateCcw,
  Save,
} from 'lucide-react';
import { formatActivityTime, type ActivityEntry } from '../lib/activity';
import { ActivityTimeline } from './ActivityTimeline';
import { Button } from './Layout';
import { Spinner } from './ui';

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

const HERO_PATTERN =
  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)';

export function AdminDetailLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
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
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:accent-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-sm text-red-400">
        {message}
      </div>
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
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col">
      <AdminDetailBreadcrumb items={breadcrumb} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/5">
        {children}
      </div>
    </div>
  );
}

export function AdminDetailBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const first = items[0];
  const rest = items.slice(1);

  return (
    <nav className="mb-4 flex shrink-0 flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
      {first?.to ? (
        <Link to={first.to} className="inline-flex items-center gap-1 font-medium transition hover:accent-text">
          <ArrowLeft className="h-3.5 w-3.5" />
          {first.label}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 font-medium">{first?.label}</span>
      )}
      {rest.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 opacity-50" />
          {item.to ? (
            <Link to={item.to} className="transition hover:accent-text">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminDetailHero({
  gradient,
  icon: Icon,
  iconContent,
  title,
  subtitle,
  meta,
  badges,
  actions,
  stats,
}: {
  gradient: string;
  icon?: LucideIcon;
  iconContent?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: AdminHeroStat[];
}) {
  return (
    <div className="relative shrink-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: HERO_PATTERN, backgroundSize: '22px 22px' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-black/10 to-transparent" />

      <div className="relative flex flex-wrap items-start gap-4 p-5 sm:p-6">
        {(Icon || iconContent) && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-xl font-bold text-white ring-1 ring-white/15 shadow-lg sm:h-16 sm:w-16 sm:text-2xl">
            {iconContent ?? (Icon && <Icon className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="mt-1 text-sm text-white/75">{subtitle}</div>}
          {meta && <div className="mt-0.5 text-xs text-white/55">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div
          className={`relative grid gap-px border-t border-white/10 bg-black/20 ${
            stats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : stats.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
          }`}
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
    <div className={`bg-[var(--surface)]/85 px-4 py-3.5 backdrop-blur-sm sm:px-5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {Icon && <Icon className="h-3 w-3 shrink-0 opacity-80" />}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</p>
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
  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)]/30 px-3 py-2.5 sm:px-6">
      <div className="nav-tabs-scroll inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                selected
                  ? 'bg-[var(--surface)] accent-text shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    selected ? 'bg-[var(--accent-muted)]' : 'bg-[var(--surface)]'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDetailBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>;
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-4 shadow-sm shadow-black/5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</h3>
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-center">
      <div className="flex items-center justify-center gap-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
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
    <div className="flex items-center justify-between gap-2 text-xs">
      <dt className="flex items-center gap-1 text-[var(--muted)]">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </dt>
      <dd
        className={`truncate font-medium ${mono ? 'font-mono text-[10px]' : ''} ${truncateValue ? 'max-w-[140px]' : ''}`}
        title={value}
      >
        {value}
      </dd>
    </div>
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
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--surface)] px-2 py-1.5">
        <span
          className={`min-w-0 flex-1 text-xs ${mono ? 'font-mono' : ''} ${truncateValue ? 'truncate' : 'break-all'}`}
          title={value}
        >
          {value}
        </span>
        {copy && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded p-0.5 text-[var(--muted)] transition hover:accent-text"
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
      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 text-[10px] transition hover:bg-[var(--surface-hover)]"
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
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
      className={`rounded-xl border p-4 sm:p-5 ${
        isDanger
          ? 'border-red-500/25 bg-red-500/[0.03]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/30 shadow-sm shadow-black/[0.03]'
      } ${className}`}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isDanger ? 'bg-red-500/15 text-red-400' : 'bg-[var(--accent-muted)] accent-text'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 border-l-2 border-[var(--accent)]/20 pl-3">
          <h2 className={`text-sm font-semibold ${isDanger ? 'text-red-300' : ''}`}>{title}</h2>
          {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{description}</p>}
        </div>
      </div>
      {children}
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
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-xs ${
        error
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-green-500/30 bg-green-500/10 text-green-400'
      }`}
    >
      {error || 'Changes saved successfully.'}
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
    <div className="admin-save-bar sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-sm">
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
    <div className="table-scroll-touch overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-left text-xs" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {columns.map((col) => (
              <th key={col} className="px-4 py-2.5 font-semibold">
                {col}
              </th>
            ))}
            <th className="w-10 px-2 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => navigate(row.href)}
              className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
            >
              {row.cells.map((cell, i) => (
                <td key={i} className="px-4 py-3">
                  {cell}
                </td>
              ))}
              <td className="px-2 py-3">
                <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
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

export function AdminActivityTimeline({
  entries,
  renderMeta,
}: {
  entries: ActivityEntry[];
  renderMeta?: (entry: ActivityEntry) => React.ReactNode;
}) {
  return (
    <ActivityTimeline
      entries={entries}
      compact
      renderMeta={renderMeta}
    />
  );
}
