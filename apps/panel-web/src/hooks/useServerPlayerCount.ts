import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ServerPlayerCountResponse, type ServerDetail } from '../lib/api';
import { isServerEffectivelyRunning } from '../lib/server-runtime';

const POLL_MS = 10_000;

export function useServerPlayerCount(server: ServerDetail, runtimeState: string | null) {
  const [online, setOnline] = useState<number | null>(null);
  const [max, setMax] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const inFlight = useRef(false);
  const hasData = useRef(false);

  const running = isServerEffectivelyRunning({
    status: server.status,
    installStatus: server.installStatus,
    suspended: server.suspended,
    containerState: runtimeState ?? server.containerState,
  });

  const refresh = useCallback(async () => {
    if (!running || inFlight.current) return;
    inFlight.current = true;
    if (!hasData.current) setLoading(true);
    try {
      const result: ServerPlayerCountResponse = await api.client.playerCount(server.id);
      hasData.current = true;
      setOnline(result.online);
      setMax(result.max);
      setUnavailable(Boolean(result.error) && result.online === 0);
    } catch {
      setUnavailable(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [running, server.id]);

  useEffect(() => {
    if (!running) {
      hasData.current = false;
      setOnline(null);
      setMax(null);
      setUnavailable(false);
      setLoading(false);
      return;
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [running, refresh]);

  return { online, max, loading, running, unavailable, refresh };
}
