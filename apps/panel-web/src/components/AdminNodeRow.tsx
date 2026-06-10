import { useNavigate } from 'react-router-dom';
import { ChevronRight, HardDrive, Network, Server, Wrench } from 'lucide-react';
import type { AdminNodeSummary } from '../lib/api';
import { NodeCapacityBars } from './admin/AdminResourceUsage';
import { AdminMobileCard, AdminResponsiveTable } from './admin/AdminMobileCard';

const NODE_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 45%, #0f172a 100%)';

export function AdminNodeTable({ nodes }: { nodes: AdminNodeSummary[] }) {
  return (
    <AdminResponsiveTable
      mobile={nodes.map((node) => (
        <AdminNodeMobileCard key={node.id} node={node} />
      ))}
      desktop={
        <table className="w-full min-w-[1040px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-2.5 font-semibold">Node</th>
              <th className="px-4 py-2.5 font-semibold">Location</th>
              <th className="px-4 py-2.5 font-semibold">Connection</th>
              <th className="px-4 py-2.5 font-semibold">Resource usage</th>
              <th className="px-4 py-2.5 font-semibold">Workload</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="w-10 px-2 py-2.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <AdminNodeRow key={node.id} node={node} />
            ))}
          </tbody>
        </table>
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
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
          style={{ background: NODE_GRADIENT }}
        >
          <HardDrive className="h-4 w-4 text-white/90" />
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
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[180px] items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: NODE_GRADIENT }}
          >
            <HardDrive className="h-4 w-4 text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:accent-text">{node.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {node.description || `Wings · ${uuidShort}`}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[100px]">
          <p className="truncate font-medium">{node.location.short}</p>
          <p className="truncate text-[11px] text-[var(--muted)]">{node.location.long}</p>
        </div>
      </td>

      <td className="px-4 py-3">
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

      <td className="px-4 py-3">
        {node.capacity ? (
          <div className="min-w-[150px] space-y-2">
            <NodeCapacityBars capacity={node.capacity} compact />
            {(node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) && (
              <div className="flex flex-wrap gap-1.5 text-[10px] tabular-nums text-[var(--muted)]">
                {node.capacity.effectiveMemoryLimit > 0 && (
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5">
                    RAM {node.capacity.memoryUsedPercent}%
                  </span>
                )}
                {node.capacity.effectiveDiskLimit > 0 && (
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5">
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

      <td className="px-4 py-3">
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

      <td className="px-4 py-3">
        <NodeStatus
          maintenance={node.maintenanceMode}
          online={node.online}
          wingsVersion={node.wingsVersion}
          error={node.error}
        />
      </td>

      <td className="px-2 py-3">
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
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
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        <Wrench className="h-3 w-3" />
        Maintenance
      </span>
    );
  }
  if (online === false) {
    return (
      <span
        title={error ?? 'Wings unreachable'}
        className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400"
      >
        <span className="h-1 w-1 rounded-full bg-red-400" />
        Offline
      </span>
    );
  }
  return (
    <span
      title={wingsVersion ?? undefined}
      className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400"
    >
      <span className="h-1 w-1 rounded-full bg-green-400 status-pulse" />
      {wingsVersion ? `Wings ${wingsVersion}` : 'Online'}
    </span>
  );
}
