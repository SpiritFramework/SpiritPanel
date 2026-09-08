import { Play, RotateCw, Skull, Square, type LucideIcon } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { useServer } from '../../context/ServerContext';
import { getServerAccess } from '../../lib/server-access';
import { normalizeAppearance, serverSidebarClassName, sidebarMaterialClassName } from '../../lib/branding-appearance';
import { BrandMark, SideNavGroup, SideNavItem } from '../Nav';
import { ThemeToggle } from '../ThemeToggle';

type NavGroup = {
  label: string;
  items: Array<{
    to: string;
    label: string;
    description?: string;
    icon: LucideIcon;
  }>;
};

export function ServerSidebar({
  navGroups,
  showPower,
  powering,
  powerNotice,
  onPower,
  startBlockedForInstall = false,
}: {
  navGroups: NavGroup[];
  showPower: boolean;
  powering: string | null;
  powerNotice: string;
  onPower: (action: 'start' | 'restart' | 'stop' | 'kill') => void;
  startBlockedForInstall?: boolean;
}) {
  const { server } = useServer();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const access = getServerAccess(server);

  return (
    <aside
      className={`ds-srv-sidebar ${serverSidebarClassName(appearance.serverSidebarStyle)} ${sidebarMaterialClassName(appearance.sidebarMaterial)} glass-sidebar !hidden h-full w-56 shrink-0 flex-col border-r border-[var(--glass-border)] md:!flex`}
    >
      <div className="border-b border-[var(--border)] px-3 py-3">
        <BrandMark
          name={branding.panelName}
          subtitle={branding.tagline || 'Game server panel'}
          logoUrl={branding.logoUrl || undefined}
        />
      </div>

      <nav className="ds-srv-sidebar-nav flex-1 overflow-y-auto p-2">
        {navGroups.map((group) => (
          <SideNavGroup key={group.label} label={group.label}>
            {group.items.map(({ to, label, description, icon }) => (
              <SideNavItem key={to} to={to} icon={icon} label={label} description={description} />
            ))}
          </SideNavGroup>
        ))}
      </nav>

      {showPower ? (
        <div className="ds-srv-sidebar-power">
          <p className="ds-srv-sidebar-power-label">Power</p>
          {powerNotice ? <p className="ds-srv-sidebar-power-notice">{powerNotice}</p> : null}
          <div className="ds-srv-power-grid">
            {access.canStart ? (
              <PowerButton
                label="Start"
                icon={Play}
                tone="start"
                loading={powering === 'start'}
                disabled={startBlockedForInstall}
                onClick={() => onPower('start')}
              />
            ) : null}
            {access.canRestart ? (
              <PowerButton
                label="Restart"
                icon={RotateCw}
                tone="neutral"
                loading={powering === 'restart'}
                onClick={() => onPower('restart')}
              />
            ) : null}
            {access.canStop ? (
              <PowerButton
                label="Stop"
                icon={Square}
                tone="stop"
                loading={powering === 'stop'}
                onClick={() => onPower('stop')}
              />
            ) : null}
            {access.canStop ? (
              <PowerButton
                label="Kill"
                icon={Skull}
                tone="kill"
                loading={powering === 'kill'}
                onClick={() => onPower('kill')}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="ds-srv-sidebar-footer border-t border-[var(--border)] p-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[var(--muted)]">Theme</span>
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
}

function PowerButton({
  label,
  icon: Icon,
  tone,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: 'start' | 'neutral' | 'stop' | 'kill';
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      title={disabled ? 'Unavailable while server is installing' : label}
      onClick={onClick}
      className={`ds-srv-power-btn ds-srv-power-btn--${tone}${loading ? ' ds-srv-power-btn--loading' : ''}`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0${loading ? ' animate-spin' : ''}`} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
