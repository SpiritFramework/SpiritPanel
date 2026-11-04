import { Play, RotateCw, Skull, Square, type LucideIcon } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { useServer } from '../../context/ServerContext';
import { getServerAccess } from '../../lib/server-access';
import { normalizeAppearance, serverSidebarClassName, sidebarMaterialClassName } from '../../lib/branding-appearance';
import { prefetchServerTab } from '../../lib/prefetch-server-tabs';
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
  onPower,
  startBlockedForInstall = false,
  powerLocked = false,
}: {
  navGroups: NavGroup[];
  showPower: boolean;
  powering: string | null;
  onPower: (action: 'start' | 'restart' | 'stop' | 'kill') => void;
  startBlockedForInstall?: boolean;
  powerLocked?: boolean;
}) {
  const { server } = useServer();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const access = getServerAccess(server);
  const disabledReason = powerLocked
    ? 'Unavailable while server is suspended'
    : startBlockedForInstall
      ? 'Unavailable while server is installing'
      : undefined;

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
              <SideNavItem
                key={to}
                to={to}
                icon={icon}
                label={label}
                description={description}
                onPrefetch={() => prefetchServerTab(to)}
              />
            ))}
          </SideNavGroup>
        ))}
      </nav>

      {showPower ? (
        <div className="ds-srv-sidebar-power">
          <p className="ds-srv-sidebar-power-label">Power</p>
          <div className="ds-srv-power-grid">
            {access.canStart ? (
              <PowerButton
                label="Start"
                icon={Play}
                tone="start"
                loading={powering === 'start'}
                disabled={powerLocked || startBlockedForInstall}
                title={disabledReason}
                onClick={() => onPower('start')}
              />
            ) : null}
            {access.canRestart ? (
              <PowerButton
                label="Restart"
                icon={RotateCw}
                tone="neutral"
                loading={powering === 'restart'}
                disabled={powerLocked}
                title={powerLocked ? disabledReason : undefined}
                onClick={() => onPower('restart')}
              />
            ) : null}
            {access.canStop ? (
              <PowerButton
                label="Stop"
                icon={Square}
                tone="stop"
                loading={powering === 'stop'}
                disabled={powerLocked}
                title={powerLocked ? disabledReason : undefined}
                onClick={() => onPower('stop')}
              />
            ) : null}
            {access.canStop ? (
              <PowerButton
                label="Kill"
                icon={Skull}
                tone="kill"
                loading={powering === 'kill'}
                disabled={powerLocked}
                title={powerLocked ? disabledReason : undefined}
                onClick={() => onPower('kill')}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="ds-srv-sidebar-footer border-t border-[var(--border)] p-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[var(--muted)]">Theme</span>
          <ThemeToggle cycle />
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
  title,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone: 'start' | 'neutral' | 'stop' | 'kill';
  loading: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      title={title ?? label}
      onClick={onClick}
      className={`ds-srv-power-btn ds-srv-power-btn--${tone}${loading ? ' ds-srv-power-btn--loading' : ''}`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0${loading ? ' animate-spin' : ''}`} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
