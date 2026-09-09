import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, type StatPoint } from '../lib/api';
import { useServerRouteId } from '../hooks/useServerRouteId';

export interface ServerLiveApi {
  websocket: (id: string) => Promise<{ token: string; socket: string }>;
  installLogs: (id: string) => Promise<{ response: string[] }>;
  command: (id: string, command: string) => Promise<unknown>;
}

const clientLiveApi: ServerLiveApi = {
  websocket: (id) => api.client.websocket(id),
  installLogs: (id) => api.client.installLogs(id),
  command: (id, command) => api.client.command(id, command),
};

export const adminLiveApi: ServerLiveApi = {
  websocket: (id) => api.admin.websocket(id),
  installLogs: (id) => api.admin.installLogs(id),
  command: (id, command) => api.admin.command(id, command),
};
import { classifyConsoleLine, formatConsoleLineText } from '../lib/console-messages';
import {
  appendConsoleLine,
  clearConsoleLines,
  consoleLinesToText,
  getConsoleLines,
  type ConsoleLine,
} from '../lib/console-buffer';
import { normalizeRuntimeState, type InstallPhase } from '../lib/server-runtime';
import {
  createWingsWebSocket,
  isServerRunning,
  parseRuntimeState,
  parseStatsPayload,
  requestWingsLogs,
  requestWingsStats,
  resolveEffectiveRuntimeState,
} from '../lib/ws-stats';
import { resolveConsoleCommandTransport } from '../lib/console-command';
import { useServer } from './ServerContext';
import { useToast } from './ToastContext';

export type NodeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface ServerLiveContextValue {
  connectionStatus: NodeConnectionStatus;
  runtimeState: string;
  installPhase: InstallPhase;
  consoleLines: ConsoleLine[];
  liveStats: StatPoint;
  uptimeMs: number | null;
  followScroll: boolean;
  setFollowScroll: (value: boolean) => void;
  clearConsole: () => void;
  downloadConsole: () => void;
  sendCommand: (command: string) => void;
  reconnect: () => void;
}

const ServerLiveContext = createContext<ServerLiveContextValue | null>(null);

function emptyStats(state: string): StatPoint {
  return {
    recordedAt: new Date().toISOString(),
    cpu: 0,
    memoryBytes: 0,
    diskBytes: 0,
    networkRxBytes: 0,
    networkTxBytes: 0,
    state,
  };
}

export function ServerLiveProvider({
  children,
  liveApi = clientLiveApi,
}: {
  children: ReactNode;
  liveApi?: ServerLiveApi;
}) {
  const id = useServerRouteId();
  const { server, refresh } = useServer();
  const toast = useToast();

  const [connectionStatus, setConnectionStatus] = useState<NodeConnectionStatus>('connecting');
  const [runtimeState, setRuntimeState] = useState(() =>
    normalizeRuntimeState(server.containerState ?? 'offline'),
  );
  const [installPhase, setInstallPhase] = useState<InstallPhase>('idle');
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [liveStats, setLiveStats] = useState<StatPoint>(() => emptyStats('offline'));
  const [uptimeMs, setUptimeMs] = useState<number | null>(null);
  const [followScroll, setFollowScroll] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const runtimeRef = useRef(normalizeRuntimeState(server.containerState ?? 'offline'));
  const connectionStatusRef = useRef<NodeConnectionStatus>('connecting');
  const uptimeAnchorRef = useRef<{ ms: number; at: number } | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const statsTimer = useRef<number | null>(null);
  const connectGen = useRef(0);
  const installLogsHydrated = useRef(false);

  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const flushConsole = useCallback(() => {
    if (!id) return;
    flushTimer.current = null;
    setConsoleLines([...getConsoleLines(id)]);
  }, [id]);

  const scheduleConsoleFlush = useCallback(() => {
    if (flushTimer.current != null) return;
    flushTimer.current = requestAnimationFrame(flushConsole);
  }, [flushConsole]);

  const syncLines = useCallback(
    (text: string, kind: ConsoleLine['kind'] = 'stdout') => {
      if (!id) return;
      const formatted = formatConsoleLineText(text);
      const lineKind = classifyConsoleLine(formatted, kind);
      appendConsoleLine(id, formatted, lineKind);
      scheduleConsoleFlush();
    },
    [id, scheduleConsoleFlush],
  );

  const handleRuntimeState = useCallback((state: string | null) => {
    if (!state) return;
    runtimeRef.current = state;
    setRuntimeState(state);
    if (!isServerRunning(state)) {
      uptimeAnchorRef.current = null;
      setUptimeMs(null);
      setLiveStats((prev) => ({
        ...prev,
        recordedAt: new Date().toISOString(),
        cpu: 0,
        memoryBytes: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
        state,
      }));
    }
  }, []);

  useEffect(() => {
    if (!isServerRunning(runtimeState)) return;
    const timer = window.setInterval(() => {
      const anchor = uptimeAnchorRef.current;
      if (!anchor) return;
      setUptimeMs(anchor.ms + (Date.now() - anchor.at));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runtimeState]);

  const connect = useCallback(async () => {
    if (!id) return;
    const gen = ++connectGen.current;

    setConnectionStatus('connecting');
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (statsTimer.current) {
      window.clearInterval(statsTimer.current);
      statsTimer.current = null;
    }

    try {
      const { token, socket } = await liveApi.websocket(id);
      if (gen !== connectGen.current) return;

      wsRef.current?.close();
      const ws = createWingsWebSocket(socket, token);
      wsRef.current = ws;

      ws.onopen = () => setConnectionStatus('connecting');

      ws.onerror = () => setConnectionStatus('disconnected');

      ws.onclose = () => {
        if (gen !== connectGen.current) return;
        if (statsTimer.current) {
          window.clearInterval(statsTimer.current);
          statsTimer.current = null;
        }
        setConnectionStatus('disconnected');
        reconnectTimer.current = window.setTimeout(() => {
          connect();
        }, 4000);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const event = msg.event as string;

          if (event === 'auth success') {
            setConnectionStatus('connected');
            refresh().catch(() => {});
            requestWingsLogs(ws);
            requestWingsStats(ws);
            if (statsTimer.current) window.clearInterval(statsTimer.current);
            statsTimer.current = window.setInterval(() => requestWingsStats(ws), 15_000);
            return;
          }

          if (event === 'token expired' || event === 'jwt error') {
            setConnectionStatus('disconnected');
            syncLines(`Authentication failed: ${msg.args?.[0] ?? event}`, 'error');
            return;
          }

          if (event === 'token expiring') {
            // Refresh in place so the console stays connected instead of
            // tearing down and reconnecting (matches the Pterodactyl client).
            void (async () => {
              if (!id) return;
              try {
                const { token } = await liveApi.websocket(id);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ event: 'auth', args: [token] }));
                }
              } catch {
                if (ws.readyState === WebSocket.OPEN) ws.close();
              }
            })();
            return;
          }

          if (event === 'status') {
            const next = parseRuntimeState(msg.args?.[0]);
            if (next) {
              handleRuntimeState(resolveEffectiveRuntimeState(runtimeRef.current, { state: next }));
            }
            return;
          }

          if (event === 'console output') {
            syncLines(msg.args?.[0] ?? '', 'stdout');
            return;
          }

          if (event === 'install output') {
            setInstallPhase('installing');
            syncLines(msg.args?.[0] ?? '', 'install');
            return;
          }

          if (event === 'install started') {
            setInstallPhase('installing');
            syncLines('— Installation started —', 'system');
            return;
          }

          if (event === 'install completed') {
            setInstallPhase('completed');
            syncLines('— Installation completed —', 'system');
            refresh().catch(() => {});
            return;
          }

          if (event === 'daemon message') {
            syncLines(msg.args?.[0] ?? '', 'system');
            return;
          }

          if (event === 'daemon error') {
            syncLines(msg.args?.[0] ?? 'Daemon error', 'error');
            return;
          }

          if (event === 'stats' && msg.args?.[0] != null) {
            const parsed = parseStatsPayload(msg.args[0]);
            if (!parsed) return;
            const state = resolveEffectiveRuntimeState(runtimeRef.current, parsed);
            handleRuntimeState(state);
            if (isServerRunning(state) && (parsed.uptime ?? 0) > 0) {
              uptimeAnchorRef.current = { ms: parsed.uptime!, at: Date.now() };
              setUptimeMs(parsed.uptime!);
            }
            setLiveStats({
              recordedAt: parsed.recordedAt ?? new Date().toISOString(),
              cpu: isServerRunning(state) ? (parsed.cpu ?? 0) : 0,
              memoryBytes: isServerRunning(state) ? (parsed.memoryBytes ?? 0) : 0,
              diskBytes: parsed.diskBytes ?? 0,
              networkRxBytes: isServerRunning(state) ? (parsed.networkRxBytes ?? 0) : 0,
              networkTxBytes: isServerRunning(state) ? (parsed.networkTxBytes ?? 0) : 0,
              state,
            });
          }
        } catch {
          syncLines(ev.data, 'stdout');
        }
      };
    } catch (e) {
      if (gen !== connectGen.current) return;
      setConnectionStatus('disconnected');
      syncLines(
        `Unable to connect to the node daemon.${e instanceof Error ? ` ${e.message}` : ''}`,
        'error',
      );
      reconnectTimer.current = window.setTimeout(() => connect(), 8000);
    }
  }, [handleRuntimeState, id, liveApi, refresh, syncLines]);

  useEffect(() => {
    if (!id) return;
    clearConsoleLines(id);
    setConsoleLines([]);
    installLogsHydrated.current = false;
    connect();

    return () => {
      connectGen.current += 1;
      if (flushTimer.current != null) cancelAnimationFrame(flushTimer.current);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (statsTimer.current) window.clearInterval(statsTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      clearConsoleLines(id);
    };
  }, [id, connect]);

  useEffect(() => {
    if (server.status === 'installing' || server.installStatus === 'installing') {
      setInstallPhase('installing');
    } else if (server.installStatus === 'installed' && installPhase === 'completed') {
      setInstallPhase('idle');
    }
  }, [server.installStatus, server.status, installPhase]);

  useEffect(() => {
    const persisted = normalizeRuntimeState(server.containerState ?? 'offline');
    const current = runtimeRef.current;
    const transitional = persisted === 'stopping' || persisted === 'starting';
    const liveSettled =
      current === 'offline' ||
      current === 'stopped' ||
      current === 'running' ||
      current === 'crashed';

    // Never let a stale DB "stopping/starting" clobber live WS truth (e.g. already offline).
    if (transitional && liveSettled) return;

    const activePersisted =
      persisted === 'running' ||
      persisted === 'starting' ||
      persisted === 'installing' ||
      persisted === 'stopping' ||
      persisted === 'crashed';

    if (activePersisted && (current === 'offline' || current === 'stopped' || persisted !== current)) {
      runtimeRef.current = persisted;
      setRuntimeState(persisted);
      return;
    }

    if (persisted !== 'offline' || !current) {
      runtimeRef.current = persisted;
      setRuntimeState(persisted);
    }
  }, [server.containerState, server.status, server.installStatus]);

  useEffect(() => {
    if (!id) return;
    const needsRefresh = connectionStatus !== 'connected' || server.nodeReachable === false;

    if (!needsRefresh) return;

    const timer = window.setInterval(() => {
      refresh().catch(() => {});
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [connectionStatus, id, refresh, server.nodeReachable]);

  useEffect(() => {
    if (!id) return;
    const installing =
      server.installStatus === 'installing' ||
      server.status === 'installing' ||
      installPhase === 'installing';
    if (!installing) {
      installLogsHydrated.current = false;
      return;
    }
    if (installLogsHydrated.current) return;
    installLogsHydrated.current = true;

    liveApi
      .installLogs(id)
      .then(({ response }) => {
        if (!response.length) return;
        for (const line of response) {
          appendConsoleLine(id, line, 'install');
        }
        flushConsole();
      })
      .catch(() => {
        installLogsHydrated.current = false;
      });
  }, [id, installPhase, liveApi, server.installStatus, server.status, flushConsole]);

  const clearConsole = useCallback(() => {
    if (!id) return;
    clearConsoleLines(id);
    setConsoleLines([]);
  }, [id]);

  const downloadConsole = useCallback(() => {
    if (!id) return;
    const blob = new Blob([consoleLinesToText(getConsoleLines(id))], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.name.replace(/\s+/g, '-').toLowerCase()}-console.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id, server.name]);

  const sendCommand = useCallback(
    (command: string) => {
      const trimmed = command.trim();
      if (!trimmed || !id) return;

      const transport = resolveConsoleCommandTransport(wsRef.current?.readyState);
      if (transport === 'websocket') {
        wsRef.current!.send(JSON.stringify({ event: 'send command', args: [trimmed] }));
        return;
      }

      if (connectionStatusRef.current === 'disconnected') {
        syncLines('Cannot send command: disconnected from the node.', 'error');
        toast.error('Command not sent', 'Not connected to the node');
        return;
      }

      void liveApi.command(id, trimmed).catch((err) => {
        const message = err instanceof Error ? err.message : 'Command failed';
        syncLines(`Command failed: ${message}`, 'error');
        toast.error('Command failed', message);
      });
    },
    [id, liveApi, syncLines, toast],
  );

  const value = useMemo<ServerLiveContextValue>(
    () => ({
      connectionStatus,
      runtimeState,
      installPhase,
      consoleLines,
      liveStats,
      uptimeMs,
      followScroll,
      setFollowScroll,
      clearConsole,
      downloadConsole,
      sendCommand,
      reconnect: connect,
    }),
    [
      clearConsole,
      connect,
      connectionStatus,
      consoleLines,
      downloadConsole,
      followScroll,
      installPhase,
      liveStats,
      uptimeMs,
      runtimeState,
      sendCommand,
    ],
  );

  return <ServerLiveContext.Provider value={value}>{children}</ServerLiveContext.Provider>;
}

export function useServerLive() {
  const ctx = useContext(ServerLiveContext);
  if (!ctx) throw new Error('useServerLive must be used within ServerLiveProvider');
  return ctx;
}

export function useServerLiveOptional() {
  return useContext(ServerLiveContext);
}
