import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Egg,
  LayoutDashboard,
  LogOut,
  HardDrive,
  LifeBuoy,
  MapPin,
  Megaphone,
  Server,
  Settings,
  Store,
  Puzzle,
  User,
  Users,
  Globe,
} from 'lucide-react';
import { Search } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { isFullPanelAdmin, isStaffOrPanelAdmin } from '../lib/roles';
import { useBranding } from '../context/BrandingContext';
import {
  adminSidebarClassName,
  clientSidebarClassName,
  normalizeAppearance,
} from '../lib/branding-appearance';
import { BrandMark, SideNavGroup, SideNavItem, SidebarFooterLink } from './Nav';
import { ThemeToggle } from './ThemeToggle';
import { MobileShell } from './MobileShell';
import { SelectControl } from './SelectControl';
import { AuthorAttribution } from './AuthorAttribution';
import { InstallAppButton } from './InstallAppButton';
import { RouteErrorBoundary } from './ErrorBoundary';

export { SelectControl } from './SelectControl';

function CommandPaletteButton() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      className="ds-btn ds-btn--secondary ds-btn--sm flex w-full justify-start text-left text-[var(--muted)] hover:text-[var(--text)]"
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
      { to: '/admin/tickets', label: 'Support', description: 'User tickets', icon: LifeBuoy },
      { to: '/admin/announce', label: 'Announce', description: 'User messages', icon: Megaphone },
    ],
  },
  {
    label: 'Management',
    links: [
      { to: '/admin/users', label: 'Users', description: 'Accounts & roles', icon: Users },
      { to: '/admin/servers', label: 'Servers', description: 'All game servers', icon: Server },
      { to: '/admin/domains', label: 'Subdomains', description: 'Cloudflare DNS', icon: Globe },
      { to: '/admin/nodes', label: 'Nodes', description: 'Wings & capacity', icon: HardDrive },
      { to: '/admin/locations', label: 'Locations', description: 'Regions', icon: MapPin },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { to: '/admin/nests', label: 'Nests & Eggs', description: 'Game configs', icon: Egg },
      { to: '/admin/plugins', label: 'Plugins', description: 'Panel features & catalogs', icon: Puzzle },
      { to: '/admin/settings', label: 'Settings', description: 'Panel options', icon: Settings },
    ],
  },
];

const clientLinks = [
  { to: '/servers', label: 'My servers', icon: Server },
];

export function AdminLayout({ children, fillHeight }: { children: ReactNode; fillHeight?: boolean }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const fullAdmin = isFullPanelAdmin(user);

  const visibleAdminGroups = adminGroups
    .map((group) => {
      if (group.label !== 'Configuration') return group;
      if (fullAdmin) return group;
      return {
        ...group,
        links: group.links.filter((link) => link.to === '/admin/nests'),
      };
    })
    .filter((group) => group.links.length > 0);

  const sidebar = (
    <>
      <div className="border-b border-[var(--border)] px-3 py-3">
        <BrandMark name={branding.panelName} subtitle={branding.tagline || 'Administration'} logoUrl={branding.logoUrl || undefined} homeTo="/admin" />
      </div>

      <div className="border-b border-[var(--border)] p-2">
        <CommandPaletteButton />
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {visibleAdminGroups.map((group) => (
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
        <SidebarFooterLink to="/servers" icon={Server} label="Client area" />
        <InstallAppButton />
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
        <AuthorAttribution className="mt-3 border-t border-[var(--border)] pt-2" />
      </div>
    </>
  );

  return (
    <MobileShell
      sidebar={sidebar}
      sidebarClassName={adminSidebarClassName(appearance.adminSidebarStyle)}
      contentClassName="w-full min-w-0"
      fillHeight={fillHeight}
      headerTitle={
        <BrandMark
          name={branding.panelName}
          subtitle="Administration"
          logoUrl={branding.logoUrl || undefined}
        />
      }
    >
      <RouteErrorBoundary fallbackTitle="This admin page failed to load">{children}</RouteErrorBoundary>
    </MobileShell>
  );
}

export function ClientLayout({ children, fillHeight }: { children: ReactNode; wide?: boolean; fillHeight?: boolean }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const isAdmin = isStaffOrPanelAdmin(user);

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
            <SideNavItem key={to} to={to} end={to === '/servers'} icon={icon} label={label} />
          ))}
          {branding.ticketsEnabled !== false ? (
            <SideNavItem to="/tickets" icon={LifeBuoy} label="Support" />
          ) : null}
          <SideNavItem to="/profile" end icon={User} label="Profile" />
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
        <InstallAppButton />
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
        <AuthorAttribution className="mt-3 border-t border-[var(--border)] pt-2" />
      </div>
    </>
  );

  return (
    <MobileShell
      sidebar={sidebar}
      sidebarClassName={clientSidebarClassName(appearance.clientSidebarStyle)}
      contentClassName="w-full min-w-0"
      fillHeight={fillHeight}
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

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ds-page ${className}`}>{children}</div>;
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-card">
      <div className="ds-card-header">
        <h2 className="ds-card-title">{title}</h2>
        {action}
      </div>
      <div className="ds-card-body">{children}</div>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'subtle' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'ds-btn--primary',
  secondary: 'ds-btn--secondary',
  danger: 'ds-btn--danger',
  success: 'ds-btn--success',
  ghost: 'ds-btn--ghost',
  subtle: 'ds-btn--subtle',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'ds-btn--sm',
  md: 'ds-btn--md',
  lg: 'ds-btn--lg',
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
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`ds-btn ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
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
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`ds-icon-btn ${variant === 'ghost' ? 'ds-icon-btn--bordered' : ''} disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

const FIELD_CLASS = 'ds-field';

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
    <label className="block">
      {label && <span className="ds-label">{label}</span>}
      {input}
      {hint && <p className="ds-field-hint">{hint}</p>}
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
    <label className="block">
      {label && <span className="ds-label">{label}</span>}
      {textarea}
      {hint && <p className="ds-field-hint">{hint}</p>}
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
    <label className="block">
      <span className="ds-label">{label}</span>
      <SelectControl className={className} {...props}>
        {children}
      </SelectControl>
      {hint && <p className="ds-field-hint">{hint}</p>}
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
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
