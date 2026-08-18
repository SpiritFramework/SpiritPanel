import { Link } from 'react-router-dom';
import { Server } from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { NodeResourceMeter } from '../../../components/admin/node-detail/NodeResourceMeter';
import { AdminServerStatusBadge } from '../../../components/admin/AdminServerStatus';
import { EmptyState } from '../../../components/ui';
import { formatResource } from '../../../lib/server-theme';
import type { NodeDetailController } from './useNodeDetail';

export function NodeDetailServersTab({
  ctrl,
  onAnalytics,
}: {
  ctrl: NodeDetailController;
  onAnalytics: () => void;
}) {
  const { detail } = ctrl;
  if (!detail) return null;

  const cap = detail.capacity;

  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title={`Servers (${detail.servers.length})`}
        description="Game servers deployed on this node"
        icon={Server}
      >
        {detail.servers.length === 0 ? (
          <EmptyState title="No servers" description="No servers are deployed on this node yet." />
        ) : (
          <>
            <p className="ds-text-sm ds-text-muted mb-4">
              Live CPU and usage trends are on the{' '}
              <button type="button" className="text-[var(--accent-hover)] underline" onClick={onAnalytics}>
                Analytics
              </button>{' '}
              tab.
            </p>
            <ul className="ds-nd-server-grid">
              {detail.servers.map((server) => {
                const memShare =
                  cap.effectiveMemoryLimit > 0
                    ? Math.min(100, Math.round(((server.memory ?? 0) / cap.effectiveMemoryLimit) * 100))
                    : 0;
                const diskShare =
                  cap.effectiveDiskLimit > 0
                    ? Math.min(100, Math.round(((server.disk ?? 0) / cap.effectiveDiskLimit) * 100))
                    : 0;

                return (
                  <li key={server.id}>
                    <Link to={`/admin/servers/${server.id}`} className="ds-nd-server-card">
                      <div className="ds-nd-server-card-top">
                        <div className="min-w-0">
                          <p className="ds-nd-server-card-name">{server.name}</p>
                          <p className="ds-nd-server-card-owner">@{server.owner.username}</p>
                        </div>
                        <AdminServerStatusBadge
                          status={server.status}
                          suspended={server.suspended}
                          installStatus={server.installStatus}
                          containerState={server.containerState}
                          compact
                        />
                      </div>

                      <div className="ds-nd-server-card-meters">
                        <div>
                          <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
                            <span>RAM limit</span>
                            <span className="font-mono">{formatResource(server.memory ?? 0, 'MiB')}</span>
                          </div>
                          {cap.effectiveMemoryLimit > 0 ? (
                            <NodeResourceMeter
                              label=""
                              used={server.memory ?? 0}
                              limit={cap.effectiveMemoryLimit}
                              percent={memShare}
                              compact
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
                            <span>Disk limit</span>
                            <span className="font-mono">{formatResource(server.disk ?? 0, 'MiB')}</span>
                          </div>
                          {cap.effectiveDiskLimit > 0 ? (
                            <NodeResourceMeter
                              label=""
                              used={server.disk ?? 0}
                              limit={cap.effectiveDiskLimit}
                              percent={diskShare}
                              compact
                            />
                          ) : null}
                        </div>
                      </div>

                      <p className="ds-nd-server-card-addr">
                        {formatAllocationAddress(server.defaultAllocation, { fqdn: detail.fqdn })}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </NodeDetailPanel>
    </div>
  );
}
