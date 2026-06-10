import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Egg,
  HardDrive,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import { useMemo } from 'react';
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

const DOCK_LINKS = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations' },
  { to: '/admin/nests', icon: Egg, label: 'Nests' },
  { to: '/admin/marketplace', icon: Store, label: 'Marketplace' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce' },
  { to: '/admin/activity', icon: Activity, label: 'Activity' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
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

  const now = useMemo(() => {
    const d = new Date();
    return {
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      date: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    };
  }, []);

  const accent = branding.accentColor;
  const accent2 = branding.secondaryColor || accent;

  return (
    <div className="ops" style={{ '--ops-a': accent, '--ops-b': accent2 } as React.CSSProperties}>
      <div className="ops-ambient" aria-hidden />
      <div className="ops-grid-bg" aria-hidden />

      <header className="ops-top">
        <div className="ops-top-copy">
          <p className="ops-kicker">{greetingForHour()}</p>
          <h1 className="ops-headline">
            <span className="ops-headline-name">{name}</span>
            <span className="ops-headline-sep">·</span>
            <PanelName name={branding.panelName} variant="hero" className="ops-headline-panel" />
          </h1>
          <p className="ops-lede">
            Fleet overview — {stats.servers} servers on {stats.nodesOnline} of {stats.nodes} live nodes
          </p>
        </div>
        <div className="ops-top-right">
          <div className="ops-clock">
            <span className="ops-clock-time">{now.time}</span>
            <span className="ops-clock-date">{now.date}</span>
          </div>
          <button
            type="button"
            className="ops-refresh"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {error ? <div className="ops-flash ops-flash--err">{error}</div> : null}

      {hasAlerts && !error ? (
        <div className="ops-flash ops-flash--warn">
          <Zap className="h-4 w-4 shrink-0" />
          <span className="ops-flash-text">
            {nodesOffline > 0 && (
              <>
                {nodesOffline} node{nodesOffline === 1 ? '' : 's'} down
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
          </span>
          <Link to="/admin/nodes" className="ops-flash-link">
            Investigate
          </Link>
        </div>
      ) : null}

      <section className="ops-mosaic" aria-label="Overview">
        <article className="ops-cell ops-cell--health">
          <p className="ops-cell-label">Fleet health</p>
          <div className="ops-dial" style={{ '--pct': health } as React.CSSProperties}>
            <svg viewBox="0 0 120 120" className="ops-dial-svg">
              <circle cx="60" cy="60" r="52" className="ops-dial-track" />
              <circle cx="60" cy="60" r="52" className="ops-dial-fill" />
            </svg>
            <div className="ops-dial-center">
              <span className="ops-dial-num">{health}</span>
              <span className="ops-dial-unit">%</span>
            </div>
          </div>
          <p className="ops-cell-foot">
            {health >= 85 ? 'All systems nominal' : health >= 60 ? 'Minor issues detected' : 'Action required'}
          </p>
        </article>

        <Link to="/admin/servers" className="ops-cell ops-cell--mega ops-cell--link">
          <p className="ops-cell-label">Servers</p>
          <p className="ops-mega">{stats.servers}</p>
          {stats.installing > 0 && (
            <span className="ops-pill ops-pill--blue">{stats.installing} installing</span>
          )}
          {stats.suspended > 0 && (
            <span className="ops-pill ops-pill--amber">{stats.suspended} suspended</span>
          )}
          <ArrowUpRight className="ops-cell-arrow" />
        </Link>

        <Link to="/admin/users" className="ops-cell ops-cell--stat ops-cell--link">
          <Users className="ops-cell-icon" />
          <p className="ops-cell-label">Users</p>
          <p className="ops-stat">{stats.users}</p>
        </Link>

        <Link to="/admin/nodes" className="ops-cell ops-cell--stat ops-cell--link">
          <HardDrive className="ops-cell-icon" />
          <p className="ops-cell-label">Nodes live</p>
          <p className="ops-stat">
            {stats.nodesOnline}
            <span className="ops-stat-dim">/{stats.nodes}</span>
          </p>
        </Link>

        <Link to="/admin/nests" className="ops-cell ops-cell--stat ops-cell--link">
          <Egg className="ops-cell-icon" />
          <p className="ops-cell-label">Nests</p>
          <p className="ops-stat">{stats.nests}</p>
        </Link>

        <article className="ops-cell ops-cell--wide">
          <div className="ops-cell-wide-head">
            <p className="ops-cell-label">Network ports</p>
            <span className="ops-cell-mono">
              {stats.allocationsUsed}/{stats.allocationsTotal} · {allocFree} free
            </span>
          </div>
          <div className="ops-bar">
            <div className="ops-bar-fill" style={{ width: `${Math.max(allocPct > 0 ? 3 : 0, allocPct)}%` }} />
          </div>
          <p className="ops-cell-foot">{allocPct}% of allocations assigned fleet-wide</p>
        </article>

        <div className="ops-cell ops-cell--launch">
          <p className="ops-cell-label">Quick deploy</p>
          <div className="ops-launch-btns">
            <Link to="/admin/servers/new" className="ops-launch-btn ops-launch-btn--ghost">
              <Plus className="h-4 w-4" />
              Server
            </Link>
            <Link to="/admin/nodes/new" className="ops-launch-btn ops-launch-btn--solid">
              <HardDrive className="h-4 w-4" />
              Node
            </Link>
          </div>
          <Link to="/admin/announce" className="ops-launch-secondary">
            <Megaphone className="h-3.5 w-3.5" />
            Post announcement
          </Link>
        </div>
      </section>

      <section className="ops-nodes-section">
        <div className="ops-section-head">
          <div>
            <h2 className="ops-section-title">Infrastructure</h2>
            <p className="ops-section-desc">Wings daemons · capacity & reachability</p>
          </div>
          <Link to="/admin/nodes" className="ops-section-link">
            All nodes
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {nodeHealth.length === 0 ? (
          <div className="ops-nodes-empty">
            <HardDrive className="h-10 w-10 opacity-40" />
            <p>No nodes connected yet</p>
            <Link to="/admin/nodes/new">
              <Button>Register first node</Button>
            </Link>
          </div>
        ) : (
          <div className="ops-nodes-scroller">
            {nodeHealth.map((node) => (
              <NodeSlide key={node.id} node={node} />
            ))}
          </div>
        )}
      </section>

      <div className="ops-duo">
        <section className="ops-panel">
          <div className="ops-section-head">
            <div>
              <h2 className="ops-section-title">Event stream</h2>
              <p className="ops-section-desc">Real-time panel activity</p>
            </div>
            <Link to="/admin/activity" className="ops-section-link">
              Full log
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="ops-panel-empty">Nothing logged yet.</p>
          ) : (
            <ol className="ops-stream">
              {recentActivity.slice(0, 10).map((entry, i) => {
                const meta = getActivityMeta(entry.event);
                return (
                  <li key={entry.id} className="ops-stream-item">
                    <div className="ops-stream-rail">
                      <span className="ops-stream-dot" />
                      {i < Math.min(recentActivity.length, 10) - 1 && <span className="ops-stream-line" />}
                    </div>
                    <div className="ops-stream-body">
                      <p className="ops-stream-text">{entry.description}</p>
                      <p className="ops-stream-meta">
                        {meta.label}
                        {entry.actor?.username ? ` · ${entry.actor.username}` : ''}
                        <span className="ops-stream-time">{formatActivityTime(entry.timestamp)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="ops-panel">
          <div className="ops-section-head">
            <div>
              <h2 className="ops-section-title">Latest servers</h2>
              <p className="ops-section-desc">Recently provisioned</p>
            </div>
            <Link to="/admin/servers" className="ops-section-link">
              Browse all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentServers.length === 0 ? (
            <p className="ops-panel-empty">No servers yet.</p>
          ) : (
            <ul className="ops-server-table">
              {recentServers.map((server) => (
                <ServerRow key={server.id} server={server} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <nav className="ops-dock" aria-label="Quick navigation">
        {DOCK_LINKS.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="ops-dock-item" title={label}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="ops-dock-label">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NodeSlide({ node }: { node: DashboardNodeHealth }) {
  const memPct = node.capacity?.memoryUsedPercent ?? 0;
  const diskPct = node.capacity?.diskUsedPercent ?? 0;
  const online = node.online && !node.maintenanceMode;

  return (
    <Link
      to={`/admin/nodes/${node.id}`}
      className={`ops-node-slide ${online ? 'is-up' : 'is-down'}`}
    >
      <div className="ops-node-slide-top">
        <span className={`ops-node-beacon ${online ? 'is-up' : 'is-down'}`} />
        <div className="min-w-0 flex-1">
          <p className="ops-node-name">{node.name}</p>
          <p className="ops-node-loc">{node.location}</p>
        </div>
        {node.maintenanceMode && <span className="ops-pill ops-pill--amber">Maint</span>}
      </div>
      <p className="ops-node-fqdn">{node.fqdn}</p>
      <div className="ops-node-counts">
        <span>
          <Server className="inline h-3 w-3" /> {node.serverCount}
        </span>
        <span>{node.allocationCount} ports</span>
      </div>
      {node.capacity &&
      (node.capacity.effectiveMemoryLimit > 0 || node.capacity.effectiveDiskLimit > 0) ? (
        <div className="ops-node-meters">
          {node.capacity.effectiveMemoryLimit > 0 && (
            <MiniMeter label="RAM" pct={memPct} />
          )}
          {node.capacity.effectiveDiskLimit > 0 && (
            <MiniMeter label="Disk" pct={diskPct} />
          )}
        </div>
      ) : node.memory > 0 ? (
        <p className="ops-node-fallback">
          {formatResource(node.memory, 'MiB')} · {formatResource(node.disk, 'MiB')}
        </p>
      ) : null}
      <p className="ops-node-status">
        {node.online ? (node.version ? `Wings ${node.version}` : 'Connected') : 'Unreachable'}
      </p>
    </Link>
  );
}

function MiniMeter({ label, pct }: { label: string; pct: number }) {
  const tone = usageTone(pct);
  return (
    <div className="ops-mini">
      <div className="ops-mini-head">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="ops-mini-track">
        <div className={`ops-mini-fill ops-mini-fill--${tone}`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
      </div>
    </div>
  );
}

function ServerRow({ server }: { server: DashboardRecentServer }) {
  return (
    <li>
      <Link to={`/admin/servers/${server.id}`} className="ops-server-row group">
        <span
          className="ops-server-thumb"
          style={{
            background: `linear-gradient(145deg, var(--ops-a), var(--ops-b))`,
          }}
        >
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
        </span>
        <span className="ops-server-info">
          <span className="ops-server-name">{server.name}</span>
          <span className="ops-server-sub">
            {server.egg.name} · {server.node.name} · @{server.owner.username}
          </span>
          <span className="ops-server-addr">
            {formatAllocationAddress(server.defaultAllocation, {
              fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
            })}
          </span>
        </span>
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </Link>
    </li>
  );
}
