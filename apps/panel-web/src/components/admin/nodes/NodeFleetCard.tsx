import { Link } from 'react-router-dom';
import { ArrowUpRight, HardDrive, MapPin, Network, Server, Wrench } from 'lucide-react';
import type { AdminNodeSummary } from '../../../lib/api';
import { formatCapacityLabel } from '../../../lib/node-capacity';
import { formatResourceAmount } from '../../../lib/server-theme';
import { LocationFlag } from '../../LocationFlag';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import { getNodeFleetStatus } from './node-fleet-utils';

export function NodeFleetCard({ node }: { node: AdminNodeSummary }) {
  const status = getNodeFleetStatus(node);
  const uuidShort = node.uuid.split('-')[0] ?? node.uuid.slice(0, 8);
  const cap = node.capacity;
  const statusLabel =
    status === 'maintenance' ? 'Maintenance' : status === 'offline' ? 'Unreachable' : 'Online';

  return (
    <Link
      to={`/admin/nodes/${node.id}`}
      className={`ds-fleet-card ds-fleet-card--${status}`}
      aria-label={`${node.name}, ${statusLabel}`}
    >
      <div className="ds-fleet-card-accent" aria-hidden />

      <div className="ds-fleet-card-top">
        <div className="ds-fleet-card-icon-wrap" aria-hidden>
          <HardDrive className="ds-icon ds-icon--sm" />
          <span className={`ds-fleet-card-pulse ds-fleet-card-pulse--${status}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="ds-fleet-card-title truncate">{node.name}</h3>
            <span className={`ds-fleet-card-status ds-fleet-card-status--${status}`}>
              {statusLabel}
            </span>
          </div>
          <p className="ds-fleet-card-subtitle truncate">
            {node.description || `Wings · ${uuidShort}`}
          </p>
        </div>
        <ArrowUpRight className="ds-fleet-card-arrow" aria-hidden />
      </div>

      <div className="ds-fleet-card-meta-row">
        <span className="ds-fleet-card-chip">
          <MapPin className="ds-icon ds-icon--sm" aria-hidden />
          {node.location.flagUrl ? (
            <LocationFlag url={node.location.flagUrl} size="sm" className="ds-fleet-card-flag" />
          ) : null}
          {node.location.short}
        </span>
        <span className="ds-fleet-card-chip">
          <Server className="ds-icon ds-icon--sm" aria-hidden />
          {node._count.servers}
        </span>
        <span className="ds-fleet-card-chip">
          <Network className="ds-icon ds-icon--sm" aria-hidden />
          {node._count.allocations}
        </span>
        {status === 'maintenance' ? (
          <span className="ds-fleet-card-chip">
            <Wrench className="ds-icon ds-icon--sm" aria-hidden />
            Draining
          </span>
        ) : node.wingsVersion ? (
          <span className="ds-fleet-card-chip ds-text-mono">v{node.wingsVersion}</span>
        ) : null}
      </div>

      <div className="ds-fleet-card-endpoint">
        <span className="ds-text-mono truncate">
          {node.scheme}://{node.fqdn}:{node.daemonListen}
        </span>
        <span className="ds-fleet-card-endpoint-meta">
          SFTP {node.daemonSftp}
          {node.behindProxy ? ' · proxied' : ''}
        </span>
      </div>

      {cap && (cap.effectiveMemoryLimit > 0 || cap.effectiveDiskLimit > 0) ? (
        <div className="ds-fleet-card-meters">
          {cap.effectiveMemoryLimit > 0 ? (
            <NodeResourceMeter
              label="RAM"
              used={cap.allocatedMemory}
              limit={cap.effectiveMemoryLimit}
              percent={cap.memoryUsedPercent}
              compact
            />
          ) : (
            <p className="ds-text-xs ds-text-muted">
              RAM {formatResourceAmount(cap.allocatedMemory, 'MiB')} allocated · no limit
            </p>
          )}
          {cap.effectiveDiskLimit > 0 ? (
            <NodeResourceMeter
              label="Disk"
              used={cap.allocatedDisk}
              limit={cap.effectiveDiskLimit}
              percent={cap.diskUsedPercent}
              compact
            />
          ) : (
            <p className="ds-text-xs ds-text-muted">
              Disk {formatResourceAmount(cap.allocatedDisk, 'MiB')} allocated · no limit
            </p>
          )}
        </div>
      ) : cap ? (
        <p className="ds-text-xs ds-text-muted">
          {formatCapacityLabel(cap.allocatedMemory, 0)} ·{' '}
          {formatResourceAmount(cap.allocatedDisk, 'MiB')} disk
        </p>
      ) : null}

      {status === 'offline' && node.error ? (
        <p className="ds-fleet-card-error truncate" title={node.error}>
          {node.error}
        </p>
      ) : null}
    </Link>
  );
}
