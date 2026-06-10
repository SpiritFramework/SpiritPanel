export type InstallPhase = 'idle' | 'installing' | 'completed';

const RUNNING = new Set(['running']);
const STARTING = new Set(['starting', 'start']);
const STOPPING = new Set(['stopping', 'stop']);
const OFFLINE = new Set(['offline', 'stopped']);
const CRASHED = new Set(['crashed', 'crash']);

export function normalizeRuntimeState(raw: string | null | undefined): string {
  if (!raw) return 'offline';
  return raw.toLowerCase().replace(/\s+/g, '_');
}

export function isServerRunning(state: string | null | undefined): boolean {
  return !!state && RUNNING.has(normalizeRuntimeState(state));
}

export interface RuntimeStatsHint {
  state?: string;
  cpu?: number;
  memoryBytes?: number;
  uptime?: number;
}

/** Prefer explicit Wings state; infer running when stats show an active container. */
export function resolveEffectiveRuntimeState(
  current: string,
  stats: RuntimeStatsHint | null | undefined,
): string {
  const normalizedCurrent = normalizeRuntimeState(current);
  const fromStats = stats?.state ? normalizeRuntimeState(stats.state) : null;

  if (isServerRunning(normalizedCurrent) && fromStats && STARTING.has(fromStats)) {
    return normalizedCurrent;
  }

  if (fromStats && isServerRunning(fromStats)) return fromStats;
  if (fromStats && OFFLINE.has(fromStats)) return fromStats;
  if (fromStats && CRASHED.has(fromStats)) return fromStats;
  if (fromStats && STOPPING.has(fromStats)) return fromStats;

  if (statsIndicatesRunning(stats)) {
    if (!fromStats || STARTING.has(fromStats)) return 'running';
  }

  if (fromStats) return fromStats;
  return normalizeRuntimeState(current);
}

function statsIndicatesRunning(stats: RuntimeStatsHint | null | undefined): boolean {
  if (!stats) return false;
  return (
    (stats.uptime ?? 0) > 0 ||
    (stats.memoryBytes ?? 0) > 512_000 ||
    (stats.cpu ?? 0) > 0.05
  );
}

export function isServerInstalling(
  server: { status?: string; installStatus?: string },
): boolean {
  return server.status === 'installing' || server.installStatus === 'installing';
}

export interface ConsoleStatusSummary {
  label: string;
  hint?: string;
  tone: 'success' | 'warning' | 'danger' | 'muted' | 'info';
  pulse?: boolean;
}

/** Single console header status — avoids duplicate Installing / Connected / Offline pills. */
export function getConsoleStatusSummary(
  server: { status: string; installStatus?: string; suspended: boolean; containerState?: string | null },
  connectionStatus: 'connecting' | 'connected' | 'disconnected',
  runtimeState: string,
): ConsoleStatusSummary {
  if (server.suspended) {
    return { label: 'Suspended', tone: 'warning' };
  }

  if (isServerInstalling(server)) {
    const hint =
      connectionStatus === 'connected'
        ? 'Watching install output'
        : connectionStatus === 'connecting'
          ? 'Connecting to console…'
          : 'Console disconnected';
    return { label: 'Installing', hint, tone: 'info' };
  }

  const { label, tone } = mergePanelAndRuntimeStatus(
    server.status,
    server.installStatus,
    runtimeState,
    connectionStatus === 'connected',
    server.containerState,
  );

  if (connectionStatus === 'connecting') {
    return { label, hint: 'Connecting…', tone };
  }
  if (connectionStatus === 'disconnected' && tone === 'muted') {
    return { label, hint: 'Console offline', tone };
  }
  if (connectionStatus === 'connected' && tone === 'success') {
    return { label, tone, pulse: true };
  }

  return { label, tone, pulse: tone === 'info' && connectionStatus === 'connected' };
}

export function formatRuntimeStateLabel(state: string | null | undefined): string {
  const s = normalizeRuntimeState(state);
  const labels: Record<string, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    offline: 'Offline',
    stopped: 'Stopped',
    crashed: 'Crashed',
    installing: 'Installing',
  };
  return labels[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function runtimeStateTone(state: string | null | undefined): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  const s = normalizeRuntimeState(state);
  if (RUNNING.has(s)) return 'success';
  if (STARTING.has(s) || s === 'installing') return 'warning';
  if (CRASHED.has(s)) return 'danger';
  if (STOPPING.has(s)) return 'warning';
  return 'muted';
}

export interface ServerStatusFields {
  status: string;
  suspended?: boolean;
  installStatus?: string;
  containerState?: string | null;
}

export type ServerDisplayTone = 'success' | 'warning' | 'danger' | 'muted' | 'info';

export interface ServerDisplayStatus {
  label: string;
  tone: ServerDisplayTone;
  pulse: boolean;
}

/** Resolve the user-facing status label/tone from panel DB fields + optional live websocket state. */
export function getServerDisplayStatus(
  server: ServerStatusFields,
  options?: { runtimeState?: string | null; wsConnected?: boolean },
): ServerDisplayStatus {
  if (server.suspended) {
    return { label: 'Suspended', tone: 'warning', pulse: false };
  }

  const { label, tone } = mergePanelAndRuntimeStatus(
    server.status,
    server.installStatus,
    options?.runtimeState ?? server.containerState ?? null,
    options?.wsConnected ?? false,
    server.containerState,
  );

  return {
    label,
    tone,
    pulse: tone === 'success' || tone === 'info',
  };
}

export function isServerEffectivelyRunning(server: ServerStatusFields): boolean {
  if (server.suspended) return false;
  return getServerDisplayStatus(server).tone === 'success';
}

export function isServerEffectivelyInstalling(server: ServerStatusFields): boolean {
  if (server.suspended) return false;
  return getServerDisplayStatus(server).label === 'Installing';
}

export function matchesServerStatusFilter(
  server: ServerStatusFields,
  filter: 'all' | 'running' | 'suspended' | 'installing',
): boolean {
  if (filter === 'all') return true;
  if (filter === 'suspended') return Boolean(server.suspended);
  if (filter === 'running') return isServerEffectivelyRunning(server);
  if (filter === 'installing') return isServerEffectivelyInstalling(server);
  return true;
}

export function mergePanelAndRuntimeStatus(
  panelStatus: string,
  installStatus: string | undefined,
  runtimeState: string | null,
  wsConnected: boolean,
  persistedContainerState?: string | null,
): { label: string; tone: ServerDisplayTone } {
  if (panelStatus === 'suspended') return { label: 'Suspended', tone: 'warning' };
  if (panelStatus === 'restoring_backup') return { label: 'Restoring backup', tone: 'info' };

  const effective = resolveEffectiveDisplayState(runtimeState, wsConnected, persistedContainerState, {
    panelStatus,
    installStatus,
  });

  if (installStatus === 'installing' || panelStatus === 'installing' || effective === 'installing') {
    return { label: 'Installing', tone: 'info' };
  }

  // Active runtime states (running, crashed, stopping, etc.)
  if (effective && !isInactiveRuntimeState(effective) && effective !== 'installing') {
    return { label: formatRuntimeStateLabel(effective), tone: runtimeStateTone(effective) };
  }

  // Stale install-failed DB flags on an otherwise healthy server → Offline, not Install failed.
  const staleInstallOnHealthyPanel =
    panelStatus === 'normal' &&
    installStatus !== 'installed' &&
    (installStatus === 'failed' || effective === 'install_failed');

  if (staleInstallOnHealthyPanel) {
    return { label: 'Offline', tone: 'muted' };
  }

  if (panelStatus === 'install_failed' || installStatus === 'failed') {
    return { label: 'Install failed', tone: 'danger' };
  }

  if (effective) {
    return { label: formatRuntimeStateLabel(effective), tone: runtimeStateTone(effective) };
  }

  if (panelStatus === 'normal') return { label: 'Offline', tone: 'muted' };
  return { label: formatRuntimeStateLabel(panelStatus), tone: runtimeStateTone(panelStatus) };
}

function resolveEffectiveDisplayState(
  runtimeState: string | null,
  wsConnected: boolean,
  persistedContainerState?: string | null,
  context?: { panelStatus?: string; installStatus?: string },
): string | null {
  if (wsConnected && runtimeState) return normalizeRuntimeState(runtimeState);

  if (persistedContainerState) {
    const normalized = normalizeRuntimeState(persistedContainerState);
    // Stale install_failed in DB while panel record is healthy — ignore without websocket.
    if (
      !wsConnected &&
      normalized === 'install_failed' &&
      (context?.panelStatus === 'normal' || context?.installStatus === 'installed')
    ) {
      return null;
    }
    return normalized;
  }

  if (runtimeState) return normalizeRuntimeState(runtimeState);
  return null;
}

function isInactiveRuntimeState(state: string): boolean {
  const s = normalizeRuntimeState(state);
  return OFFLINE.has(s) || s === 'install_failed';
}
