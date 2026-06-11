import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Egg,
  HardDrive,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { usageTone } from '../../../lib/node-capacity';
import { formatResource } from '../../../lib/server-theme';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { AdminServerStatusBadge } from '../../../components/admin/AdminServerStatus';
import { PanelName } from '../../../components/PanelName';
import { ServerEggIcon } from '../../../components/ServerEggIcon';
import { Button } from '../../../components/Layout';
import {
  fleetHealthScore,
  greetingForHour,
  type DashboardNodeHealth,
  type DashboardRecentServer,
} from './types';
import type { AdminDashboardController } from './useAdminDashboard';

const SHORTCUTS = [
  { to: '/admin/users', icon: Users, label: 'Users', desc: 'Accounts & roles' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations', desc: 'Regions' },
  { to: '/admin/nests', icon: Egg, label: 'Nests & eggs', desc: 'Game configs' },
  { to: '/admin/marketplace', icon: Store, label: 'Marketplace', desc: 'FiveM catalog' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce', desc: 'User messages' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', desc: 'Panel options' },
] as const;

export function DashboardView({ ctrl }: { ctrl: AdminDashboardController }) {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { stats, nodeHealth, recentServers, recentActivity, error, refreshing, refresh } = ctrl;

  const name = user?.firstName?.trim() || user?.username || 'Admin';
  const health = fleetHealthScore(stats);
  const nodesOffline = stats.nodes - stats.nodesOnline;
  const allocPct =
    stats.allocationsTotal > 0 ? Math.round((stats.allocationsUsed / stats.allocationsTotal) * 100) : 0;
  const allocFree = stats.allocationsTotal - stats.allocationsUsed;
  const hasAlerts = nodesOffline > 0 || stats.suspended > 0 || stats.installing > 0;
  const healthTone = health >= 85 ? 'good' : health >= 60 ? 'warn' : 'bad';

  return (
    <div className="adm-dash">
      <header className="adm-dash-header">
        <div className="adm-dash-header-copy">
          <p className="adm-dash-eyebrow">{greetingForHour()}</p>
          <h1 className="adm-dash-title">
            {name}
            <span className="adm-dash-title-sep">·</span>
            <PanelName name={branding.panelName} variant="compact" className="adm-dash-title-panel" />
          </h1>
          <p className="adm-dash-subtitle">
            {stats.servers} servers · {stats.nodesOnline}/{stats.nodes} nodes online · {stats.users} users
          </p>
        </div>
        <div className="adm-dash-header-actions">
          <Link to="/admin/servers/new" className="adm-dash-btn adm-dash-btn--primary">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New server
          </Link>
          <button
            type="button"
            className="adm-dash-btn adm-dash-btn--ghost"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="adm-dash-banner adm-dash-banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {hasAlerts && !error ? (
        <div className="adm-dash-banner adm-dash-banner--warn" role="status">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <p className="adm-dash-banner-text">
            {nodesOffline > 0 && (
              <>
                {nodesOffline} node{nodesOffline === 1 ? '' : 's'} unreachable
                {(stats.suspended > 0 || stats.installing > 0) && ' · '}
              </>
            )}
            {stats.suspended > 0 && (
              <>
                {stats.suspended} suspended
                {stats.installing > 0 && ' · '}
              </>
            )}
            {stats.installing > 0 && <>{stats.installing} installing</>}
          </p>
          <Link to="/admin/nodes" className="adm-dash-banner-link">
            View nodes
          </Link>
        </div>
      ) : null}

      <section className="adm-dash-kpis" aria-label="Key metrics">
        <KpiCard
          to="/admin/servers"
          label="Servers"
          value={String(stats.servers)}
          hint={
            stats.installing > 0 || stats.suspended > 0
              ? `${stats.installing} installing · ${stats.suspended} suspended`
              : 'Fleet total'
          }
          icon={Server}
        />
        <KpiCard
          to="/admin/nodes"
          label="Nodes online"
          value={`${stats.nodesOnline}`}
          hint={stats.nodes > 0 ? `of ${stats.nodes} registered` : 'No nodes yet'}
          icon={HardDrive}
          valueSuffix={stats.nodes > 0 ? `/${stats.nodes}` : undefined}
        />
        <KpiCard to="/admin/users" label="Users" value={String(stats.users)} hint="Panel accounts" icon={Users} />
        <KpiCard to="/admin/nests" label="Nests" value={String(stats.nests)} hint="Egg groups" icon={Egg} />
        <article className="adm-dash-kpi adm-dash-kpi--health">
          <div className="adm-dash-kpi-head">
            <LayoutDashboard className="adm-dash-kpi-icon" aria-hidden />
            <span className="adm-dash-kpi-label">Fleet health</span>
          </div>
          <p className={`adm-dash-kpi-value adm-dash-kpi-value--${healthTone}`}>{health}%</p>
          <p className="adm-dash-kpi-hint">
            {health >= 85 ? 'Operating normally' : health >= 60 ? 'Review warnings' : 'Needs attention'}
          </p>
          <div className="adm-dash-health-bar" aria-hidden>
            <div
              className={`adm-dash-health-fill adm-dash-health-fill--${healthTone}`}
              style={{ width: `${health}%` }}
            />
          </div>
        </article>
        <article className="adm-dash-kpi adm-dash-kpi--alloc">
          <div className="adm-dash-kpi-head">
            <span className="adm-dash-kpi-label">Network ports</span>
            <span className="adm-dash-kpi-mono">
              {stats.allocationsUsed}/{stats.allocationsTotal}
            </span>
          </div>
          <p className="adm-dash-kpi-value adm-dash-kpi-value--sm">{allocPct}%</p>
          <p className="adm-dash-kpi-hint">{allocFree} unassigned</p>
          <div className="adm-dash-health-bar" aria-hidden>
            <div className="adm-dash-health-fill adm-dash-health-fill--neutral" style={{ width: `${allocPct}%` }} />
          </div>
        </article>
      </section>

      <nav className="adm-dash-shortcuts" aria-label="Quick links">
        <p className="adm-dash-shortcuts-label">Quick links</p>
        <ul className="adm-dash-shortcuts-grid">
          {SHORTCUTS.map(({ to, icon: Icon, label, desc }) => (
            <li key={to}>
              <Link to={to} className="adm-dash-shortcut">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="adm-dash-shortcut-label">{label}</span>
                  <span className="adm-dash-shortcut-desc">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="adm-dash-body">
        <section className="adm-dash-panel adm-dash-panel--nodes">
          <header className="adm-dash-panel-head">
            <div>
              <h2 className="adm-dash-panel-title">Nodes</h2>
              <p className="adm-dash-panel-desc">Wings capacity and reachability</p>
            </div>
            <div className="adm-dash-panel-actions">
              <Link to="/admin/nodes/new" className="adm-dash-panel-link">
                <Plus className="h-3 w-3" aria-hidden />
                Add node
              </Link>
              <Link to="/admin/nodes" className="adm-dash-panel-link">
                All nodes
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </header>

          {nodeHealth.length === 0 ? (
            <div className="adm-dash-empty">
              <HardDrive className="h-8 w-8 opacity-40" aria-hidden />
              <p>No nodes connected</p>
              <Link to="/admin/nodes/new">
                <Button size="sm">Register first node</Button>
              </Link>
            </div>
          ) : (
            <div className="adm-dash-node-grid">
              {nodeHealth.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
          )}
        </section>

        <aside className="adm-dash-side">
          <section className="adm-dash-panel adm-dash-panel--activity">
            <header className="adm-dash-panel-head">
              <div>
                <h2 className="adm-dash-panel-title">Recent activity</h2>
                <p className="adm-dash-panel-desc">Latest panel events</p>
              </div>
              <Link to="/admin/activity" className="adm-dash-panel-link">
                Full log
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            </header>
            {recentActivity.length === 0 ? (
              <p className="adm-dash-panel-empty">No activity yet.</p>
            ) : (
              <ul className="adm-dash-activity">
                {recentActivity.slice(0, 8).map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  return (
                    <li key={entry.id} className="adm-dash-activity-item">
                      <span className="adm-dash-activity-dot" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="adm-dash-activity-text">{entry.description}</p>
                        <p className="adm-dash-activity-meta">
                          {meta.label}
                          {entry.actor?.username ? ` · ${entry.actor.username}` : ''}
                          <span className="adm-dash-activity-time">{formatActivityTime(entry.timestamp)}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section className="adm-dash-panel adm-dash-panel--servers">
        <header className="adm-dash-panel-head">
          <div>
            <h2 className="adm-dash-panel-title">Latest servers</h2>
            <p className="adm-dash-panel-desc">Recently provisioned game servers</p>
          </div>
          <Link to="/admin/servers" className="adm-dash-panel-link">
            All servers
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </header>

        {recentServers.length === 0 ? (
          <div className="adm-dash-empty adm-dash-empty--inline">
            <Server className="h-7 w-7 opacity-40" aria-hidden />
            <p>No servers yet</p>
            <Link to="/admin/servers/new">
              <Button size="sm">Create server</Button>
            </Link>
          </div>
        ) : (
          <div className="adm-dash-server-table-wrap">
            <table className="adm-dash-server-table">
              <thead>
                <tr>
                  <th scope="col">Server</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Node</th>
                  <th scope="col">Address</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentServers.map((server) => (
                  <ServerTableRow key={server.id} server={server} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  to,
  label,
  value,
  valueSuffix,
  hint,
  icon: Icon,
}: {
  to: string;
  label: string;
  value: string;
  valueSuffix?: string;
  hint: string;
  icon: typeof Server;
}) {
  return (
    <Link to={to} className="adm-dash-kpi adm-dash-kpi--link">
      <div className="adm-dash-kpi-head">
        <Icon className="adm-dash-kpi-icon" aria-hidden />
        <span className="adm-dash-kpi-label">{label}</span>
      </div>
      <p className="adm-dash-kpi-value">
        {value}
        {valueSuffix ? <span className="adm-dash-kpi-suffix">{valueSuffix}</span> : null}
      </p>
      <p className="adm-dash-kpi-hint">{hint}</p>
      <ArrowUpRight className="adm-dash-kpi-arrow" aria-hidden />
    </Link>
  );
}

function NodeCard({ node }: { node: DashboardNodeHealth }) {
  const memPct = node.capacity?.memoryUsedPercent ?? 0;
  const diskPct = node.capacity?.diskUsedPercent ?? 0;
  const online = node.online && !node.maintenanceMode;

  return (
    <Link to={`/admin/nodes/${node.id}`} className={`adm-dash-node ${online ? 'is-up' : 'is-down'}`}>
      <div className="adm-dash-node-head">
        <span className={`adm-dash-node-dot ${online ? 'is-up' : 'is-down'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="adm-dash-node-name">{node.name}</p>
          <p className="adm-dash-node-meta">{node.location}</p>
        </div>
        {node.maintenanceMode ? <span className="adm-dash-tag">Maint</span> : null}
      </div>
      <p className="adm-dash-node-fqdn">{node.fqdn}</p>
      <div className="adm-dash-node-stats">
        <span>
          <Server className="inline h-3 w-3" aria-hidden /> {node.serverCount} servers
        </span>
        <span>{node.allocationCount} ports</span>
      </div>
      {node.capacity &&
      (node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) ? (
        <div className="adm-dash-node-meters">
          {node.capacity.effectiveMemoryLimit > 0 ? <UsageMeter label="RAM" pct={memPct} /> : null}
          {node.capacity.effectiveDiskLimit > 0 ? <UsageMeter label="Disk" pct={diskPct} /> : null}
        </div>
      ) : node.memory > 0 ? (
        <p className="adm-dash-node-fallback">
          {formatResource(node.memory, 'MiB')} RAM · {formatResource(node.disk, 'MiB')} disk
        </p>
      ) : null}
      <p className="adm-dash-node-status">
        {node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}
      </p>
    </Link>
  );
}

function UsageMeter({ label, pct }: { label: string; pct: number }) {
  const tone = usageTone(pct);
  return (
    <div className="adm-dash-meter">
      <div className="adm-dash-meter-head">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="adm-dash-meter-track">
        <div
          className={`adm-dash-meter-fill adm-dash-meter-fill--${tone}`}
          style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ServerTableRow({ server }: { server: DashboardRecentServer }) {
  return (
    <tr>
      <td>
        <Link to={`/admin/servers/${server.id}`} className="adm-dash-server-cell">
          <span className="adm-dash-server-icon">
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="adm-dash-server-name">{server.name}</span>
            <span className="adm-dash-server-egg">{server.egg.name}</span>
          </span>
        </Link>
      </td>
      <td className="adm-dash-server-owner">@{server.owner.username}</td>
      <td className="adm-dash-server-node">{server.node.name}</td>
      <td className="adm-dash-server-addr">
        {formatAllocationAddress(server.defaultAllocation, {
          fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
        })}
      </td>
      <td>
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </td>
    </tr>
  );
}
