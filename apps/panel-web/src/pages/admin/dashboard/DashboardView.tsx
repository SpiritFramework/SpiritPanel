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
import { Button, Page } from '../../../components/Layout';
import { AlertBanner, DsIcon, EmptyState, toneStyle } from '../../../components/ui';
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
    <Page className="ds-stack">
      <header className="ds-page-header">
        <div className="min-w-0">
          <p className="ds-eyebrow">{greetingForHour()}</p>
          <h1 className="ds-page-title mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {name}
            <span className="font-normal text-[var(--muted)] opacity-60">·</span>
            <PanelName name={branding.panelName} variant="compact" />
          </h1>
          <p className="ds-page-description">
            {stats.servers} servers · {stats.nodesOnline}/{stats.nodes} nodes online · {stats.users} users
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/servers/new" className="ds-btn ds-btn--primary ds-btn--md">
            <DsIcon icon={Plus} />
            New server
          </Link>
          <button
            type="button"
            className="ds-btn ds-btn--secondary ds-btn--md"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`ds-icon ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <AlertBanner tone="error">
          We couldn&apos;t load the latest fleet data. Try refreshing — your panel is still secure.
        </AlertBanner>
      ) : null}

      {hasAlerts && !error ? (
        <AlertBanner tone="warning">
          <AlertTriangle className="ds-icon ds-icon--md shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p>
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
          </div>
          <Link to="/admin/nodes" className="ds-link-quiet shrink-0">
            View nodes
            <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
          </Link>
        </AlertBanner>
      ) : null}

      <section className="ds-metric-grid" aria-label="Key metrics">
        <MetricLink to="/admin/servers" label="Servers" value={String(stats.servers)} hint={
          stats.installing > 0 || stats.suspended > 0
            ? `${stats.installing} installing · ${stats.suspended} suspended`
            : 'Fleet total'
        } icon={Server} />
        <MetricLink
          to="/admin/nodes"
          label="Nodes online"
          value={String(stats.nodesOnline)}
          suffix={stats.nodes > 0 ? `/${stats.nodes}` : undefined}
          hint={stats.nodes > 0 ? 'Registered nodes' : 'No nodes yet'}
          icon={HardDrive}
        />
        <MetricLink to="/admin/users" label="Users" value={String(stats.users)} hint="Panel accounts" icon={Users} />
        <MetricLink to="/admin/nests" label="Nests" value={String(stats.nests)} hint="Egg groups" icon={Egg} />
        <article className="ds-stat-card">
          <div className="flex items-center gap-2">
            <DsIcon icon={LayoutDashboard} className="ds-icon--muted" />
            <span className="ds-text-xs ds-text-muted font-medium">Fleet health</span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums tracking-tight" style={{ color: healthTone === 'good' ? 'var(--success-fg)' : healthTone === 'warn' ? 'var(--warning-fg)' : 'var(--danger-fg)' }}>
            {health}%
          </p>
          <p className="ds-text-xs ds-text-muted mt-0.5">
            {health >= 85 ? 'Operating normally' : health >= 60 ? 'Review warnings' : 'Needs attention'}
          </p>
          <div className="ds-progress mt-2" aria-hidden>
            <div className={`ds-progress-fill ds-progress-fill--${healthTone === 'good' ? 'good' : healthTone === 'warn' ? 'warn' : 'bad'}`} style={{ width: `${health}%` }} />
          </div>
        </article>
        <article className="ds-stat-card">
          <div className="flex items-center justify-between gap-2">
            <span className="ds-text-xs ds-text-muted font-medium">Network ports</span>
            <span className="ds-text-xs ds-text-mono ds-text-muted">
              {stats.allocationsUsed}/{stats.allocationsTotal}
            </span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">{allocPct}%</p>
          <p className="ds-text-xs ds-text-muted mt-0.5">{allocFree} unassigned</p>
          <div className="ds-progress mt-2" aria-hidden>
            <div className="ds-progress-fill ds-progress-fill--neutral" style={{ width: `${allocPct}%` }} />
          </div>
        </article>
      </section>

      <nav aria-label="Quick links">
        <p className="ds-section-title">Quick links</p>
        <ul className="ds-shortcut-grid">
          {SHORTCUTS.map(({ to, icon: Icon, label, desc }) => (
            <li key={to}>
              <Link to={to} className="ds-shortcut">
                <DsIcon icon={Icon} className="ds-icon--muted mt-0.5" />
                <span className="min-w-0">
                  <span className="ds-shortcut-label">{label}</span>
                  <span className="ds-shortcut-desc">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ds-layout-main-side">
        <section className="ds-card">
          <header className="ds-card-header">
            <div>
              <h2 className="ds-card-title">
                <DsIcon icon={HardDrive} className="ds-icon--muted" />
                Nodes
              </h2>
              <p className="ds-text-xs ds-text-muted mt-0.5">Wings capacity and reachability</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/admin/nodes/new" className="ds-link-quiet">
                <Plus className="ds-icon ds-icon--sm" aria-hidden />
                Add node
              </Link>
              <Link to="/admin/nodes" className="ds-link-quiet">
                All nodes
                <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
              </Link>
            </div>
          </header>
          <div className="ds-card-body ds-card-body--compact">
            {nodeHealth.length === 0 ? (
              <EmptyState
                icon={<HardDrive className="ds-icon ds-icon--md" />}
                title="No nodes connected"
                description="Register a Wings node to start provisioning servers and tracking capacity."
                action={
                  <Link to="/admin/nodes/new">
                    <Button size="sm">Register first node</Button>
                  </Link>
                }
              />
            ) : (
              <div className="ds-node-grid">
                {nodeHealth.map((node) => (
                  <NodeCard key={node.id} node={node} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="ds-card">
          <header className="ds-card-header">
            <div>
              <h2 className="ds-card-title">Recent activity</h2>
              <p className="ds-text-xs ds-text-muted mt-0.5">Latest panel events</p>
            </div>
            <Link to="/admin/activity" className="ds-link-quiet">
              Full log
              <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
            </Link>
          </header>
          <div className="ds-card-body ds-card-body--compact">
            {recentActivity.length === 0 ? (
              <p className="ds-text-sm ds-text-muted py-4 text-center">No activity recorded yet.</p>
            ) : (
              <ul className="ds-activity-list">
                {recentActivity.slice(0, 8).map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  return (
                    <li key={entry.id} className="ds-activity-item">
                      <span className="ds-activity-dot" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="ds-text-sm">{entry.description}</p>
                        <p className="ds-text-xs ds-text-muted mt-0.5">
                          {meta.label}
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

      <section className="ds-card">
        <header className="ds-card-header">
          <div>
            <h2 className="ds-card-title">
              <DsIcon icon={Server} className="ds-icon--muted" />
              Latest servers
            </h2>
            <p className="ds-text-xs ds-text-muted mt-0.5">Recently provisioned game servers</p>
          </div>
          <Link to="/admin/servers" className="ds-link-quiet">
            All servers
            <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
          </Link>
        </header>
        <div className="ds-card-body ds-card-body--compact">
          {recentServers.length === 0 ? (
            <EmptyState
              icon={<Server className="ds-icon ds-icon--md" />}
              title="No servers yet"
              description="Create your first game server to see it listed here with live status."
              action={
                <Link to="/admin/servers/new">
                  <Button size="sm">Create server</Button>
                </Link>
              }
            />
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
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
        </div>
      </section>
    </Page>
  );
}

function MetricLink({
  to,
  label,
  value,
  suffix,
  hint,
  icon: Icon,
}: {
  to: string;
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  icon: typeof Server;
}) {
  return (
    <Link to={to} className="ds-stat-card ds-stat-card--link">
      <div className="flex items-center gap-2">
        <span className="rounded-md border p-1" style={toneStyle('neutral')}>
          <Icon className="ds-icon" aria-hidden />
        </span>
        <span className="ds-text-xs ds-text-muted font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums tracking-tight">
        {value}
        {suffix ? <span className="text-base font-semibold text-[var(--muted)]">{suffix}</span> : null}
      </p>
      <p className="ds-text-xs ds-text-muted mt-0.5">{hint}</p>
      <ArrowUpRight className="ds-stat-card-arrow" aria-hidden />
    </Link>
  );
}

function NodeCard({ node }: { node: DashboardNodeHealth }) {
  const memPct = node.capacity?.memoryUsedPercent ?? 0;
  const diskPct = node.capacity?.diskUsedPercent ?? 0;
  const online = node.online && !node.maintenanceMode;

  return (
    <Link to={`/admin/nodes/${node.id}`} className="ds-node-card">
      <div className="flex items-start gap-2">
        <span className={`ds-status-dot ${online ? 'ds-status-dot--up' : 'ds-status-dot--down'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="ds-text-sm font-semibold truncate">{node.name}</p>
          <p className="ds-text-xs ds-text-muted truncate">{node.location}</p>
        </div>
        {node.maintenanceMode ? <span className="ds-tag">Maint</span> : null}
      </div>
      <p className="ds-text-xs ds-text-muted truncate">{node.fqdn}</p>
      <div className="flex flex-wrap gap-3 ds-text-xs ds-text-muted">
        <span className="inline-flex items-center gap-1">
          <Server className="ds-icon ds-icon--sm" aria-hidden />
          {node.serverCount} servers
        </span>
        <span>{node.allocationCount} ports</span>
      </div>
      {node.capacity && (node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) ? (
        <div className="space-y-2">
          {node.capacity.effectiveMemoryLimit > 0 ? <UsageMeter label="RAM" pct={memPct} /> : null}
          {node.capacity.effectiveDiskLimit > 0 ? <UsageMeter label="Disk" pct={diskPct} /> : null}
        </div>
      ) : node.memory > 0 ? (
        <p className="ds-text-xs ds-text-muted">
          {formatResource(node.memory, 'MiB')} RAM · {formatResource(node.disk, 'MiB')} disk
        </p>
      ) : null}
      <p className="ds-text-xs ds-text-muted">
        {node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}
      </p>
    </Link>
  );
}

function UsageMeter({ label, pct }: { label: string; pct: number }) {
  const tone = usageTone(pct);
  const fillClass =
    tone === 'success'
      ? 'ds-progress-fill--good'
      : tone === 'warning'
        ? 'ds-progress-fill--warn'
        : 'ds-progress-fill--bad';
  return (
    <div>
      <div className="flex justify-between ds-text-xs ds-text-muted mb-1">
        <span>{label}</span>
        <span className="ds-text-mono">{pct}%</span>
      </div>
      <div className="ds-progress">
        <div className={`ds-progress-fill ${fillClass}`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
      </div>
    </div>
  );
}

function ServerTableRow({ server }: { server: DashboardRecentServer }) {
  return (
    <tr>
      <td>
        <Link to={`/admin/servers/${server.id}`} className="flex items-center gap-2 min-w-0 ds-text-sm font-medium hover:underline">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]">
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="ds-icon" />
          </span>
          <span className="min-w-0">
            <span className="block truncate">{server.name}</span>
            <span className="block truncate ds-text-xs ds-text-muted font-normal">{server.egg.name}</span>
          </span>
        </Link>
      </td>
      <td className="ds-text-sm ds-text-muted">@{server.owner.username}</td>
      <td className="ds-text-sm">{server.node.name}</td>
      <td className="ds-text-xs ds-text-mono ds-text-muted">
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
