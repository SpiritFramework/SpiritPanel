import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { measureWingsAuthRtt } from '../lib/browser-ping';
import { smoothPingReading } from '../lib/ping-smooth';

export type ServerPingState = 'idle' | 'loading' | 'ok' | 'unreachable';

/**
 * Estimate latency from the user's browser to the server's node
 * via a short authenticated Wings websocket handshake (no HTTP 401 noise).
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
        if (target.method !== 'websocket' || !target.socket || !target.token) {
          setPing(null);
          setState('unreachable');
          return;
        }
        const ms = await measureWingsAuthRtt(target.socket, target.token);
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
    const timer = window.setInterval(() => void measure(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [serverId, enabled]);

  return { ping, state };
}
