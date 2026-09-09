import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Activity,
  HardDrive,
  Plus,
  Server,
} from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { formatResource } from '../../../lib/server-theme';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { fleetHealthScore, type DashboardNodeHealth, type DashboardRecentServer } from '../../../pages/admin/dashboard/types';
import type { AdminDashboardController } from '../../../pages/admin/dashboard/useAdminDashboard';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import { Button, Page } from '../../Layout';
import { EmptyState } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';
import { DashboardCapacityPanel } from './DashboardCapacityPanel';
import { DashboardHeader } from './DashboardHeader';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardStatsStrip } from './DashboardStatsStrip';
import { PanelUpdateBanner } from './PanelUpdateBanner';

export function AdminDashboard({ ctrl }: { ctrl: AdminDashboardController }) {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { stats, nodeHealth, recentServers, recentActivity, error, refreshing, refresh } = ctrl;

  const name = user?.firstName?.trim() || user?.username || 'Admin';
  const health = fleetHealthScore(stats);
  const healthTone = health >= 85 ? 'good' : health >= 60 ? 'warn' : 'bad';
  const nodesOffline = stats.nodes - stats.nodesOnline;
  const hasAlerts = nodesOffline > 0 || stats.suspended > 0 || stats.installing > 0;

  return (
    <Page className="ds-ad">
      <DashboardHeader
        name={name}
        panelName={branding.panelName}
        health={health}
        healthTone={healthTone}
        nodesOnline={stats.nodesOnline}
        nodesTotal={stats.nodes}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      <DashboardStatsStrip stats={stats} />

      <PanelUpdateBanner />

      {error ? (
        <div className="ds-ad-alert ds-ad-alert--error" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Couldn&apos;t load fleet data. Try refreshing — your panel is still secure.
        </div>
      ) : null}

      {hasAlerts && !error ? (
        <div className="ds-ad-alert ds-ad-alert--warn" role="status">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {nodesOffline > 0 && `${nodesOffline} node${nodesOffline === 1 ? '' : 's'} unreachable`}
            {nodesOffline > 0 && (stats.suspended > 0 || stats.installing > 0) && ' · '}
            {stats.suspended > 0 && `${stats.suspended} suspended`}
            {stats.suspended > 0 && stats.installing > 0 && ' · '}
            {stats.installing > 0 && `${stats.installing} installing`}
          </p>
          <Link to="/admin/nodes" className="ds-ad-alert-link">
            View nodes
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      <div className="ds-ad-bento">
        <DashboardCapacityPanel stats={stats} nodeHealth={nodeHealth} />
        <DashboardQuickActions />
      </div>

      <div className="ds-ad-split">
        <section className="ds-ad-card">
          <header className="ds-ad-card-head">
            <div className="ds-ad-card-head-icon" aria-hidden>
              <HardDrive className="ds-icon ds-icon--sm" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ds-ad-card-title">Node fleet</h2>
              <p className="ds-ad-card-desc">Wings capacity and reachability</p>
            </div>
            <div className="ds-ad-card-actions">
              <Link to="/admin/nodes/new" className="ds-ad-card-link">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add
              </Link>
              <Link to="/admin/nodes" className="ds-ad-card-link">
                All
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </header>
          <div className="ds-ad-card-body ds-ad-card-body--scroll">
            {nodeHealth.length === 0 ? (
              <EmptyState
                icon={<HardDrive className="ds-icon ds-icon--md" />}
                title="No nodes connected"
                description="Register a Wings node to start provisioning servers."
                action={
                  <Link to="/admin/nodes/new">
                    <Button size="sm">Register node</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="ds-ad-nodes">
                {nodeHealth.map((node) => (
                  <DashboardNodeCard key={node.id} node={node} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="ds-ad-card ds-ad-card--activity">
          <header className="ds-ad-card-head">
            <div className="ds-ad-card-head-icon" aria-hidden>
              <Activity className="ds-icon ds-icon--sm" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ds-ad-card-title">Recent activity</h2>
              <p className="ds-ad-card-desc">Latest panel events</p>
            </div>
            <Link to="/admin/activity" className="ds-ad-card-link">
              Full log
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </header>
          <div className="ds-ad-card-body ds-ad-card-body--flush ds-ad-card-body--scroll">
            {recentActivity.length === 0 ? (
              <p className="ds-ad-empty-inline">No activity recorded yet.</p>
            ) : (
              <ul className="ds-ad-timeline">
                {recentActivity.slice(0, 10).map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="ds-ad-timeline-item">
                      <span className={`ds-ad-timeline-icon ${meta.color}`} aria-hidden>
                        <Icon className="ds-icon ds-icon--sm" />
                      </span>
                      <div className="ds-ad-timeline-content">
                        <p className="ds-ad-timeline-text">{entry.description}</p>
                        <p className="ds-ad-timeline-meta">
                          <span className={`ds-ad-timeline-badge ${meta.color}`}>{meta.label}</span>
                          {entry.actor?.username ? ` · ${entry.actor.username}` : ''}
                          {' · '}
                          {formatActivityTime(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="ds-ad-card">
        <header className="ds-ad-card-head">
          <div className="ds-ad-card-head-icon" aria-hidden>
            <Server className="ds-icon ds-icon--sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="ds-ad-card-title">Latest servers</h2>
            <p className="ds-ad-card-desc">Recently provisioned game servers</p>
          </div>
          <Link to="/admin/servers" className="ds-ad-card-link">
            All servers
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </header>
        <div className="ds-ad-card-body ds-ad-card-body--flush">
          {recentServers.length === 0 ? (
            <div className="ds-ad-empty-pad">
              <EmptyState
                icon={<Server className="ds-icon ds-icon--md" />}
                title="No servers yet"
                description="Create your first game server to see it listed here."
                action={
                  <Link to="/admin/servers/new">
                    <Button size="sm">Create server</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="ds-ad-servers">
              {recentServers.map((server) => (
                <ServerRow key={server.id} server={server} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </Page>
  );
}

function DashboardNodeCard({ node }: { node: DashboardNodeHealth }) {
  const online = node.online && !node.maintenanceMode;
  const status = node.maintenanceMode ? 'maintenance' : online ? 'online' : 'offline';
  const statusLabel = node.maintenanceMode ? 'Maintenance' : online ? 'Online' : 'Offline';
  const cap = node.capacity;

  return (
    <li>
      <Link to={`/admin/nodes/${node.id}`} className={`ds-ad-node ds-ad-node--${status}`}>
        <div className="ds-ad-node-accent" aria-hidden />
        <div className="ds-ad-node-top">
          <span className="ds-ad-node-icon" aria-hidden>
            <HardDrive className="ds-icon ds-icon--sm" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="ds-ad-node-name">{node.name}</p>
              <span className={`ds-ad-node-badge ds-ad-node-badge--${status}`}>{statusLabel}</span>
            </div>
            <p className="ds-ad-node-meta">{node.location}</p>
          </div>
          <ArrowUpRight className="ds-ad-node-arrow" aria-hidden />
        </div>
        <p className="ds-ad-node-fqdn ds-text-mono">{node.fqdn}</p>
        <div className="ds-ad-node-stats">
          <span>{node.serverCount} servers</span>
          <span>{node.allocationCount} ports</span>
          <span>{node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}</span>
        </div>
        {cap && (cap.effectiveMemoryLimit > 0 || cap.effectiveDiskLimit > 0) ? (
          <div className="ds-ad-node-meters">
            {cap.effectiveMemoryLimit > 0 ? (
              <NodeResourceMeter
                label="RAM"
                used={cap.allocatedMemory}
                limit={cap.effectiveMemoryLimit}
                percent={cap.memoryUsedPercent}
                compact
              />
            ) : null}
            {cap.effectiveDiskLimit > 0 ? (
              <NodeResourceMeter
                label="Disk"
                used={cap.allocatedDisk}
                limit={cap.effectiveDiskLimit}
                percent={cap.diskUsedPercent}
                compact
              />
            ) : null}
          </div>
        ) : node.memory > 0 ? (
          <p className="ds-ad-node-limit">
            {formatResource(node.memory, 'MiB')} RAM · {formatResource(node.disk, 'MiB')} disk
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function ServerRow({ server }: { server: DashboardRecentServer }) {
  return (
    <li>
      <Link to={`/admin/servers/${server.id}`} className="ds-ad-server">
        <span className="ds-ad-server-icon">
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="ds-icon" />
        </span>
        <div className="ds-ad-server-main min-w-0">
          <p className="ds-ad-server-name">{server.name}</p>
          <p className="ds-ad-server-meta">
            @{server.owner.username} · {server.node.name} · {server.egg.name}
          </p>
        </div>
        <span className="ds-ad-server-addr ds-text-mono">
          {formatAllocationAddress(server.defaultAllocation, {
            fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
          })}
        </span>
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
        <ArrowUpRight className="ds-ad-server-arrow" aria-hidden />
      </Link>
    </li>
  );
}
