import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  CalendarClock,
  Database,
  FolderOpen,
  History,
  Network,
  Play,
  RotateCw,
  Settings,
  Settings2,
  Skull,
  Square,
  Terminal,
  Users,
  Store,
  Package,
} from 'lucide-react';
import { useState } from 'react';
import { ServerProvider, useServer } from '../context/ServerContext';
import { useAdminSupport } from '../context/AdminSupportContext';
import { formatAllocationAddress } from '../lib/allocation';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';
import { getServerTheme } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { getServerAccess } from '../lib/server-access';
import { isServerRunning, normalizeRuntimeState, shouldBlockStartForInstall } from '../lib/server-runtime';
import type { ServerAccessFlags } from '../lib/api';
import { ServerLiveProvider, useServerLiveOptional } from '../context/ServerLiveContext';
import { useServerPing } from '../hooks/useServerPing';
import { useServerPlayerCount } from '../hooks/useServerPlayerCount';
import { CompactBackLink, TabNavItem } from './Nav';
import { PowerConfirmModal, type DestructivePowerAction } from './PowerConfirmModal';
import { ServerOverviewBar } from './server/ServerOverviewBar';
import { ServerSidebar } from './server/ServerSidebar';
import { AmbientBackdrop } from './AmbientBackdrop';
import { AlertBanner, Spinner } from './ui';
import { isFiveMServer, isMinecraftServer } from '../lib/server-eggs';
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
        description: 'Scripts & resources',
        icon: Store,
        accessKey: 'canReadFiles',
        when: (s) => isFiveMServer(s) && s.marketplaceEnabled !== false,
      },
      {
        to: 'plugins',
        label: 'Plugins',
        description: 'Minecraft plugins & mods',
        icon: Package,
        accessKey: 'canReadFiles',
        when: (s) => isMinecraftServer(s) && s.minecraftPluginsEnabled !== false,
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
  const installPhase = live?.installPhase ?? 'idle';
  const startBlockedForInstall = shouldBlockStartForInstall(server, {
    runtimeState,
    installPhase,
  });
  const serverOnline = !server.suspended && isServerRunning(runtimeState);
  const { ping, state: pingState } = useServerPing(server.id, serverOnline);
  const uptimeMs = live?.uptimeMs ?? null;
  const playerCount = useServerPlayerCount(server, runtimeState);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });
  const backTo = adminSupport?.backTo ?? '/servers';
  const backLabel = adminSupport ? 'Admin' : 'Servers';

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function requestPower(action: 'start' | 'restart' | 'stop' | 'kill') {
    setPowerNotice('');
    if (action === 'start' && startBlockedForInstall) {
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
    // Close confirm immediately — Kill must not sit on "Sending…" while Wings soft-stop is wedged.
    setPowerConfirm(null);
    setPowering(action);
    try {
      await power(action);
      setPowerNotice('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Power action failed';
      setPowerNotice(message);
    } finally {
      setPowering(null);
    }
  }

  const showPower = access.canStart || access.canStop || access.canRestart;

  return (
    <>
    <div className={`flex h-[100dvh] w-full max-w-[100vw] overflow-x-hidden overflow-y-hidden ${panelBgClass}`}>
      <ServerSidebar
        navGroups={navGroups}
        showPower={showPower}
        powering={powering}
        powerNotice={powerNotice}
        onPower={requestPower}
        startBlockedForInstall={startBlockedForInstall}
      />

      {/* Main content */}
      <div className="server-shell-main flex min-h-0 min-w-0 flex-1 flex-col">
        <AmbientBackdrop variant="dense" />
        {/* Mobile header + tabs */}
        <header className="server-mobile-header relative z-[1] glass safe-top border-x-0 border-t-0 border-b border-[var(--glass-border)] md:hidden">
          {isConsoleRoute ? (
            <div className="server-mobile-console-bar">
              <CompactBackLink to={backTo} label={backLabel} />
              <div
                className="server-mobile-console-mark"
                style={{ background: theme.gradient }}
                aria-hidden
              >
                <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-snug">{server.name}</p>
                <p className="truncate text-[10px] leading-snug text-[var(--muted)]">Console</p>
              </div>
            </div>
          ) : (
            <div className={`${isFullHeightRoute ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
              <div className="flex items-center gap-2.5">
                <CompactBackLink to={backTo} label={backLabel} className="!px-2 !py-1.5" />
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
                  style={{ background: theme.gradient }}
                >
                  <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm font-semibold leading-snug">{server.name}</h1>
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-[var(--muted)]">{server.egg.name}</p>
                </div>
              </div>
            </div>
          )}
          <div className="nav-tabs-scroll-hint">
            <nav
              className={`nav-tabs-scroll flex gap-1 overflow-x-auto px-2 py-1.5 ${
                isConsoleRoute ? '' : 'border-t border-[var(--border)]'
              }`}
              aria-label="Server sections"
            >
              {navItems.map(({ to, label, icon }) => (
                <TabNavItem key={to} to={to} icon={icon} label={label} />
              ))}
            </nav>
          </div>
          {showPower && (isConsoleRoute || !isFullHeightRoute) ? (
            <MobilePowerBar
              access={access}
              powering={powering}
              powerNotice={powerNotice}
              onPower={requestPower}
              startBlockedForInstall={startBlockedForInstall}
              iconsOnly={isConsoleRoute}
            />
          ) : null}
        </header>

        {/* Overview bar: hide on console phones — metrics live in the console header on desktop */}
        <div className={isConsoleRoute ? 'hidden md:block' : undefined}>
          <ServerOverviewBar
            themeGradient={theme.gradient}
            address={address}
            copied={copied}
            onCopyAddress={copyAddress}
            ping={ping}
            pingState={pingState}
            uptimeMs={uptimeMs}
            uptimeLive={serverOnline}
            playerOnline={playerCount.online}
            playerMax={playerCount.max}
            playerLoading={playerCount.loading}
            playerLive={playerCount.running}
            playerUnavailable={playerCount.unavailable}
            compact={isFullHeightRoute}
          />
        </div>

        {server.nodeReachable === false ? (
          <AlertBanner
            tone="warning"
            className={`relative z-[1] mx-3 mt-2 md:mx-5 md:mt-0${isConsoleRoute ? ' hidden md:flex' : ''}`}
          >
            Host node is unreachable — status and console may be stale until FeatherWings reconnects.
          </AlertBanner>
        ) : null}

        <main
          className={`server-shell-content relative z-[1] min-h-0 flex-1 md:p-5 ${
            isConsoleRoute
              ? 'flex flex-col overflow-hidden p-0 safe-bottom md:p-5 md:pb-5'
              : isFullHeightRoute
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

function PowerButton({
  label,
  icon: Icon,
  variant,
  loading,
  disabled,
  onClick,
  compact,
  iconsOnly,
}: {
  label: string;
  icon: typeof Play;
  variant: 'start' | 'restart' | 'stop';
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
  iconsOnly?: boolean;
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
      aria-label={label}
      onClick={onClick}
      style={styleByVariant[variant]}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold shadow-sm transition hover:-translate-y-px hover:brightness-110 disabled:opacity-50 ${
        iconsOnly
          ? 'min-h-10 px-2 py-2'
          : compact
            ? 'min-h-11 px-2.5 py-2.5 text-xs'
            : 'px-2 py-2 text-[11px]'
      } ${classByVariant[variant]}`}
    >
      <Icon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {iconsOnly ? null : <span>{label}</span>}
    </button>
  );
}

function MobilePowerBar({
  access,
  powering,
  powerNotice,
  onPower,
  startBlockedForInstall = false,
  iconsOnly = false,
}: {
  access: ReturnType<typeof getServerAccess>;
  powering: string | null;
  powerNotice: string;
  onPower: (action: 'start' | 'restart' | 'stop' | 'kill') => void;
  startBlockedForInstall?: boolean;
  iconsOnly?: boolean;
}) {
  return (
    <div className={`border-t border-[var(--border)] ${iconsOnly ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
      {powerNotice ? (
        <p
          className="mb-2 rounded-md border px-2.5 py-2 text-xs leading-relaxed"
          style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)', color: 'var(--info-fg)' }}
        >
          {powerNotice}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {access.canStart ? (
          <PowerButton
            label="Start"
            icon={Play}
            variant="start"
            compact
            iconsOnly={iconsOnly}
            loading={powering === 'start'}
            disabled={startBlockedForInstall}
            onClick={() => onPower('start')}
          />
        ) : null}
        {access.canRestart ? (
          <PowerButton
            label="Restart"
            icon={RotateCw}
            variant="restart"
            compact
            iconsOnly={iconsOnly}
            loading={powering === 'restart'}
            onClick={() => onPower('restart')}
          />
        ) : null}
        {access.canStop ? (
          <>
            <PowerButton
              label="Stop"
              icon={Square}
              variant="stop"
              compact
              iconsOnly={iconsOnly}
              loading={powering === 'stop'}
              onClick={() => onPower('stop')}
            />
            <PowerButton
              label="Kill"
              icon={Skull}
              variant="stop"
              compact
              iconsOnly={iconsOnly}
              loading={powering === 'kill'}
              onClick={() => onPower('kill')}
            />
          </>
        ) : null}
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
