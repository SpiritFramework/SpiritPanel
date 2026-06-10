import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AdminServerDetail } from '../../lib/api';
import { adminServerToClientDetail } from '../../lib/server-access';
import { AdminSupportProvider } from '../../context/AdminSupportContext';
import { StaticServerProvider } from '../../context/ServerContext';
import { adminLiveApi, ServerLiveProvider } from '../../context/ServerLiveContext';
import { AdminSupportBanner } from '../../components/admin/AdminSupportBanner';
import { ServerConsolePage } from '../client/ServerConsole';
import { AdminLayout } from '../../components/Layout';
import { AdminDetailLoading, AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { getServerTheme } from '../../lib/server-theme';

export function AdminServerConsolePage() {
  const { serverId = '' } = useParams();
  const [detail, setDetail] = useState<AdminServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const data = await api.admin.server(serverId);
    setDetail(data);
  }, [serverId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    refresh()
      .catch(() => {
        setDetail(null);
        setError('Failed to load server');
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  async function power(action: 'start' | 'stop' | 'restart' | 'kill') {
    await api.admin.serverPower(serverId, action);
    await refresh();
  }

  if (loading) {
    return (
      <AdminLayout>
        <AdminDetailLoading />
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <AdminDetailNotFound
          message={error || 'Server not found'}
          backTo={`/admin/servers/${serverId}`}
          backLabel="Back to server"
        />
      </AdminLayout>
    );
  }

  const server = adminServerToClientDetail(detail);
  const theme = getServerTheme(detail.egg.name);

  return (
    <AdminSupportProvider
      owner={detail.owner}
      serverName={detail.name}
      backTo={`/admin/servers/${serverId}`}
    >
      <StaticServerProvider server={server} refresh={refresh} power={power}>
        <ServerLiveProvider liveApi={adminLiveApi}>
          <AdminLayout>
            <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col gap-3">
              <AdminSupportBanner
                owner={detail.owner}
                serverName={detail.name}
                eggName={detail.egg.name}
                eggLogoUrl={detail.egg.logoUrl}
                themeGradient={theme.gradient}
                backTo={`/admin/servers/${serverId}`}
              />

              <div className="flex min-h-0 flex-1 flex-col">
                <ServerConsolePage />
              </div>
            </div>
          </AdminLayout>
        </ServerLiveProvider>
      </StaticServerProvider>
    </AdminSupportProvider>
  );
}
