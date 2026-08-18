import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
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
import { formatResource } from '../../../lib/server-theme';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import { PanelName } from '../../PanelName';
import { ServerEggIcon } from '../../ServerEggIcon';
import { Button, Page } from '../../Layout';
import { EmptyState } from '../../ui';
import {
  fleetHealthScore,
  greetingForHour,
  type DashboardNodeHealth,
  type DashboardRecentServer,
} from '../../../pages/admin/dashboard/types';
import type { AdminDashboardController } from '../../../pages/admin/dashboard/useAdminDashboard';

const SHORTCUTS = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations' },
  { to: '/admin/nests', icon: Egg, label: 'Nests' },
  { to: '/admin/marketplace', icon: Store, label: 'Marketplace' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
] as const;

export function AdminDashboard({ ctrl }: { ctrl: AdminDashboardController }) {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { stats, nodeHealth, recentServers, recentActivity, error, refreshing, refresh } = ctrl;

  const name = user?.firstName?.trim() || user?.username || 'Admin';
  const health = fleetHealthScore(stats);
  const nodesOffline = stats.nodes - stats.nodesOnline;
  const allocPct =
    stats.allocationsTotal > 0 ? Math.round((stats.allocationsUsed / stats.allocationsTotal) * 100) : 0;
  const allocFree = Math.max(0, stats.allocationsTotal - stats.allocationsUsed);
  const hasAlerts = nodesOffline > 0 || stats.suspended > 0 || stats.installing > 0;
  const healthTone = health >= 85 ? 'good' : health >= 60 ? 'warn' : 'bad';
  const heroTone = nodesOffline > 0 ? 'warn' : health < 60 ? 'bad' : 'good';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Page className="ds-ad">
      <header className={`ds-ad-hero ds-ad-hero--${heroTone}`}>
        <div className="ds-ad-hero-glow" aria-hidden />
        <div className="ds-ad-hero-glow ds-ad-hero-glow--right" aria-hidden />

        <div className="ds-ad-hero-inner">
          <div className="ds-ad-hero-copy">
            <p className="ds-ad-hero-eyebrow">
              {greetingForHour()}, {name}
              <span aria-hidden>·</span>
              {today}
            </p>
            <h1 className="ds-ad-hero-title">
              <PanelName name={branding.panelName} variant="compact" />
            </h1>
            <p className="ds-ad-hero-sub">
              Live fleet overview — nodes, capacity, and recent provisioning.
            </p>
            <div className="ds-ad-hero-actions">
              <Link to="/admin/servers/new" className="ds-btn ds-btn--primary ds-btn--sm">
                <Plus className="ds-icon ds-icon--sm" aria-hidden />
                New server
              </Link>
              <Link to="/admin/nodes/new" className="ds-btn ds-btn--secondary ds-btn--sm">
                <HardDrive className="ds-icon ds-icon--sm" aria-hidden />
                Add node
              </Link>
              <button
                type="button"
                className="ds-btn ds-btn--ghost ds-btn--sm"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw className={`ds-icon ds-icon--sm${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
            </div>
          </div>

          <div className="ds-ad-hero-pulse" aria-label={`Fleet health ${health}%`}>
            <HealthRing percent={health} tone={healthTone} />
            <div>
              <span className="ds-ad-hero-pulse-label">Fleet health</span>
              <strong className="ds-ad-hero-pulse-value">{health}%</strong>
              <small>
                {health >= 85 ? 'Operating normally' : health >= 60 ? 'Review warnings' : 'Needs attention'}
              </small>
            </div>
          </div>
        </div>

        <div className="ds-ad-kpis" aria-label="Key metrics">
          <KpiCard to="/admin/servers" icon={Server} label="Servers" value={String(stats.servers)} hint={stats.installing > 0 ? `${stats.installing} installing` : `${stats.suspended} suspended`} />
          <KpiCard to="/admin/nodes" icon={HardDrive} label="Nodes" value={`${stats.nodesOnline}/${stats.nodes}`} hint={nodesOffline > 0 ? `${nodesOffline} offline` : 'All reachable'} />
          <KpiCard to="/admin/users" icon={Users} label="Users" value={String(stats.users)} hint="Panel accounts" />
          <KpiCard to="/admin/nests" icon={Egg} label="Nests" value={String(stats.nests)} hint="Egg groups" />
          <KpiCard
            to="/admin/locations"
            icon={MapPin}
            label="Ports"
            value={`${stats.allocationsUsed}/${stats.allocationsTotal || '—'}`}
            hint={`${allocFree} free · ${allocPct}% used`}
          />
        </div>
      </header>

      {error ? (
        <div className="ds-ad-banner ds-ad-banner--error">
          Couldn&apos;t load fleet data. Try refreshing — your panel is still secure.
        </div>
      ) : null}

      {hasAlerts && !error ? (
        <div className="ds-ad-banner ds-ad-banner--warn">
          <AlertTriangle className="ds-icon ds-icon--sm shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {nodesOffline > 0 && `${nodesOffline} node${nodesOffline === 1 ? '' : 's'} unreachable`}
            {nodesOffline > 0 && (stats.suspended > 0 || stats.installing > 0) && ' · '}
            {stats.suspended > 0 && `${stats.suspended} suspended`}
            {stats.suspended > 0 && stats.installing > 0 && ' · '}
            {stats.installing > 0 && `${stats.installing} installing`}
          </p>
          <Link to="/admin/nodes" className="ds-ad-banner-link">
            View nodes
            <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
          </Link>
        </div>
      ) : null}

      <nav className="ds-ad-rail" aria-label="Quick links">
        {SHORTCUTS.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="ds-ad-rail-link">
            <Icon className="ds-icon ds-icon--sm" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ds-ad-gauges">
        <GaugeCard
          icon={LayoutDashboard}
          label="Fleet health"
          value={`${health}%`}
          hint={health >= 85 ? 'Nodes online and servers stable' : 'Check offline nodes or suspended servers'}
          percent={health}
          tone={healthTone}
        />
        <GaugeCard
          icon={MapPin}
          label="Port allocation"
          value={`${allocPct}%`}
          hint={`${allocFree} unassigned · ${stats.allocationsUsed} in use`}
          percent={allocPct}
          tone={allocPct >= 90 ? 'bad' : allocPct >= 75 ? 'warn' : 'good'}
        />
      </div>

      <div className="ds-ad-columns">
        <section className="ds-ad-panel">
          <header className="ds-ad-panel-head">
            <div>
              <h2 className="ds-ad-panel-title">
                <HardDrive className="ds-icon ds-icon--sm" aria-hidden />
                Node fleet
              </h2>
              <p className="ds-ad-panel-desc">Wings capacity and reachability</p>
            </div>
            <div className="ds-ad-panel-actions">
              <Link to="/admin/nodes/new" className="ds-ad-panel-link">
                <Plus className="ds-icon ds-icon--sm" aria-hidden />
                Add
              </Link>
              <Link to="/admin/nodes" className="ds-ad-panel-link">
                All nodes
                <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
              </Link>
            </div>
          </header>
          <div className="ds-ad-panel-body">
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
              <ul className="ds-ad-node-grid">
                {nodeHealth.map((node) => (
                  <DashboardNodeCard key={node.id} node={node} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="ds-ad-panel">
          <header className="ds-ad-panel-head">
            <div>
              <h2 className="ds-ad-panel-title">Recent activity</h2>
              <p className="ds-ad-panel-desc">Latest panel events</p>
            </div>
            <Link to="/admin/activity" className="ds-ad-panel-link">
              Full log
              <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
            </Link>
          </header>
          <div className="ds-ad-panel-body ds-ad-panel-body--flush">
            {recentActivity.length === 0 ? (
              <p className="ds-ad-empty">No activity recorded yet.</p>
            ) : (
              <ul className="ds-ad-activity">
                {recentActivity.slice(0, 8).map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="ds-ad-activity-row">
                      <span className={`ds-ad-activity-icon ${meta.color}`} aria-hidden>
                        <Icon className="ds-icon ds-icon--sm" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ds-ad-activity-text">{entry.description}</p>
                        <p className="ds-ad-activity-meta">
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

      <section className="ds-ad-panel">
        <header className="ds-ad-panel-head">
          <div>
            <h2 className="ds-ad-panel-title">
              <Server className="ds-icon ds-icon--sm" aria-hidden />
              Latest servers
            </h2>
            <p className="ds-ad-panel-desc">Recently provisioned game servers</p>
          </div>
          <Link to="/admin/servers" className="ds-ad-panel-link">
            All servers
            <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
          </Link>
        </header>
        <div className="ds-ad-panel-body ds-ad-panel-body--flush">
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
            <ul className="ds-ad-server-list">
              {recentServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </Page>
  );
}

function HealthRing({ percent, tone }: { percent: number; tone: 'good' | 'warn' | 'bad' }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const stroke =
    tone === 'good' ? 'var(--success)' : tone === 'warn' ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="ds-ad-health-ring" aria-hidden>
      <svg viewBox="0 0 84 84" className="ds-ad-health-ring-svg">
        <circle cx="42" cy="42" r={radius} className="ds-ad-health-ring-track" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          className="ds-ad-health-ring-progress"
          stroke={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <span className="ds-ad-health-ring-value">{percent}</span>
    </div>
  );
}

function KpiCard({
  to,
  icon: Icon,
  label,
  value,
  hint,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link to={to} className="ds-ad-kpi">
      <span className="ds-ad-kpi-icon" aria-hidden>
        <Icon className="ds-icon ds-icon--sm" />
      </span>
      <span className="ds-ad-kpi-copy">
        <span className="ds-ad-kpi-label">{label}</span>
        <strong className="ds-ad-kpi-value">{value}</strong>
        <small className="ds-ad-kpi-hint">{hint}</small>
      </span>
      <ArrowUpRight className="ds-ad-kpi-arrow" aria-hidden />
    </Link>
  );
}

function GaugeCard({
  icon: Icon,
  label,
  value,
  hint,
  percent,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  percent: number;
  tone: 'good' | 'warn' | 'bad';
}) {
  const fill =
    tone === 'good' ? 'ds-progress-fill--good' : tone === 'warn' ? 'ds-progress-fill--warn' : 'ds-progress-fill--bad';
  return (
    <div className={`ds-ad-gauge ds-ad-gauge--${tone}`}>
      <div className="ds-ad-gauge-top">
        <span className="ds-ad-gauge-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0">
          <span className="ds-ad-gauge-label">{label}</span>
          <span className="ds-ad-gauge-value">{value}</span>
        </div>
      </div>
      <p className="ds-ad-gauge-hint">{hint}</p>
      <div className="ds-progress ds-ad-gauge-bar" aria-hidden>
        <div className={`ds-progress-fill ${fill}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}

function DashboardNodeCard({ node }: { node: DashboardNodeHealth }) {
  const online = node.online && !node.maintenanceMode;
  const status = node.maintenanceMode ? 'maintenance' : online ? 'online' : 'offline';
  const statusLabel = node.maintenanceMode ? 'Maintenance' : online ? 'Online' : 'Offline';
  const cap = node.capacity;

  return (
    <li>
      <Link to={`/admin/nodes/${node.id}`} className={`ds-ad-node-card ds-ad-node-card--${status}`}>
        <div className="ds-ad-node-card-accent" aria-hidden />
        <div className="ds-ad-node-card-top">
          <span className="ds-ad-node-card-icon" aria-hidden>
            <HardDrive className="ds-icon ds-icon--sm" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="ds-ad-node-card-name">{node.name}</p>
              <span className={`ds-ad-node-card-badge ds-ad-node-card-badge--${status}`}>{statusLabel}</span>
            </div>
            <p className="ds-ad-node-card-meta">{node.location}</p>
          </div>
          <ArrowUpRight className="ds-ad-node-card-arrow" aria-hidden />
        </div>
        <p className="ds-ad-node-card-fqdn font-mono">{node.fqdn}</p>
        <div className="ds-ad-node-card-stats">
          <span>{node.serverCount} servers</span>
          <span>{node.allocationCount} ports</span>
          <span>{node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}</span>
        </div>
        {cap && (cap.effectiveMemoryLimit > 0 || cap.effectiveDiskLimit > 0) ? (
          <div className="ds-ad-node-card-meters">
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
          <p className="ds-ad-node-card-limit">
            {formatResource(node.memory, 'MiB')} RAM · {formatResource(node.disk, 'MiB')} disk
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function ServerCard({ server }: { server: DashboardRecentServer }) {
  return (
    <li>
      <Link to={`/admin/servers/${server.id}`} className="ds-ad-server-card">
        <span className="ds-ad-server-card-icon">
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="ds-icon" />
        </span>
        <div className="ds-ad-server-card-main min-w-0">
          <p className="ds-ad-server-card-name">{server.name}</p>
          <p className="ds-ad-server-card-meta">
            @{server.owner.username} · {server.node.name} · {server.egg.name}
          </p>
        </div>
        <span className="ds-ad-server-card-addr font-mono">
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
        <ArrowUpRight className="ds-ad-server-card-arrow" aria-hidden />
      </Link>
    </li>
  );
}
