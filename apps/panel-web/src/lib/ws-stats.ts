import type { StatPoint } from './api';
import { normalizeRuntimeState } from './server-runtime';

export {
  formatRuntimeStateLabel,
  isServerRunning,
  normalizeRuntimeState,
  resolveEffectiveRuntimeState,
} from './server-runtime';

export function parseStatsPayload(raw: unknown): Partial<StatPoint> & { uptime?: number } | null {
  const root = unwrapStatsObject(raw);
  if (!root) return null;

  const sources = collectStatSources(root);
  const stateRaw = pickString(sources, 'state', 'current_state', 'status');
  const state = stateRaw ? normalizeRuntimeState(stateRaw) : undefined;

  return {
    recordedAt: new Date().toISOString(),
    cpu: pickNumber(sources, 'cpu_absolute'),
    memoryBytes: pickNumber(sources, 'memory_bytes'),
    diskBytes: pickNumber(sources, 'disk_bytes'),
    networkRxBytes: pickNetwork(sources, 'rx_bytes'),
    networkTxBytes: pickNetwork(sources, 'tx_bytes'),
    uptime: pickNumber(sources, 'uptime'),
    state,
  };
}

function unwrapStatsObject(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function collectStatSources(root: Record<string, unknown>): Record<string, unknown>[] {
  const nested = [root.utilization, root.resources, root.attributes].filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object',
  );
  return [...nested, root];
}

function pickString(sources: Record<string, unknown>[], ...keys: string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      if (typeof source[key] === 'string') return source[key] as string;
    }
  }
  return undefined;
}

function pickNumber(sources: Record<string, unknown>[], key: string) {
  for (const source of sources) {
    if (typeof source[key] === 'number') return source[key] as number;
  }
  return 0;
}

function pickNetwork(sources: Record<string, unknown>[], key: 'rx_bytes' | 'tx_bytes') {
  for (const source of sources) {
    const val = (source.network as { rx_bytes?: number; tx_bytes?: number } | undefined)?.[key];
    if (typeof val === 'number') return val;
  }
  return 0;
}

export function parseRuntimeState(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return parseRuntimeState(JSON.parse(trimmed));
      } catch {
        return normalizeRuntimeState(raw);
      }
    }
    return normalizeRuntimeState(raw);
  }
  if (raw && typeof raw === 'object') {
    const s = raw as Record<string, unknown>;
    if (typeof s.state === 'string') return normalizeRuntimeState(s.state);
    if (typeof s.current_state === 'string') return normalizeRuntimeState(s.current_state);
  }
  return null;
}

/** Route console WebSocket through panel nginx (/wings/) when direct daemon URLs won't work. */
export function normalizeWingsSocketUrl(socket: string): string {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') {
    return socket;
  }

  const serverMatch = socket.match(/\/api\/servers\/([^/?#]+)\/ws/i);
  if (!serverMatch) {
    return socket.replace(/^ws:/i, 'wss:');
  }

  const serverUuid = serverMatch[1];

  // Already proxied — normalize to the current panel host.
  if (socket.includes('/wings/api/servers/')) {
    return `wss://${window.location.host}/wings/api/servers/${serverUuid}/ws`;
  }

  try {
    const url = new URL(socket);
    const panelHost = window.location.hostname;
    const sameHost = url.hostname === panelHost;
    const daemonPort = url.port || (url.protocol === 'wss:' ? '443' : '80');

    // Browsers cannot use ws:// from HTTPS. Same-host :8080/Wings is not on nginx :443.
    const needsProxy =
      url.protocol === 'ws:' ||
      (sameHost && daemonPort !== '443') ||
      (sameHost && url.pathname.startsWith('/api/servers/'));

    if (needsProxy) {
      return `wss://${window.location.host}/wings/api/servers/${serverUuid}/ws`;
    }
  } catch {
    /* fall through */
  }

  if (socket.startsWith('wss://')) return socket;
  return socket.replace(/^ws:/i, 'wss:');
}

/** Open a FeatherWings console socket and send the required auth event. */
export function createWingsWebSocket(socket: string, token: string): WebSocket {
  const ws = new WebSocket(normalizeWingsSocketUrl(socket));
  const authenticate = () => {
    ws.send(JSON.stringify({ event: 'auth', args: [token] }));
  };
  if (ws.readyState === WebSocket.OPEN) {
    authenticate();
  } else {
    ws.addEventListener('open', authenticate, { once: true });
  }
  return ws;
}

export function requestWingsLogs(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'send logs', args: [] }));
  }
}

export function requestWingsStats(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'send stats', args: [] }));
  }
}
