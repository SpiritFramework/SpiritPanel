import { createWingsWebSocket } from './ws-stats';

/** Aggregate browser probe samples the same way as TCP ping (lowest successful). */
export function aggregateBrowserPingSamples(samples: number[]): number | null {
  if (samples.length === 0) return null;
  return Math.min(...samples);
}

/**
 * One RTT sample via authenticated Wings websocket auth handshake.
 * Avoids HTTP `/api/system` probes that fill DevTools with expected 401s.
 */
export function measureWingsAuthRttOnce(
  socket: string,
  token: string,
  timeoutMs = 4000,
): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const start = performance.now();
    let ws: WebSocket;

    const finish = (ms: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(ms);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    try {
      ws = createWingsWebSocket(socket, token);
    } catch {
      finish(null);
      return;
    }

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { event?: string };
        if (msg.event === 'auth success') {
          finish(Math.max(1, Math.round(performance.now() - start)));
          return;
        }
        if (msg.event === 'jwt error' || msg.event === 'token expired') {
          finish(null);
        }
      } catch {
        /* ignore non-JSON frames */
      }
    });
    ws.addEventListener('error', () => finish(null));
    ws.addEventListener('close', () => {
      if (!settled) finish(null);
    });
  });
}

export interface MeasureWingsAuthRttOptions {
  timeoutMs?: number;
}

/** Measure browser→node latency using a short-lived authenticated Wings websocket. */
export async function measureWingsAuthRtt(
  socket: string,
  token: string,
  opts: MeasureWingsAuthRttOptions = {},
): Promise<number | null> {
  return measureWingsAuthRttOnce(socket, token, opts.timeoutMs ?? 4000);
}

/** @deprecated HTTP probes caused DevTools 401 noise — prefer measureWingsAuthRtt. */
export function browserSafeProbeUrl(probeUrl: string): string {
  if (typeof window === 'undefined') return probeUrl;
  if (window.location.protocol === 'https:' && probeUrl.startsWith('http:')) {
    return `https:${probeUrl.slice('http:'.length)}`;
  }
  return probeUrl;
}
