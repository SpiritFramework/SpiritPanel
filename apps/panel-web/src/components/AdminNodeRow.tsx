import { useNavigate } from 'react-router-dom';
import { ChevronRight, HardDrive, Network, Server, Wrench } from 'lucide-react';
import type { AdminNodeSummary } from '../lib/api';
import { NodeCapacityBars } from './admin/AdminResourceUsage';
import { AdminMobileCard, AdminResponsiveTable } from './admin/AdminMobileCard';
import { Badge, DsIcon } from './ui';
import { LocationFlag } from './LocationFlag';

export function AdminNodeTable({ nodes }: { nodes: AdminNodeSummary[] }) {
  return (
    <AdminResponsiveTable
      mobile={nodes.map((node) => (
        <AdminNodeMobileCard key={node.id} node={node} />
      ))}
      desktop={
        <div className="ds-table-wrap">
          <table className="ds-table" style={{ minWidth: '1040px' }}>
            <thead>
              <tr>
                <th>Node</th>
                <th>Location</th>
                <th>Connection</th>
                <th>Resource usage</th>
                <th>Workload</th>
                <th>Status</th>
                <th className="w-10" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <AdminNodeRow key={node.id} node={node} />
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  );
}

function AdminNodeMobileCard({ node }: { node: AdminNodeSummary }) {
  const navigate = useNavigate();
  const uuidShort = node.uuid.split('-')[0] ?? node.uuid.slice(0, 8);

  return (
    <AdminMobileCard
      onClick={() => navigate(`/admin/nodes/${node.id}`)}
      leading={
        <div className="ds-admin-hero-icon h-10 w-10">
          <HardDrive className="h-4 w-4" />
        </div>
      }
      title={node.name}
      subtitle={node.description || `Wings · ${uuidShort}`}
      badges={
        <NodeStatus
          maintenance={node.maintenanceMode}
          online={node.online}
          wingsVersion={node.wingsVersion}
          error={node.error}
        />
      }
      meta={
        <>
          <p>{node.location.short} · {node._count.servers} server{node._count.servers === 1 ? '' : 's'}</p>
          <p className="font-mono text-[10px]">{node.scheme}://{node.fqdn}:{node.daemonListen}</p>
          {node.capacity && <NodeCapacityBars capacity={node.capacity} compact />}
        </>
      }
    />
  );
}

function AdminNodeRow({ node }: { node: AdminNodeSummary }) {
  const navigate = useNavigate();
  const uuidShort = node.uuid.split('-')[0] ?? node.uuid.slice(0, 8);

  return (
    <tr
      onClick={() => navigate(`/admin/nodes/${node.id}`)}
      className="group cursor-pointer"
    >
      <td>
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="ds-admin-hero-icon h-9 w-9">
            <DsIcon icon={HardDrive} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:text-[var(--accent)]">{node.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {node.description || `Wings · ${uuidShort}`}
            </p>
          </div>
        </div>
      </td>

      <td>
        <div className="min-w-[100px]">
          <p className="flex items-center gap-1 truncate font-medium">
            {node.location.flagUrl ? <LocationFlag url={node.location.flagUrl} size="sm" /> : null}
            {node.location.short}
          </p>
          <p className="truncate text-[11px] text-[var(--muted)]">{node.location.long}</p>
        </div>
      </td>

      <td>
        <div className="min-w-[140px]">
          <p className="truncate font-mono text-[11px]">
            {node.scheme}://{node.fqdn}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
            :{node.daemonListen} · SFTP {node.daemonSftp}
            {node.behindProxy ? ' · proxied' : ''}
          </p>
        </div>
      </td>

      <td>
        {node.capacity ? (
          <div className="min-w-[150px] space-y-2">
            <NodeCapacityBars capacity={node.capacity} compact />
            {(node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) && (
              <div className="flex flex-wrap gap-1.5 text-[10px] tabular-nums text-[var(--muted)]">
                {node.capacity.effectiveMemoryLimit > 0 && (
                  <span className="ds-mini-stat px-1.5 py-0.5 normal-case tracking-normal">
                    RAM {node.capacity.memoryUsedPercent}%
                  </span>
                )}
                {node.capacity.effectiveDiskLimit > 0 && (
                  <span className="ds-mini-stat px-1.5 py-0.5 normal-case tracking-normal">
                    Disk {node.capacity.diskUsedPercent}%
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--muted)]">—</span>
        )}
      </td>

      <td>
        <div className="flex min-w-[100px] flex-col gap-1 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Server className="h-3 w-3 shrink-0" />
            {node._count.servers} server{node._count.servers === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Network className="h-3 w-3 shrink-0" />
            {node._count.allocations} port{node._count.allocations === 1 ? '' : 's'}
          </span>
        </div>
      </td>

      <td>
        <NodeStatus
          maintenance={node.maintenanceMode}
          online={node.online}
          wingsVersion={node.wingsVersion}
          error={node.error}
        />
      </td>

      <td>
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
      </td>
    </tr>
  );
}

function NodeStatus({
  maintenance,
  online,
  wingsVersion,
  error,
}: {
  maintenance: boolean;
  online?: boolean;
  wingsVersion?: string | null;
  error?: string | null;
}) {
  if (maintenance) {
    return (
      <Badge tone="warning">
        <Wrench className="h-3 w-3" />
        Maintenance
      </Badge>
    );
  }
  if (online === false) {
    return (
      <span title={error ?? 'Wings unreachable'}>
        <Badge tone="danger" className="max-w-[120px] truncate">
          Offline
        </Badge>
      </span>
    );
  }
  return (
    <span title={wingsVersion ?? undefined}>
      <Badge tone="success">
        <span className="h-1.5 w-1.5 rounded-full bg-current status-pulse" />
        {wingsVersion ? `Wings ${wingsVersion}` : 'Online'}
      </Badge>
    </span>
  );
}
