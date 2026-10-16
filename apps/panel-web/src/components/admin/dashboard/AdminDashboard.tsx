import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  HardDrive,
  Plus,
  Server,
} from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { formatResource } from '../../../lib/server-theme';
import { useAuth } from '../../../context/AuthContext';
import type { DashboardNodeHealth, DashboardRecentServer } from '../../../pages/admin/dashboard/types';
import type { AdminDashboardController } from '../../../pages/admin/dashboard/useAdminDashboard';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import { Button, Page } from '../../Layout';
import { EmptyState } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';
import { DashboardAttentionStrip } from './DashboardAttentionStrip';
import { DashboardCapacityPanel } from './DashboardCapacityPanel';
import { DashboardHeader } from './DashboardHeader';
import { DashboardQuickActions } from './DashboardQuickActions';
import { PanelUpdateBanner } from './PanelUpdateBanner';

export function AdminDashboard({ ctrl }: { ctrl: AdminDashboardController }) {
  const { user } = useAuth();
  const { stats, ticketQueue, nodeHealth, recentServers, recentActivity, error, refreshing, refresh } =
    ctrl;

  const name = user?.firstName?.trim() || user?.username || 'Admin';

  return (
    <Page className="ds-admin-dash">
      <DashboardHeader
        name={name}
        stats={stats}
        ticketQueue={ticketQueue}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      <PanelUpdateBanner />

      {error ? (
        <div className="ds-admin-dash__alert ds-admin-dash__alert--error" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Couldn&apos;t load fleet data. Try refreshing — your panel is still secure.
        </div>
      ) : null}

      {!error ? <DashboardAttentionStrip stats={stats} ticketQueue={ticketQueue} /> : null}

      <div className="ds-admin-dash__mid">
        <DashboardCapacityPanel stats={stats} nodeHealth={nodeHealth} />
        <DashboardQuickActions />
      </div>

      <div className="ds-admin-dash__split">
        <section className="ds-admin-dash__card">
          <header className="ds-admin-dash__card-head">
            <div className="ds-admin-dash__card-head-icon" aria-hidden>
              <HardDrive className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ds-admin-dash__card-title">Node fleet</h2>
              <p className="ds-admin-dash__card-desc">Wings capacity and reachability</p>
            </div>
            <div className="ds-admin-dash__card-actions">
              <Link to="/admin/nodes/new" className="ds-admin-dash__card-link">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add
              </Link>
              <Link to="/admin/nodes" className="ds-admin-dash__card-link">
                All
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </header>
          <div className="ds-admin-dash__card-body ds-admin-dash__card-body--scroll">
            {nodeHealth.length === 0 ? (
              <EmptyState
                icon={<HardDrive className="h-6 w-6" />}
                title="No nodes connected"
                description="Register a Wings node to start provisioning servers."
                action={
                  <Link to="/admin/nodes/new">
                    <Button size="sm">Register node</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="ds-admin-dash__nodes">
                {nodeHealth.map((node) => (
                  <DashboardNodeCard key={node.id} node={node} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="ds-admin-dash__card">
          <header className="ds-admin-dash__card-head">
            <div className="ds-admin-dash__card-head-icon" aria-hidden>
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="ds-admin-dash__card-title">Recent activity</h2>
              <p className="ds-admin-dash__card-desc">Latest panel events</p>
            </div>
            <Link to="/admin/activity" className="ds-admin-dash__card-link">
              Full log
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </header>
          <div className="ds-admin-dash__card-body ds-admin-dash__card-body--flush ds-admin-dash__card-body--scroll">
            {recentActivity.length === 0 ? (
              <p className="ds-admin-dash__empty-inline">No activity recorded yet.</p>
            ) : (
              <ul className="ds-admin-dash__timeline">
                {recentActivity.slice(0, 10).map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  const Icon = meta.icon;
                  const body = (
                    <>
                      <span className={`ds-admin-dash__timeline-icon ${meta.color}`} aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="ds-admin-dash__timeline-content">
                        <p className="ds-admin-dash__timeline-text">{entry.description}</p>
                        <p className="ds-admin-dash__timeline-meta">
                          <span className={`ds-admin-dash__timeline-badge ${meta.color}`}>{meta.label}</span>
                          {entry.actor?.username ? ` · ${entry.actor.username}` : ''}
                          {' · '}
                          {formatActivityTime(entry.timestamp)}
                        </p>
                      </div>
                    </>
                  );
                  return (
                    <li key={entry.id} className="ds-admin-dash__timeline-item">
                      {entry.server?.id ? (
                        <Link to={`/admin/servers/${entry.server.id}`} className="ds-admin-dash__timeline-link">
                          {body}
                        </Link>
                      ) : (
                        <div className="ds-admin-dash__timeline-link">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="ds-admin-dash__card">
        <header className="ds-admin-dash__card-head">
          <div className="ds-admin-dash__card-head-icon" aria-hidden>
            <Server className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="ds-admin-dash__card-title">Latest servers</h2>
            <p className="ds-admin-dash__card-desc">Recently provisioned game servers</p>
          </div>
          <Link to="/admin/servers" className="ds-admin-dash__card-link">
            All servers
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </header>
        <div className="ds-admin-dash__card-body ds-admin-dash__card-body--flush">
          {recentServers.length === 0 ? (
            <div className="ds-admin-dash__empty-pad">
              <EmptyState
                icon={<Server className="h-6 w-6" />}
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
            <ul className="ds-admin-dash__servers">
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
      <Link to={`/admin/nodes/${node.id}`} className={`ds-admin-dash__node ds-admin-dash__node--${status}`}>
        <div className="ds-admin-dash__node-top">
          <span className="ds-admin-dash__node-icon" aria-hidden>
            <HardDrive className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="ds-admin-dash__node-name">{node.name}</p>
              <span className={`ds-admin-dash__node-badge ds-admin-dash__node-badge--${status}`}>
                {statusLabel}
              </span>
            </div>
            <p className="ds-admin-dash__node-meta">{node.location}</p>
          </div>
          <ArrowUpRight className="ds-admin-dash__node-arrow" aria-hidden />
        </div>
        <p className="ds-admin-dash__node-fqdn ds-text-mono">{node.fqdn}</p>
        <div className="ds-admin-dash__node-stats">
          <span>{node.serverCount} servers</span>
          <span>{node.allocationCount} ports</span>
          <span>{node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}</span>
        </div>
        {cap && (cap.effectiveMemoryLimit > 0 || cap.effectiveDiskLimit > 0) ? (
          <div className="ds-admin-dash__node-meters">
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
          <p className="ds-admin-dash__node-limit">
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
      <Link to={`/admin/servers/${server.id}`} className="ds-admin-dash__server">
        <span className="ds-admin-dash__server-icon">
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
        </span>
        <div className="ds-admin-dash__server-main min-w-0">
          <p className="ds-admin-dash__server-name">{server.name}</p>
          <p className="ds-admin-dash__server-meta">
            @{server.owner.username} · {server.node.name} · {server.egg.name}
          </p>
        </div>
        <span className="ds-admin-dash__server-addr ds-text-mono">
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
        <ArrowUpRight className="ds-admin-dash__server-arrow" aria-hidden />
      </Link>
    </li>
  );
}
