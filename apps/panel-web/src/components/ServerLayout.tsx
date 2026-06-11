import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  CalendarClock,
  Copy,
  Database,
  FolderOpen,
  History,
  Network,
  Play,
  RotateCw,
  Server,
  Settings,
  Settings2,
  Skull,
  Square,
  Terminal,
  Users,
  Store,
} from 'lucide-react';
import { useState } from 'react';
import { ServerProvider, useServer } from '../context/ServerContext';
import { formatAllocationAddress } from '../lib/allocation';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';
import { getServerTheme } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { getServerAccess } from '../lib/server-access';
import { isServerInstalling, isServerRunning, normalizeRuntimeState } from '../lib/server-runtime';
import type { ServerAccessFlags } from '../lib/api';
import { ServerLiveProvider, useServerLiveOptional } from '../context/ServerLiveContext';
import { useServerPing } from '../hooks/useServerPing';
import { CompactBackLink, SideNavGroup, SideNavItem, TabNavItem } from './Nav';
import { PowerConfirmModal, type DestructivePowerAction } from './PowerConfirmModal';
import { ServerMetricsNav } from './ServerMetricsNav';
import { Spinner } from './ui';
import { ServerStatusBadge } from './ServerStatusBadge';
import { ThemeToggle } from './ThemeToggle';
import { useAdminSupport } from '../context/AdminSupportContext';
import { isFiveMServer } from '../lib/server-eggs';
import type { ServerDetail } from '../lib/api';

const serverNavGroups: Array<{
  label: string;
  items: Array<{
    to: string;
    label: string;
    description?: string;
    icon: typeof Terminal;
    accessKey: keyof ServerAccessFlags;
    always?: boolean;
    when?: (server: ServerDetail) => boolean;
  }>;
}> = [
  {
    label: 'Server',
    items: [
      { to: 'console', label: 'Console', description: 'Live output & commands', icon: Terminal, accessKey: 'canConsole' },
      { to: 'analytics', label: 'Analytics', description: 'CPU, RAM & disk charts', icon: BarChart3, accessKey: 'canConsole' },
      { to: 'activity', label: 'Activity', description: 'Audit log', icon: History, accessKey: 'canConsole', always: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: 'files', label: 'Files', description: 'Browse & edit', icon: FolderOpen, accessKey: 'canReadFiles' },
      { to: 'backups', label: 'Backups', description: 'Snapshots', icon: Archive, accessKey: 'canReadBackups' },
      { to: 'databases', label: 'Databases', description: 'MySQL', icon: Database, accessKey: 'canReadDatabases' },
      { to: 'schedules', label: 'Schedules', description: 'Automation', icon: CalendarClock, accessKey: 'canReadSchedules' },
      {
        to: 'marketplace',
        label: 'Marketplace',
        description: 'FiveM scripts & maps',
        icon: Store,
        accessKey: 'canReadFiles',
        when: (s) => isFiveMServer(s) && s.marketplaceEnabled !== false,
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: 'network', label: 'Network', description: 'Ports & SFTP', icon: Network, accessKey: 'canReadAllocations' },
      { to: 'startup', label: 'Startup', description: 'Command & variables', icon: Settings2, accessKey: 'canReadStartup' },
      { to: 'settings', label: 'Settings', description: 'Details & reinstall', icon: Settings, accessKey: 'canUpdateSettings' },
    ],
  },
  {
    label: 'Access',
    items: [{ to: 'users', label: 'Subusers', description: 'Permissions', icon: Users, accessKey: 'canManageSubusers' }],
  },
];

function filterNavItems(access: ServerAccessFlags, server: ServerDetail) {
  return serverNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.when && !item.when(server)) return false;
        return item.always || Boolean(access[item.accessKey]);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function ServerShellInner() {
  const { server, power } = useServer();
  const adminSupport = useAdminSupport();
  const location = useLocation();
  const access = getServerAccess(server);
  const navGroups = filterNavItems(access, server);
  const navItems = navGroups.flatMap((group) => group.items);
  const isConsoleRoute = /\/console\/?$/.test(location.pathname);
  const isFileEditRoute = /\/files\/edit\/?$/.test(location.pathname);
  const isFullHeightRoute = isConsoleRoute || isFileEditRoute;
  const theme = getServerTheme(server.egg.name);
  const panelBgClass = usePanelBackgroundClass();
  const [copied, setCopied] = useState(false);
  const [powering, setPowering] = useState<string | null>(null);
  const [powerNotice, setPowerNotice] = useState('');
  const [powerConfirm, setPowerConfirm] = useState<DestructivePowerAction | null>(null);
  const live = useServerLiveOptional();
  const runtimeState = live?.runtimeState ?? normalizeRuntimeState(server.containerState ?? 'offline');
  const serverOnline = !server.suspended && isServerRunning(runtimeState);
  const { ping, state: pingState } = useServerPing(server.id, serverOnline);
  const uptimeMs = live?.uptimeMs ?? null;
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function requestPower(action: 'start' | 'restart' | 'stop' | 'kill') {
    setPowerNotice('');
    if (action === 'start' && isServerInstalling(server)) {
      setPowerNotice(
        'This server is still installing. Wait for installation to finish — you can watch progress on the Console tab.',
      );
      return;
    }
    if (action === 'stop' || action === 'restart' || action === 'kill') {
      setPowerConfirm(action);
      return;
    }
    void executePower(action);
  }

  async function executePower(action: 'start' | 'restart' | 'stop' | 'kill') {
    setPowering(action);
    try {
      await power(action);
      setPowerConfirm(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Power action failed';
      if (message.toLowerCase().includes('installing')) {
        setPowerNotice(message);
        setPowerConfirm(null);
      }
    } finally {
      setPowering(null);
    }
  }

  const showPower = access.canStart || access.canStop || access.canRestart;

  return (
    <>
    <div className={`flex h-[100dvh] w-full max-w-[100vw] overflow-x-hidden overflow-y-hidden ${panelBgClass}`}>
      {/* Dedicated server sidebar — navigation only */}
      <aside className="server-sidebar glass-sidebar hidden h-full w-56 shrink-0 flex-col border-r border-[var(--glass-border)] md:flex">
        <div className="border-b border-[var(--border)] p-3">
          <div className="mb-2.5 h-0.5 rounded-full" style={{ background: theme.gradient }} />
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/15 shadow-[0_6px_18px_-6px_var(--card-glow,var(--accent-glow))]"
              style={{ background: theme.gradient, '--card-glow': theme.glow } as React.CSSProperties}
            >
              <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold leading-tight">{server.name}</h1>
              <p className="truncate text-[11px] text-[var(--muted)]">{server.egg.name}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navGroups.map((group) => (
            <SideNavGroup key={group.label} label={group.label}>
              {group.items.map(({ to, label, description, icon }) => (
                <SideNavItem key={to} to={to} icon={icon} label={label} description={description} />
              ))}
            </SideNavGroup>
          ))}
        </nav>

        {showPower && (
          <div className="border-t border-[var(--border)] p-2.5">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]/60">
              Power
            </p>
            {powerNotice && (
              <p
                className="mb-2 rounded-md border px-2 py-1.5 text-[10px] leading-snug"
                style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)', color: 'var(--info-fg)' }}
              >
                {powerNotice}
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {access.canStart && (
                <PowerButton
                  label="Start"
                  icon={Play}
                  variant="start"
                  loading={powering === 'start'}
                  disabled={isServerInstalling(server)}
                  onClick={() => requestPower('start')}
                />
              )}
              {access.canRestart && (
                <PowerButton label="Restart" icon={RotateCw} variant="restart" loading={powering === 'restart'} onClick={() => requestPower('restart')} />
              )}
              {access.canStop && (
                <PowerButton label="Stop" icon={Square} variant="stop" loading={powering === 'stop'} onClick={() => requestPower('stop')} />
              )}
              {access.canStop && (
                <PowerButton label="Kill" icon={Skull} variant="stop" loading={powering === 'kill'} onClick={() => requestPower('kill')} />
              )}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
          <span className="text-[11px] font-medium text-[var(--muted)]">Theme</span>
          <ThemeToggle compact />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile header + tabs */}
        <header className="server-mobile-header glass safe-top border-x-0 border-t-0 border-b border-[var(--glass-border)] md:hidden">
          <div className={`${isFullHeightRoute ? 'px-2.5 py-2' : 'p-3 pb-2'}`}>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
                style={{ background: theme.gradient }}
              >
                <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold">{server.name}</h1>
                <p className="truncate text-[11px] text-[var(--muted)]">{server.egg.name}</p>
              </div>
            </div>
          </div>
          <div className="nav-tabs-scroll-hint">
            <nav className="nav-tabs-scroll flex gap-1 overflow-x-auto border-t border-[var(--border)] px-3 py-2">
              {navItems.map(({ to, label, icon }) => (
                <TabNavItem key={to} to={to} icon={icon} label={label} />
              ))}
            </nav>
          </div>
          {showPower && !isFullHeightRoute && (
            <MobilePowerBar
              access={access}
              server={server}
              powering={powering}
              powerNotice={powerNotice}
              onPower={requestPower}
            />
          )}
        </header>

        <ServerOverviewBar
          themeGradient={theme.gradient}
          address={address}
          copied={copied}
          onCopyAddress={copyAddress}
          ping={ping}
          pingState={pingState}
          uptimeMs={uptimeMs}
          uptimeLive={serverOnline}
          compact={isFullHeightRoute}
        />

        <main
          className={`min-h-0 flex-1 md:p-5 ${
            isFullHeightRoute
              ? 'flex flex-col overflow-hidden p-2 safe-bottom md:p-5 md:pb-5'
              : 'overflow-y-auto overflow-x-hidden p-3 safe-bottom sm:p-4 md:p-5 md:pb-5'
          }`}
        >
          <div
            className={
              isFullHeightRoute
                ? 'flex min-h-0 w-full flex-1 flex-col'
                : 'w-full min-w-0'
            }
          >
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>

    {powerConfirm && (
      <PowerConfirmModal
        action={powerConfirm}
        serverName={server.name}
        loading={powering === powerConfirm}
        onClose={() => {
          if (powering) return;
          setPowerConfirm(null);
        }}
        onConfirm={() => void executePower(powerConfirm)}
      />
    )}
    </>
  );
}

function ServerOverviewBar({
  themeGradient,
  address,
  copied,
  onCopyAddress,
  ping,
  pingState,
  uptimeMs,
  uptimeLive,
  compact = false,
}: {
  themeGradient: string;
  address: string;
  copied: boolean;
  onCopyAddress: () => void;
  ping: number | null;
  pingState: ReturnType<typeof useServerPing>['state'];
  uptimeMs: number | null;
  uptimeLive: boolean;
  compact?: boolean;
}) {
  const { server } = useServer();
  const adminSupport = useAdminSupport();

  return (
    <div
      className={`server-overview-bar glass shrink-0 border-x-0 border-t-0 border-b border-[var(--glass-border)] ${
        compact ? 'server-overview-bar--compact' : ''
      }`}
    >
      <div className="h-0.5 w-full" style={{ background: themeGradient }} />

      {compact && (
        <div className="server-overview-compact md:hidden">
          <CompactBackLink
            to={adminSupport?.backTo ?? '/servers'}
            label={adminSupport ? 'Admin' : 'Servers'}
          />
          <LiveServerStatus compact />
          <OverviewAddressButton address={address} onCopy={onCopyAddress} className="min-w-0 flex-1" />
        </div>
      )}

      <div className="server-overview-expanded flex flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:gap-x-3 sm:px-4 sm:py-2.5 md:px-5">
        <CompactBackLink
          to={adminSupport?.backTo ?? '/servers'}
          label={adminSupport ? 'Admin server' : 'My servers'}
          className={compact ? 'hidden md:inline-flex' : undefined}
        />

        <OverviewDivider className="hidden sm:block" />

        <OverviewAddressButton address={address} onCopy={onCopyAddress} />

        {copied && <span className="text-[10px] font-medium accent-text">Copied</span>}

        <OverviewDivider className="hidden sm:block" />

        <LiveServerStatus compact />

        <OverviewDivider className="hidden md:block" />

        <div className="hidden sm:contents">
          <ServerMetricsNav
            compact
            ping={ping}
            pingState={pingState}
            uptimeMs={uptimeMs}
            uptimeLive={uptimeLive}
          />
        </div>

        <div className="hidden min-w-0 shrink items-center gap-2 md:ml-auto md:flex">
          <span className="inline-flex max-w-[8rem] min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--bg-elevated)]/40 px-2 py-1 text-[11px] text-[var(--muted)] lg:max-w-[10rem]">
            <Server className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium text-[var(--text)]">{server.node.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewAddressButton({
  address,
  onCopy,
  className = '',
}: {
  address: string;
  onCopy: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`${address} — click to copy`}
      className={`group flex min-w-0 max-w-[8rem] shrink items-center gap-1.5 overflow-hidden rounded-lg border border-[var(--border)]/80 bg-[var(--bg-elevated)]/50 px-2 py-1.5 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--bg-elevated)] sm:max-w-[11rem] md:max-w-[12rem] ${className}`}
    >
      <Network className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] group-hover:accent-text" />
      <span className="min-w-0 truncate font-mono text-[11px] font-medium">{address}</span>
      <Copy className="h-3 w-3 shrink-0 text-[var(--muted)] opacity-60 transition group-hover:opacity-100 group-hover:accent-text" />
    </button>
  );
}

function OverviewDivider({ className = '' }: { className?: string }) {
  return <div className={`h-4 w-px shrink-0 bg-[var(--border)] ${className}`} />;
}

function PowerButton({
  label,
  icon: Icon,
  variant,
  loading,
  disabled,
  onClick,
  compact,
}: {
  label: string;
  icon: typeof Play;
  variant: 'start' | 'restart' | 'stop';
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const styleByVariant = {
    start: { background: 'var(--success-bg)', color: 'var(--success-fg)', borderColor: 'var(--success-border)' },
    restart: undefined,
    stop: { background: 'var(--danger-bg)', color: 'var(--danger-fg)', borderColor: 'var(--danger-border)' },
  } as const;
  const classByVariant = {
    start: 'border',
    restart: 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
    stop: 'border',
  };

  return (
    <button
      type="button"
      disabled={loading || disabled}
      title={disabled ? 'Unavailable while server is installing' : label}
      onClick={onClick}
      style={styleByVariant[variant]}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold shadow-sm transition hover:-translate-y-px hover:brightness-110 disabled:opacity-50 ${compact ? 'min-w-[3.25rem] px-2 py-2 text-[10px]' : 'px-2 py-2 text-[11px]'} ${classByVariant[variant]}`}
    >
      <Icon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {!compact && label}
    </button>
  );
}

function MobilePowerBar({
  access,
  server,
  powering,
  powerNotice,
  onPower,
}: {
  access: ReturnType<typeof getServerAccess>;
  server: ReturnType<typeof useServer>['server'];
  powering: string | null;
  powerNotice: string;
  onPower: (action: 'start' | 'restart' | 'stop' | 'kill') => void;
}) {
  return (
    <div className="border-t border-[var(--border)] px-3 py-2">
      {powerNotice && (
        <p
          className="mb-2 rounded-md border px-2 py-1.5 text-[10px] leading-snug"
          style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)', color: 'var(--info-fg)' }}
        >
          {powerNotice}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {access.canStart && (
          <PowerButton
            label="Start"
            icon={Play}
            variant="start"
            compact
            loading={powering === 'start'}
            disabled={isServerInstalling(server)}
            onClick={() => onPower('start')}
          />
        )}
        {access.canRestart && (
          <PowerButton label="Restart" icon={RotateCw} variant="restart" compact loading={powering === 'restart'} onClick={() => onPower('restart')} />
        )}
        {access.canStop && (
          <>
            <PowerButton label="Stop" icon={Square} variant="stop" compact loading={powering === 'stop'} onClick={() => onPower('stop')} />
            <PowerButton label="Kill" icon={Skull} variant="stop" compact loading={powering === 'kill'} onClick={() => onPower('kill')} />
          </>
        )}
      </div>
    </div>
  );
}

export function ServerLoadingShell() {
  const panelBgClass = usePanelBackgroundClass();
  return (
    <div className={`flex min-h-[100dvh] min-h-screen items-center justify-center ${panelBgClass}`}>
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function ServerNotFoundShell({
  backTo = '/servers',
  backLabel = 'My servers',
  message,
}: {
  backTo?: string;
  backLabel?: string;
  message?: string;
}) {
  const panelBgClass = usePanelBackgroundClass();
  return (
    <div className={`flex min-h-screen flex-col items-center justify-center gap-3 ${panelBgClass} px-4 text-center`}>
      <p className="text-sm text-[var(--muted)]">{message || 'Server not found.'}</p>
      <Link to={backTo} className="text-sm accent-text hover:underline">
        ← Back to {backLabel}
      </Link>
    </div>
  );
}

export function ServerShell() {
  return (
    <ServerProvider loadingFallback={<ServerLoadingShell />} notFoundFallback={<ServerNotFoundShell />}>
      <ServerLiveProvider>
        <ServerShellInner />
      </ServerLiveProvider>
    </ServerProvider>
  );
}

function LiveServerStatus({ compact }: { compact?: boolean }) {
  const { server } = useServer();
  const live = useServerLiveOptional();

  return (
    <ServerStatusBadge
      status={server.status}
      suspended={server.suspended}
      installStatus={server.installStatus}
      containerState={server.containerState}
      runtimeState={live?.runtimeState ?? null}
      wsConnected={live?.connectionStatus === 'connected'}
      compact={compact}
    />
  );
}
