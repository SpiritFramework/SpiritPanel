import { useNavigate } from 'react-router-dom';
import { ChevronRight, HardDrive, Network, Server, Wrench } from 'lucide-react';
import type { AdminNodeSummary } from '../lib/api';
import { NodeCapacityBars } from './admin/AdminResourceUsage';
import { AdminMobileCard, AdminResponsiveTable } from './admin/AdminMobileCard';
import { LocationFlag } from './LocationFlag';
import { getNodeFleetStatus } from './admin/nodes/node-fleet-utils';

export function AdminNodeTable({ nodes }: { nodes: AdminNodeSummary[] }) {
  return (
    <AdminResponsiveTable
      mobile={nodes.map((node) => (
        <AdminNodeMobileCard key={node.id} node={node} />
      ))}
      desktop={
        <div className="ds-nd-list-table-wrap">
          <table className="ds-nd-list-table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Location</th>
                <th>Connection</th>
                <th>Capacity</th>
                <th>Workload</th>
                <th>Status</th>
                <th className="ds-nd-list-table-chevron" aria-hidden />
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
  const status = getNodeFleetStatus(node);

  return (
    <AdminMobileCard
      onClick={() => navigate(`/admin/nodes/${node.id}`)}
      leading={
        <div className={`ds-nd-list-row-mark ds-nd-list-row-mark--${status}`} aria-hidden>
          <HardDrive className="h-4 w-4" />
        </div>
      }
      title={node.name}
      subtitle={node.description || `Wings · ${uuidShort}`}
      badges={<NodeStatus node={node} />}
      meta={
        <>
          <p>
            {node.location.short} · {node._count.servers} server
            {node._count.servers === 1 ? '' : 's'}
          </p>
          <p className="font-mono text-[10px]">
            {node.scheme}://{node.fqdn}:{node.daemonListen}
          </p>
          {node.capacity ? <NodeCapacityBars capacity={node.capacity} compact /> : null}
        </>
      }
    />
  );
}

function AdminNodeRow({ node }: { node: AdminNodeSummary }) {
  const navigate = useNavigate();
  const uuidShort = node.uuid.split('-')[0] ?? node.uuid.slice(0, 8);
  const status = getNodeFleetStatus(node);

  return (
    <tr
      onClick={() => navigate(`/admin/nodes/${node.id}`)}
      className={`ds-nd-list-row ds-nd-list-row--${status}`}
    >
      <td>
        <div className="ds-nd-list-row-node">
          <div className={`ds-nd-list-row-mark ds-nd-list-row-mark--${status}`} aria-hidden>
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="ds-nd-list-row-name">{node.name}</p>
            <p className="ds-nd-list-row-sub">
              {node.description || `Wings · ${uuidShort}`}
            </p>
          </div>
        </div>
      </td>

      <td>
        <div className="ds-nd-list-row-loc">
          <p className="ds-nd-list-row-loc-short">
            {node.location.flagUrl ? <LocationFlag url={node.location.flagUrl} size="sm" /> : null}
            {node.location.short}
          </p>
          <p className="ds-nd-list-row-sub">{node.location.long}</p>
        </div>
      </td>

      <td>
        <div className="ds-nd-list-row-conn">
          <p className="ds-nd-list-row-conn-main">
            {node.scheme}://{node.fqdn}
          </p>
          <p className="ds-nd-list-row-sub">
            :{node.daemonListen} · SFTP {node.daemonSftp}
            {node.behindProxy ? ' · proxied' : ''}
          </p>
        </div>
      </td>

      <td>
        {node.capacity ? (
          <div className="ds-nd-list-row-cap">
            <NodeCapacityBars capacity={node.capacity} compact />
            {(node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) && (
              <div className="ds-nd-list-row-cap-tags">
                {node.capacity.effectiveMemoryLimit > 0 ? (
                  <span>RAM {node.capacity.memoryUsedPercent}%</span>
                ) : null}
                {node.capacity.effectiveDiskLimit > 0 ? (
                  <span>Disk {node.capacity.diskUsedPercent}%</span>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <span className="ds-nd-list-row-sub">—</span>
        )}
      </td>

      <td>
        <div className="ds-nd-list-row-work">
          <span>
            <Server className="h-3 w-3" aria-hidden />
            {node._count.servers}
          </span>
          <span>
            <Network className="h-3 w-3" aria-hidden />
            {node._count.allocations}
          </span>
        </div>
      </td>

      <td>
        <NodeStatus node={node} />
      </td>

      <td>
        <ChevronRight className="ds-nd-list-row-chevron" aria-hidden />
      </td>
    </tr>
  );
}

function NodeStatus({ node }: { node: AdminNodeSummary }) {
  const status = getNodeFleetStatus(node);

  if (status === 'maintenance') {
    return (
      <span className="ds-nd-list-status ds-nd-list-status--maintenance">
        <Wrench className="h-3 w-3" aria-hidden />
        Maintenance
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span className="ds-nd-list-status ds-nd-list-status--offline" title={node.error ?? 'Wings unreachable'}>
        Offline
      </span>
    );
  }

  return (
    <span className="ds-nd-list-status ds-nd-list-status--online" title={node.wingsVersion ?? undefined}>
      <span className="ds-nd-list-status-dot" aria-hidden />
      {node.wingsVersion ? `Wings ${node.wingsVersion}` : 'Online'}
    </span>
  );
}
