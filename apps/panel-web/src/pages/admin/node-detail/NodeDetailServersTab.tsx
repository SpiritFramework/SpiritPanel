import { Link } from 'react-router-dom';
import { Server } from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import { AdminServerStatusBadge } from '../../../components/admin/AdminServerStatus';
import { AdminSettingsPanel } from '../../../components/AdminDetailLayout';
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

  return (
    <AdminSettingsPanel
      title={`Servers (${detail.servers.length})`}
      description="Game servers deployed on this node"
      icon={Server}
    >
      {detail.servers.length === 0 ? (
        <EmptyState title="No servers" description="No servers are deployed on this node yet." />
      ) : (
        <>
          <p className="mb-4 text-xs text-[var(--muted)]">
            View live CPU, memory, and disk usage on the{' '}
            <button type="button" className="accent-text underline" onClick={onAnalytics}>
              Analytics
            </button>{' '}
            tab.
          </p>
          <ul className="node-edit-server-grid">
            {detail.servers.map((server) => {
              const memShare =
                detail.capacity.effectiveMemoryLimit > 0
                  ? Math.min(
                      100,
                      Math.round(((server.memory ?? 0) / detail.capacity.effectiveMemoryLimit) * 100),
                    )
                  : 0;
              const diskShare =
                detail.capacity.effectiveDiskLimit > 0
                  ? Math.min(
                      100,
                      Math.round(((server.disk ?? 0) / detail.capacity.effectiveDiskLimit) * 100),
                    )
                  : 0;

              return (
                <li key={server.id}>
                  <Link to={`/admin/servers/${server.id}`} className="node-edit-server-card group">
                    <div className="node-edit-server-card-top">
                      <div className="min-w-0">
                        <p className="truncate font-semibold group-hover:accent-text">{server.name}</p>
                        <p className="truncate text-[11px] text-[var(--muted)]">@{server.owner.username}</p>
                      </div>
                      <AdminServerStatusBadge
                        status={server.status}
                        suspended={server.suspended}
                        installStatus={server.installStatus}
                        containerState={server.containerState}
                        compact
                      />
                    </div>

                    <div className="node-edit-server-card-meters">
                      <ResourceMeter
                        label="RAM"
                        value={formatResource(server.memory ?? 0, 'MiB')}
                        percent={memShare}
                        tone="memory"
                      />
                      <ResourceMeter
                        label="Disk"
                        value={formatResource(server.disk ?? 0, 'MiB')}
                        percent={diskShare}
                        tone="disk"
                      />
                    </div>

                    <p className="mt-2 truncate font-mono text-[10px] text-[var(--muted)]">
                      {formatAllocationAddress(server.defaultAllocation, { fqdn: detail.fqdn })}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminSettingsPanel>
  );
}

function ResourceMeter({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number;
  tone: 'memory' | 'disk';
}) {
  return (
    <div className="node-edit-server-meter">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      {percent > 0 && (
        <div className="node-edit-server-meter-track">
          <div
            className={`node-edit-server-meter-fill node-edit-server-meter-fill--${tone}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
