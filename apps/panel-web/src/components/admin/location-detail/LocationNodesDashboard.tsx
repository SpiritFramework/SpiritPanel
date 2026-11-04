import { Link } from 'react-router-dom';
import { ArrowUpRight, HardDrive, Network, Plus, Server, Wrench } from 'lucide-react';
import type { AdminLocationDetail } from '../../../lib/api';
import { Button } from '../../Layout';
import { EmptyState } from '../../ui';
import { AdminSection, AdminToolButton } from '../primitives';

type LocationNode = AdminLocationDetail['nodes'][number];

function LocationNodeCard({ node }: { node: LocationNode }) {
  const status = node.maintenanceMode ? 'maintenance' : 'active';
  const statusLabel = node.maintenanceMode ? 'Maintenance' : 'Active';

  return (
    <Link
      to={`/admin/nodes/${node.id}`}
      className={`ds-loc-node-card ds-loc-node-card--${status}`}
      aria-label={`${node.name}, ${statusLabel}`}
    >
      <div className="ds-loc-node-card-accent" aria-hidden />

      <div className="ds-loc-node-card-top">
        <div className="ds-loc-node-card-icon" aria-hidden>
          <HardDrive className="ds-icon ds-icon--sm" />
          <span className={`ds-loc-node-card-pulse ds-loc-node-card-pulse--${status}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="ds-loc-node-card-title truncate">{node.name}</h3>
            <span className={`ds-loc-node-card-badge ds-loc-node-card-badge--${status}`}>
              {statusLabel}
            </span>
          </div>
          <p className="ds-loc-node-card-fqdn ds-text-mono truncate">{node.fqdn}</p>
        </div>
        <ArrowUpRight className="ds-loc-node-card-arrow" aria-hidden />
      </div>

      <div className="ds-loc-node-card-stats">
        <span className="ds-loc-node-card-stat">
          <Server className="h-3 w-3" aria-hidden />
          {node.serverCount} server{node.serverCount === 1 ? '' : 's'}
        </span>
        <span className="ds-loc-node-card-stat">
          <Network className="h-3 w-3" aria-hidden />
          {node.allocationCount} port{node.allocationCount === 1 ? '' : 's'}
        </span>
        {node.maintenanceMode ? (
          <span className="ds-loc-node-card-stat">
            <Wrench className="h-3 w-3" aria-hidden />
            Draining
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function LocationNodesDashboard({ detail }: { detail: AdminLocationDetail }) {
  const maintenanceCount = detail.nodes.filter((n) => n.maintenanceMode).length;
  const activeCount = detail.nodes.length - maintenanceCount;

  return (
    <div className="ds-loc-nodes">
      <AdminSection
        tone="fleet"
        icon={Network}
        eyebrow="Region fleet"
        title={`Nodes in ${detail.short}`}
        description={
          detail.nodes.length === 0
            ? 'No Wings nodes are assigned to this region.'
            : `${activeCount} active · ${maintenanceCount} maintenance · ${detail.serverCount} servers total`
        }
        badge={String(detail.nodes.length)}
        actions={
          <AdminToolButton to="/admin/nodes">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add node
          </AdminToolButton>
        }
      >
        {detail.nodes.length === 0 ? (
          <div className="ds-loc-nodes-empty">
            <EmptyState
              title="No nodes in this region"
              description="Create a node and assign it to this location to start hosting servers here."
            />
            <Link to="/admin/nodes">
              <Button type="button">Go to nodes</Button>
            </Link>
          </div>
        ) : (
          <div className="ds-loc-nodes-grid">
            {detail.nodes.map((node) => (
              <LocationNodeCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
