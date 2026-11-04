import { useMemo, useState } from 'react';
import { Activity, LayoutGrid, List, Plus, Server } from 'lucide-react';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { AdminToolButton } from '../../../components/admin/primitives';
import { ServerCard } from '../../../components/ServerCard';
import { ServerListTable } from '../../../components/ServerListRow';
import { EmptyState } from '../../../components/ui';
import type { AdminNodeDetail, ServerSummary } from '../../../lib/api';
import { useBranding } from '../../../context/BrandingContext';
import { normalizeAppearance } from '../../../lib/branding-appearance';
import type { NodeDetailController } from './useNodeDetail';

type ViewMode = 'grid' | 'list';

type OwnerInfo = { username: string; avatarUrl?: string | null };

function toServerSummary(
  server: AdminNodeDetail['servers'][number],
  node: Pick<AdminNodeDetail, 'name' | 'fqdn' | 'maintenanceMode' | 'online'>,
): ServerSummary {
  return {
    id: server.id,
    uuid: server.uuid ?? server.id,
    name: server.name,
    description: server.description ?? undefined,
    status: server.status,
    suspended: server.suspended,
    installStatus: server.installStatus,
    containerState: server.containerState ?? undefined,
    memory: server.memory,
    disk: server.disk,
    cpu: server.cpu,
    egg: server.egg ?? { name: 'Server' },
    node: {
      name: node.name,
      fqdn: node.fqdn,
      maintenanceMode: node.maintenanceMode,
    },
    defaultAllocation: server.defaultAllocation,
    nodeReachable: node.online,
  };
}

export function NodeDetailServersTab({
  ctrl,
  onAnalytics,
}: {
  ctrl: NodeDetailController;
  onAnalytics: () => void;
}) {
  const { detail } = ctrl;
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const [view, setView] = useState<ViewMode>(
    appearance.serverListDefaultView === 'list' ? 'list' : 'grid',
  );

  const { summaries, ownersById } = useMemo(() => {
    if (!detail) {
      return {
        summaries: [] as ServerSummary[],
        ownersById: new Map<string, OwnerInfo>(),
      };
    }
    const ownersById = new Map<string, OwnerInfo>();
    const summaries = detail.servers.map((server) => {
      ownersById.set(server.id, {
        username: server.owner.username,
        avatarUrl: server.owner.avatarUrl,
      });
      return toServerSummary(server, detail);
    });
    return { summaries, ownersById };
  }, [detail]);

  if (!detail) return null;

  const location = {
    short: detail.location.short,
    flagUrl: detail.location.flagUrl,
  };

  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title={`Servers (${detail.servers.length})`}
        description="Game servers deployed on this node"
        icon={Server}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {detail.servers.length > 0 ? (
              <>
                <div className="ds-segmented" role="group" aria-label="Server view">
                  <button
                    type="button"
                    className={`ds-segmented-btn${view === 'grid' ? ' is-active' : ''}`}
                    aria-pressed={view === 'grid'}
                    aria-label="Grid view"
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid className="ds-icon" />
                  </button>
                  <button
                    type="button"
                    className={`ds-segmented-btn${view === 'list' ? ' is-active' : ''}`}
                    aria-pressed={view === 'list'}
                    aria-label="List view"
                    onClick={() => setView('list')}
                  >
                    <List className="ds-icon" />
                  </button>
                </div>
                <AdminToolButton type="button" onClick={onAnalytics}>
                  <Activity className="h-3.5 w-3.5" aria-hidden />
                  Live analytics
                </AdminToolButton>
              </>
            ) : null}
            <AdminToolButton to="/admin/servers/new" primary>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New server
            </AdminToolButton>
          </div>
        }
      >
        {detail.servers.length === 0 ? (
          <EmptyState
            title="No servers"
            description="No servers are deployed on this node yet."
            action={
              <AdminToolButton to="/admin/servers/new" primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Create server
              </AdminToolButton>
            }
          />
        ) : view === 'grid' ? (
          <div className="ds-servers-fleet-grid ds-servers-fleet-grid--compact">
            {summaries.map((summary) => {
              const owner = ownersById.get(summary.id);
              return (
                <ServerCard
                  key={summary.id}
                  server={summary}
                  href={`/admin/servers/${summary.id}`}
                  footerOwner={owner}
                  footerLocation={location}
                  compact
                />
              );
            })}
          </div>
        ) : (
          <ServerListTable
            servers={summaries}
            compact
            hrefFor={(server) => `/admin/servers/${server.id}`}
            metaOwnerFor={(server) => ownersById.get(server.id)}
          />
        )}
      </NodeDetailPanel>
    </div>
  );
}
