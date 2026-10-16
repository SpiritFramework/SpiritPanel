import { useCallback, useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { api, type ServerDetail } from '../../../lib/api';
import { StaticServerProvider } from '../../../context/ServerContext';
import { ServerStartupDashboard } from '../../server/startup/ServerStartupDashboard';
import { Skeleton } from '../../ui';
import { ServerDetailPanel } from './ServerDetailShell';

async function noopPower() {
  /* Startup embed does not send power actions. */
}

export function AdminServerStartupPanel({ serverId }: { serverId: string }) {
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (): Promise<ServerDetail | null> => {
    const data = await api.client.server(serverId);
    setServer(data);
    setError('');
    return data;
  }, [serverId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    refresh()
      .catch((err) => {
        setServer(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load startup settings. Enable Admin server support in Settings → Security.',
        );
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <ServerDetailPanel
        icon={Settings2}
        title="Startup & environment"
        description="Command template, Docker image, and egg variables for this user's server"
      >
        <div className="ds-asd-startup-skeleton" aria-busy="true" aria-label="Loading startup">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </ServerDetailPanel>
    );
  }

  if (!server) {
    return (
      <ServerDetailPanel
        icon={Settings2}
        title="Startup & environment"
        description="Command template, Docker image, and egg variables for this user's server"
      >
        <p className="ds-asd-callout ds-asd-callout--warning">
          {error ||
            'Startup settings are unavailable. Enable Admin server support in Settings → Security.'}
        </p>
      </ServerDetailPanel>
    );
  }

  return (
    <div
      className="ds-asd-startup-embed"
      onKeyDown={(e) => {
        // Avoid Enter in inputs submitting the surrounding admin detail form.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
        }
      }}
    >
      <StaticServerProvider server={server} refresh={refresh} power={noopPower}>
        <ServerStartupDashboard variant="embedded" />
      </StaticServerProvider>
    </div>
  );
}
