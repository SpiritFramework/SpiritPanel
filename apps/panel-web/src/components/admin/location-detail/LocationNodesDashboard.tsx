import { Link } from 'react-router-dom';
import { ChevronRight, HardDrive, Network, Plus, Server, Wrench } from 'lucide-react';
import type { AdminLocationDetail } from '../../../lib/api';
import { EmptyState } from '../../ui';
import { AdminToolButton } from '../primitives';
import { LocationDetailPanel } from './LocationDetailShell';

export function LocationNodesDashboard({ detail }: { detail: AdminLocationDetail }) {
  const maintenanceCount = detail.nodes.filter((n) => n.maintenanceMode).length;
  const activeCount = detail.nodes.length - maintenanceCount;

  return (
    <div className="ds-loc-nodes ds-nst-eggs">
      <LocationDetailPanel
        tone="capacity"
        icon={Network}
        eyebrow="Region fleet"
        title={`Nodes in ${detail.short}`}
        description="Wings hosts assigned to this location"
        badge={String(detail.nodes.length)}
        actions={
          <AdminToolButton to="/admin/nodes/new" primary>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add node
          </AdminToolButton>
        }
      >
        {detail.nodes.length === 0 ? (
          <div className="ds-loc-nodes-empty ds-nst-eggs-empty">
            <EmptyState
              title="No nodes in this region"
              description="Create a node and assign it to this location to start hosting servers here."
            />
            <div className="flex justify-center">
              <AdminToolButton to="/admin/nodes/new" primary>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add node
              </AdminToolButton>
            </div>
          </div>
        ) : (
          <>
            <p className="ds-loc-empty-inline ds-nst-empty-inline ds-ud-empty-inline mb-3">
              {activeCount} active · {maintenanceCount} maintenance · {detail.serverCount} server
              {detail.serverCount === 1 ? '' : 's'} total
            </p>
            <ul className="ds-loc-node-list ds-nst-egg-list">
              {detail.nodes.map((node) => (
                <li key={node.id}>
                  <Link to={`/admin/nodes/${node.id}`} className="ds-loc-node-list-row ds-nst-egg-list-row">
                    <span
                      className={`ds-loc-node-list-icon ds-nst-egg-list-icon${node.maintenanceMode ? ' ds-loc-node-list-icon--maint' : ''}`}
                      aria-hidden
                    >
                      <HardDrive className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="ds-loc-node-list-name ds-nst-egg-list-name truncate">{node.name}</p>
                      <p className="ds-loc-node-list-meta ds-nst-egg-list-meta truncate">
                        {node.fqdn}
                      </p>
                    </div>
                    <div className="ds-loc-node-list-chips ds-nst-egg-list-chips">
                      <span className="ds-loc-node-list-chip ds-nst-egg-list-chip">
                        <Server className="h-3 w-3" aria-hidden />
                        {node.serverCount}
                      </span>
                      <span className="ds-loc-node-list-chip ds-nst-egg-list-chip">
                        <Network className="h-3 w-3" aria-hidden />
                        {node.allocationCount}
                      </span>
                      {node.maintenanceMode ? (
                        <span className="ds-loc-node-list-chip ds-nst-egg-list-chip ds-loc-node-list-chip--maint">
                          <Wrench className="h-3 w-3" aria-hidden />
                          Maint
                        </span>
                      ) : (
                        <span className="ds-loc-node-list-chip ds-nst-egg-list-chip">Active</span>
                      )}
                    </div>
                    <ChevronRight className="ds-nst-egg-list-chevron h-4 w-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </LocationDetailPanel>
    </div>
  );
}
