import { Link } from 'react-router-dom';
import {
  Fingerprint,
  HardDrive,
  MapPin,
  Network,
  Plus,
  Server,
  Wrench,
} from 'lucide-react';
import type { AdminLocationDetail } from '../../../lib/api';
import { AdminCallout, AdminToolButton } from '../primitives';
import {
  LocationDetailMetaGrid,
  LocationDetailPanel,
  LocationDetailUsageMeter,
} from './LocationDetailShell';

export function LocationOverviewDashboard({
  detail,
  copied,
  copyText,
  nav,
}: {
  detail: AdminLocationDetail;
  copied: 'id' | 'uuid' | null;
  copyText: (text: string, key: 'id' | 'uuid') => Promise<void>;
  nav: { onSettings: () => void; onNodes: () => void };
}) {
  const maintenanceCount = detail.nodes.filter((n) => n.maintenanceMode).length;
  const activeCount = detail.nodes.length - maintenanceCount;
  const portTotal = detail.nodes.reduce((sum, n) => sum + n.allocationCount, 0);
  const usageMax = Math.max(detail.nodeCount, detail.serverCount, portTotal, 1);
  const created = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const updated = new Date(detail.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = detail.uuid.split('-')[0] ?? detail.uuid.slice(0, 8);
  const avgServers =
    detail.nodeCount > 0 ? (detail.serverCount / detail.nodeCount).toFixed(1) : '—';

  return (
    <div className="ds-loc-ov ds-nst-ov ds-ud-ov">
      {detail.nodeCount === 0 ? (
        <AdminCallout
          tone="warning"
          icon={Network}
          title="No nodes in this region"
          description="Assign a Wings node to this location to start hosting servers here."
          action={
            <AdminToolButton to="/admin/nodes/new" primary>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add node
            </AdminToolButton>
          }
        />
      ) : null}

      <LocationDetailPanel
        tone="identity"
        icon={MapPin}
        eyebrow="Region"
        title="Footprint"
        description="Identity and capacity for this location"
        actions={
          <AdminToolButton type="button" onClick={nav.onSettings}>
            Edit location
          </AdminToolButton>
        }
      >
        <LocationDetailMetaGrid
          items={[
            { label: 'Short code', value: detail.short, mono: true },
            { label: 'Display name', value: detail.long },
            {
              label: 'Flag',
              value: detail.flagUrl?.trim() ? 'Custom image' : 'Default map pin',
            },
          ]}
        />

        <div className="ds-ud-usage-meters">
          <LocationDetailUsageMeter label="Nodes" value={detail.nodeCount} max={usageMax} />
          <LocationDetailUsageMeter label="Servers" value={detail.serverCount} max={usageMax} />
          <LocationDetailUsageMeter label="Ports" value={portTotal} max={usageMax} />
        </div>
      </LocationDetailPanel>

      <LocationDetailPanel
        tone="capacity"
        icon={HardDrive}
        eyebrow="Fleet"
        title="Nodes in region"
        description="Wings hosts assigned to this location"
        badge={detail.nodes.length > 0 ? String(detail.nodes.length) : undefined}
        actions={
          detail.nodes.length > 0 ? (
            <AdminToolButton type="button" onClick={nav.onNodes}>
              View all
            </AdminToolButton>
          ) : (
            <AdminToolButton to="/admin/nodes/new" primary>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add node
            </AdminToolButton>
          )
        }
      >
        {detail.nodes.length === 0 ? (
          <p className="ds-loc-empty-inline ds-nst-empty-inline ds-ud-empty-inline">
            No nodes yet — create one and assign this location.
          </p>
        ) : (
          <ul className="ds-loc-node-preview ds-ud-server-preview">
            {detail.nodes.slice(0, 6).map((node) => (
              <li key={node.id}>
                <Link
                  to={`/admin/nodes/${node.id}`}
                  className="ds-loc-node-preview-row ds-ud-server-preview-row"
                >
                  <span className="ds-loc-node-preview-icon ds-ud-server-preview-icon" aria-hidden>
                    <HardDrive className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="ds-loc-node-preview-name ds-ud-server-preview-name truncate">
                      {node.name}
                    </p>
                    <p className="ds-loc-node-preview-meta ds-ud-server-preview-meta truncate">
                      {node.fqdn} · {node.serverCount} srv · {node.allocationCount} ports
                    </p>
                  </div>
                  <span
                    className={`ds-loc-node-preview-status${node.maintenanceMode ? ' ds-loc-node-preview-status--maint' : ''}`}
                  >
                    {node.maintenanceMode ? 'Maint' : 'Active'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </LocationDetailPanel>

      <div className="ds-loc-ov-grid ds-nst-ov-grid ds-ud-ov-grid">
        <LocationDetailPanel
          tone="connection"
          icon={Fingerprint}
          eyebrow="References"
          title="Identifiers"
          description="Panel references for this location"
        >
          <LocationDetailMetaGrid
            items={[
              {
                label: 'Location ID',
                value: detail.id,
                mono: true,
                onCopy: () => void copyText(detail.id, 'id'),
                copied: copied === 'id',
              },
              {
                label: 'UUID',
                value: detail.uuid,
                mono: true,
                onCopy: () => void copyText(detail.uuid, 'uuid'),
                copied: copied === 'uuid',
              },
              { label: 'Short UUID', value: uuidShort, mono: true },
              { label: 'Created', value: created },
              { label: 'Updated', value: updated },
            ]}
          />
        </LocationDetailPanel>

        <LocationDetailPanel
          tone="trends"
          icon={Server}
          eyebrow="Capacity"
          title="Deployment"
          description="Servers and ports in this region"
          badge={detail.serverCount > 0 ? String(detail.serverCount) : undefined}
          actions={
            <AdminToolButton type="button" onClick={nav.onNodes}>
              Browse nodes
            </AdminToolButton>
          }
        >
          <LocationDetailMetaGrid
            items={[
              { label: 'Active nodes', value: String(activeCount) },
              {
                label: 'Maintenance',
                value: maintenanceCount > 0 ? String(maintenanceCount) : 'None',
              },
              { label: 'Servers', value: String(detail.serverCount) },
              { label: 'Avg servers / node', value: String(avgServers) },
              { label: 'Allocation ports', value: String(portTotal) },
            ]}
          />
          {maintenanceCount > 0 ? (
            <p className="ds-loc-empty-inline ds-nst-empty-inline ds-ud-empty-inline mt-3">
              <Wrench className="inline h-3.5 w-3.5" aria-hidden /> {maintenanceCount} node
              {maintenanceCount === 1 ? '' : 's'} currently in maintenance.
            </p>
          ) : (
            <p className="ds-loc-empty-inline ds-nst-empty-inline ds-ud-empty-inline mt-3">
              {detail.serverCount > 0
                ? `${detail.serverCount} server${detail.serverCount === 1 ? '' : 's'} hosted across this region.`
                : 'No servers are hosted in this region yet.'}
            </p>
          )}
        </LocationDetailPanel>
      </div>
    </div>
  );
}
