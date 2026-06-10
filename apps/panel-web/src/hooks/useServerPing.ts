import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type ServerPingState = 'idle' | 'loading' | 'ok' | 'unreachable';

/** Measure round-trip from the browser via the panel API (reachable = game port is open). */
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
      const start = performance.now();
      try {
        const res = await api.client.ping(serverId);
        if (cancelled) return;
        const rtt = Math.round(performance.now() - start);
        if (res.reachable) {
          setPing(Math.max(rtt, 1));
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
    const timer = window.setInterval(() => void measure(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [serverId, enabled]);

  return { ping, state };
}
