import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { measureBrowserProbe } from '../lib/browser-ping';
import { smoothPingReading } from '../lib/ping-smooth';

export type ServerPingState = 'idle' | 'loading' | 'ok' | 'unreachable';

/**
 * Estimate latency from the user's browser to the server's node
 * (same datacenter/host path players use — not panel→game-port TCP).
 */
export function useServerPing(serverId: string, enabled: boolean) {
  const [ping, setPing] = useState<number | null>(null);
  const [state, setState] = useState<ServerPingState>('idle');

  useEffect(() => {
    if (!enabled || !serverId) {
      setPing(null);
      setState('idle');
      return;
    }

    let cancelled = false;

    async function measure() {
      setState((prev) => (prev === 'ok' ? 'ok' : 'loading'));
      try {
        const target = await api.client.ping(serverId);
        if (cancelled) return;
        if (!target.probeUrl) {
          setPing(null);
          setState('unreachable');
          return;
        }
        // One sample: Wings has no `/` page, so each GET logs a benign 404 in DevTools.
        const ms = await measureBrowserProbe(target.probeUrl, { samples: 1 });
        if (cancelled) return;
        if (ms != null) {
          setPing((prev) => smoothPingReading(prev, ms));
          setState('ok');
        } else {
          setPing(null);
          setState('unreachable');
        }
      } catch {
        if (!cancelled) {
          setPing(null);
          setState('unreachable');
        }
      }
    }

    void measure();
    // Refresh occasionally — not every few seconds (avoids flooding the console with probe 404s).
    const timer = window.setInterval(() => void measure(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [serverId, enabled]);

  return { ping, state };
}
