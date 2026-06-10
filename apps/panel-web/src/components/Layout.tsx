import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Egg,
  LayoutDashboard,
  LogOut,
  HardDrive,
  MapPin,
  Megaphone,
  Server,
  Settings,
  Store,
  User,
  Users,
} from 'lucide-react';
import { Search } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { BrandMark, SideNavGroup, SideNavItem, SidebarFooterLink } from './Nav';
import { ThemeToggle } from './ThemeToggle';
import { MobileShell } from './MobileShell';
import { SelectControl } from './SelectControl';

export { SelectControl } from './SelectControl';

function CommandPaletteButton() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-left text-[var(--muted)] transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--text)]"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-xs">Search…</span>
      <kbd className="hidden rounded border border-[var(--border)] px-1 py-0.5 text-[10px] sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  );
}

const adminGroups = [
  {
    label: 'Overview',
    links: [
      { to: '/admin', label: 'Dashboard', description: 'Health & capacity', icon: LayoutDashboard, exact: true },
      { to: '/admin/activity', label: 'Activity', description: 'Audit trail', icon: Activity },
      { to: '/admin/announce', label: 'Announce', description: 'User messages', icon: Megaphone },
    ],
  },
  {
    label: 'Management',
    links: [
      { to: '/admin/users', label: 'Users', description: 'Accounts & roles', icon: Users },
      { to: '/admin/servers', label: 'Servers', description: 'All game servers', icon: Server },
      { to: '/admin/nodes', label: 'Nodes', description: 'Wings & capacity', icon: HardDrive },
      { to: '/admin/locations', label: 'Locations', description: 'Regions', icon: MapPin },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { to: '/admin/nests', label: 'Nests & Eggs', description: 'Game configs', icon: Egg },
      { to: '/admin/marketplace', label: 'Marketplace', description: 'FiveM catalog', icon: Store },
      { to: '/admin/settings', label: 'Settings', description: 'Panel options', icon: Settings },
    ],
  },
];

const clientLinks = [
  { to: '/servers', label: 'My servers', icon: Server },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { branding } = useBranding();

  const sidebar = (
    <>
      <div className="border-b border-[var(--border)] px-3 py-3">
        <BrandMark name={branding.panelName} subtitle={branding.tagline || 'Administration'} logoUrl={branding.logoUrl || undefined} homeTo="/admin" />
      </div>

      <div className="border-b border-[var(--border)] p-2">
        <CommandPaletteButton />
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {adminGroups.map((group) => (
          <SideNavGroup key={group.label} label={group.label}>
            {group.links.map(({ to, label, description, icon, exact }) => (
              <SideNavItem key={to} to={to} end={exact} icon={icon} label={label} description={description} />
            ))}
          </SideNavGroup>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[var(--muted)]">Theme</span>
          <ThemeToggle compact />
        </div>
        <SidebarFooterLink to="/profile" icon={User} label="Your profile" />
        <SidebarFooterLink to="/servers" icon={Server} label="Client area" />
        <button
          type="button"
          onClick={logout}
          className="nav-item group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--danger-bg)]"
          style={{ color: 'var(--danger-fg)' }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--danger-bg)' }}>
            <LogOut className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-[13px] font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <MobileShell
      sidebar={sidebar}
      sidebarClassName="admin-sidebar"
      contentClassName="w-full min-w-0"
      headerTitle={
        <BrandMark
          name={branding.panelName}
          subtitle="Administration"
          logoUrl={branding.logoUrl || undefined}
        />
      }
    >
      {children}
    </MobileShell>
  );
}

export function ClientLayout({ children }: { children: ReactNode; wide?: boolean }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const isAdmin = user?.role === 'admin' || user?.rootAdmin;

  const sidebar = (
    <>
      <div className="border-b border-[var(--border)] px-3 py-3">
        <BrandMark name={branding.panelName} subtitle={branding.tagline || 'Game server panel'} logoUrl={branding.logoUrl || undefined} />
      </div>

      <div className="border-b border-[var(--border)] p-2">
        <CommandPaletteButton />
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        <SideNavGroup label="Account">
          {clientLinks.map(({ to, label, icon }) => (
            <SideNavItem key={to} to={to} end={to === '/profile'} icon={icon} label={label} />
          ))}
        </SideNavGroup>

        {isAdmin && (
          <SideNavGroup label="Administration">
            <SideNavItem to="/admin" icon={LayoutDashboard} label="Admin panel" />
          </SideNavGroup>
        )}
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[var(--muted)]">Theme</span>
          <ThemeToggle compact />
        </div>
        {user && (
          <Link
            to="/profile"
            className="nav-item group mb-1 flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-[var(--glass-border)] hover:bg-[var(--surface-hover)]"
          >
            <UserAvatar user={user} size="sm" ring className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{user.username}</span>
              <span className="block truncate text-[11px] text-[var(--muted)]">{user.email}</span>
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={logout}
          className="nav-item group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--danger-bg)]"
          style={{ color: 'var(--danger-fg)' }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--danger-bg)' }}>
            <LogOut className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <MobileShell
      sidebar={sidebar}
      sidebarClassName="client-sidebar"
      contentClassName="w-full min-w-0"
      headerTitle={
        <BrandMark
          name={branding.panelName}
          subtitle={branding.tagline || 'Game servers'}
          logoUrl={branding.logoUrl || undefined}
        />
      }
    >
      {children}
    </MobileShell>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/40 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type ButtonVariant = 'primary' | 'danger' | 'ghost' | 'subtle' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'accent-bg text-[var(--accent-contrast)] hover:opacity-90 shadow-[var(--shadow-sm)]',
  danger: 'text-[var(--accent-contrast)] hover:opacity-90 shadow-[var(--shadow-sm)]',
  success: 'text-[var(--accent-contrast)] hover:opacity-90 shadow-[var(--shadow-sm)]',
  ghost: 'border border-[var(--border)] bg-transparent hover:bg-[var(--surface-hover)] text-[var(--text)]',
  subtle: 'bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text)]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-[13px] gap-1.5',
  lg: 'px-4 py-2 text-sm gap-2',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  title,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const bgStyle =
    variant === 'danger'
      ? { background: 'var(--danger)' }
      : variant === 'success'
        ? { background: 'var(--success)' }
        : undefined;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={bgStyle}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  variant = 'ghost',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  variant?: 'ghost' | 'subtle';
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === 'subtle'
      ? 'bg-[var(--surface-hover)] hover:bg-[var(--border)]'
      : 'border border-[var(--border)] hover:bg-[var(--surface-hover)]';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:text-[var(--text)] disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

const FIELD_CLASS =
  'w-full min-h-[2.375rem] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 text-[13px] text-[var(--text)] outline-none transition focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] focus:ring-2 focus:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-60';

/** Shared input styling for custom layouts (e.g. startup variable grid). */
export const fieldInputClass = FIELD_CLASS;

const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-[5.5rem] resize-y py-2.5 leading-relaxed`;

export const fieldTextareaClass = TEXTAREA_CLASS;

export function Input({
  label,
  hint,
  className = '',
  ...props
}: { label?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const input = <input {...props} className={`${FIELD_CLASS} ${className}`} />;
  if (!label && !hint) return input;
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium text-[var(--muted)]">{label}</span>}
      {input}
      {hint && <p className="text-[11px] text-[var(--muted)]">{hint}</p>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className = '',
  ...props
}: { label?: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textarea = <textarea {...props} className={`${TEXTAREA_CLASS} ${className}`} />;
  if (!label && !hint) return textarea;
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium text-[var(--muted)]">{label}</span>}
      {textarea}
      {hint && <p className="text-[11px] text-[var(--muted)]">{hint}</p>}
    </label>
  );
}

export function Select({
  label,
  children,
  hint,
  className = '',
  ...props
}: { label: string; hint?: string; className?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <SelectControl className={className} {...props}>
        {children}
      </SelectControl>
      {hint && <p className="text-[11px] text-[var(--muted)]">{hint}</p>}
    </label>
  );
}

export function FilterSelect({
  children,
  className = '',
  ...props
}: { className?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <SelectControl controlSize="sm" variant="filter" className={`w-full min-w-0 sm:w-auto sm:min-w-[9.5rem] ${className}`} {...props}>
      {children}
    </SelectControl>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            {headers.map((h) => (
              <th key={h} className="pb-3 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)]/50">
              {row.map((cell, j) => (
                <td key={j} className="py-3 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
