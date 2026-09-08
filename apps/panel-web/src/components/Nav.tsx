import { NavLink, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PanelName, panelNameGradientStyle, panelNameInitial } from './PanelName';
import { sanitizeImageSrc } from '../lib/safe-url';

export function SideNavItem({
  to,
  end,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
  description?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-item group flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${
          isActive ? 'nav-item-active active' : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`nav-item-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
              isActive
                ? 'accent-bg text-white shadow-[0_4px_14px_-4px_var(--accent-glow)] ring-1 ring-white/15'
                : 'bg-[var(--bg-elevated)] text-[var(--muted)] group-hover:text-[var(--text)] group-hover:bg-[var(--surface-hover)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium leading-tight">{label}</span>
            {description && (
              <span className="mt-0.5 block truncate text-[11px] opacity-60">{description}</span>
            )}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function SideNavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]/60">
        {label}
      </p>
      {children}
    </div>
  );
}

export function SideNavShell({ children }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <nav className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
      <div className="space-y-0.5">{children}</div>
    </nav>
  );
}

export function TabNavItem({
  to,
  end,
  icon: Icon,
  label,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        `nav-tab inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-3 ${
          isActive
            ? 'nav-tab-active accent-bg text-white'
            : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
        }`
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="nav-tab-label">{label}</span>
    </NavLink>
  );
}

export function CompactBackLink({
  to,
  label,
  className = '',
}: {
  to: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium leading-snug text-[var(--muted)] transition hover:border-[var(--border)]/80 hover:bg-[var(--bg-elevated)]/60 hover:accent-text md:py-1 md:text-[11px] ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[5.5rem] truncate sm:max-w-none">{label}</span>
    </Link>
  );
}

export function SideNavBackLink({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      to={to}
      className="nav-item group mb-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:accent-text"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  );
}

export function SidebarFooterLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="nav-item group mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  );
}

export function BrandMark({
  name,
  subtitle,
  logoUrl,
  homeTo = '/servers',
}: {
  name: string;
  subtitle?: string;
  logoUrl?: string;
  homeTo?: string;
}) {
  const safeLogo = sanitizeImageSrc(logoUrl);
  return (
    <Link
      to={homeTo}
      className="brand-mark group -mx-0.5 flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-[var(--surface-hover)]/55"
    >
      {safeLogo ? (
        <span className="brand-mark-logo relative shrink-0">
          <img src={safeLogo} alt="" className="relative z-[1] h-10 w-10 rounded-xl object-contain p-1" />
        </span>
      ) : (
        <span className="brand-mark-logo relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={panelNameGradientStyle()}>
          {panelNameInitial(name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <PanelName name={name} variant="sidebar" className="block truncate" />
        {subtitle && <span className="brand-mark-tagline mt-0.5 block truncate">{subtitle}</span>}
      </span>
    </Link>
  );
}
