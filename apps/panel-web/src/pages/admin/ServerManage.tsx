import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AdminServerDetail, type ServerDetail } from '../../lib/api';
import { AdminSupportProvider } from '../../context/AdminSupportContext';
import { StaticServerProvider } from '../../context/ServerContext';
import { adminLiveApi, ServerLiveProvider } from '../../context/ServerLiveContext';
import {
  ServerLoadingShell,
  ServerNotFoundShell,
  ServerShellInner,
} from '../../components/ServerLayout';
import { usePanelBackgroundClass } from '../../hooks/usePanelBackgroundClass';

export function AdminServerManageShell() {
  const { serverId = '' } = useParams();
  const [detail, setDetail] = useState<AdminServerDetail | null>(null);
  const [clientServer, setClientServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const backTo = `/admin/servers/${serverId}`;

  const refreshAll = useCallback(async (): Promise<ServerDetail | null> => {
    const [admin, client] = await Promise.all([
      api.admin.server(serverId),
      api.client.server(serverId),
    ]);
    setDetail(admin);
    setClientServer(client);
    setLoadError('');
    return client;
  }, [serverId]);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    refreshAll()
      .catch((err) => {
        setDetail(null);
        setClientServer(null);
        setLoadError(err instanceof Error ? err.message : 'Failed to load server');
      })
      .finally(() => setLoading(false));
  }, [refreshAll]);

  async function power(action: 'start' | 'stop' | 'restart' | 'kill') {
    await api.admin.serverPower(serverId, action);
    await refreshAll();
  }

  if (loading) {
    return <ServerLoadingShell />;
  }

  if (!detail || !clientServer) {
    return (
      <ServerNotFoundShell
        backTo={backTo}
        backLabel="admin server"
        message={loadError || 'Server not found'}
      />
    );
  }

  const panelBgClass = usePanelBackgroundClass();

  return (
    <AdminSupportProvider owner={detail.owner} serverName={detail.name} backTo={backTo}>
      <div className={`flex h-dvh flex-col overflow-hidden ${panelBgClass}`}>
        <div className="min-h-0 flex-1">
          <StaticServerProvider server={clientServer} refresh={refreshAll} power={power}>
            <ServerLiveProvider liveApi={adminLiveApi}>
              <ServerShellInner />
            </ServerLiveProvider>
          </StaticServerProvider>
        </div>
      </div>
    </AdminSupportProvider>
  );
}
