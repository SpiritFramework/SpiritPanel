import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type ServerDetail } from '../lib/api';
import { useServerRouteId } from '../hooks/useServerRouteId';

interface ServerContextValue {
  server: ServerDetail;
  refresh: () => Promise<ServerDetail | null>;
  power: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  loadError: string | null;
}

const ServerContext = createContext<ServerContextValue | null>(null);

export function ServerProvider({
  children,
  loadingFallback,
  notFoundFallback,
}: {
  children: ReactNode;
  loadingFallback?: ReactNode;
  notFoundFallback?: ReactNode;
}) {
  const resolvedId = useServerRouteId();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<ServerDetail | null> => {
    if (!resolvedId) return null;
    const data = await api.client.server(resolvedId);
    setServer(data);
    setLoadError(null);
    return data;
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      setServer(null);
      setLoadError('Invalid server');
      return;
    }
    setLoading(true);
    setLoadError(null);
    refresh()
      .catch((err) => {
        setServer(null);
        setLoadError(err instanceof Error ? err.message : 'Failed to load server');
      })
      .finally(() => setLoading(false));
  }, [resolvedId, refresh]);

  async function power(action: 'start' | 'stop' | 'restart' | 'kill') {
    if (!resolvedId) return;
    await refresh();
    await api.client.power(resolvedId, action);
    await refresh();
  }

  if (loading) return loadingFallback ?? null;
  if (!server) return notFoundFallback ?? null;

  return (
    <ServerContext.Provider value={{ server, refresh, power, loadError }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer must be used within ServerProvider');
  return ctx;
}

/** Provide server state without fetching (e.g. admin support console). */
export function StaticServerProvider({
  server,
  refresh,
  power,
  children,
}: {
  server: ServerDetail;
  refresh: () => Promise<ServerDetail | null>;
  power: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  children: ReactNode;
}) {
  return (
    <ServerContext.Provider value={{ server, refresh, power, loadError: null }}>
      {children}
    </ServerContext.Provider>
  );
}
