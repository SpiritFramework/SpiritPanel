import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CircleOff,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  MemoryStick,
  Pause,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import {
  api,
  type StatusNodePayload,
  type StatusNodesResponse,
  type StatusTone,
  type User,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { LocationFlag } from '../../components/LocationFlag';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { Button, ClientLayout, Page } from '../../components/Layout';
import { BrandMark } from '../../components/Nav';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AlertBanner, DsIcon, EmptyState, Spinner, StatusPill, type Tone } from '../../components/ui';
import { formatBytes } from '../../lib/stats';
import { formatCpuLimit, formatResource, formatResourceAmount } from '../../lib/server-theme';

const GAUGE_RADIUS = 42;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function displayName(user: User): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.username;
}

function toneToPill(tone: StatusTone): Tone {
  return tone === 'muted' ? 'neutral' : tone;
}

function meterFillClass(percent: number, kind: 'live' | 'allocated'): string {
  const base = kind === 'live' ? 'ds-status-meter-fill--live' : 'ds-status-meter-fill--allocated';
  if (percent >= 90) return `${base} ds-status-meter-fill--bad`;
  if (percent >= 75) return `${base} ds-status-meter-fill--warn`;
  return base;
}

function formatUpdatedAt(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function DualMeter({
  label,
  icon: Icon,
  liveLabel,
  allocatedLabel,
  livePercent,
  allocatedPercent,
  limitName,
  limitValue,
}: {
  label: string;
  icon: LucideIcon;
  liveLabel: string;
  allocatedLabel: string;
  livePercent: number;
  allocatedPercent: number;
  limitName?: string;
  limitValue?: string;
}) {
  const livePct = Math.max(0, Math.min(100, livePercent));
  const allocPct = Math.max(0, Math.min(100, allocatedPercent));

  return (
    <div className="ds-status-meter">
      <p className="ds-status-meter-label">
        <Icon className="ds-status-meter-icon" aria-hidden />
        {label}
      </p>
      <div className="ds-status-meter-pair">
        <div className="ds-status-meter-line">
          <span className="ds-status-meter-kind">Live</span>
          <div className="ds-status-meter-track" aria-hidden>
            <div
              className={`ds-status-meter-fill ${meterFillClass(livePct, 'live')}`}
              style={{ width: `${livePct}%` }}
            />
          </div>
          <span className="ds-status-meter-value">{liveLabel}</span>
        </div>
        <div className="ds-status-meter-line">
          <span className="ds-status-meter-kind">Allocated</span>
          <div className="ds-status-meter-track" aria-hidden>
            <div
              className={`ds-status-meter-fill ${meterFillClass(allocPct, 'allocated')}`}
              style={{ width: `${allocPct}%` }}
            />
          </div>
          <span className="ds-status-meter-value">{allocatedLabel}</span>
        </div>
      </div>
      {limitName && limitValue ? (
        <div className="ds-status-meter-limit">
          <span className="ds-status-meter-limit-name">{limitName}</span>
          <span className="ds-status-meter-limit-value">{limitValue}</span>
        </div>
      ) : null}
    </div>
  );
}

function FleetHealthGauge({
  online,
  total,
}: {
  online: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  const offset = GAUGE_CIRCUMFERENCE * (1 - pct / 100);
  const tone = total === 0 ? 'ok' : pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'bad';

  return (
    <div
      className={`ds-status-gauge ds-status-gauge--${tone}`}
      style={
        {
          '--gauge-circumference': GAUGE_CIRCUMFERENCE,
          '--gauge-offset': offset,
        } as CSSProperties
      }
      role="img"
      aria-label={`${online} of ${total} nodes online`}
    >
      <div className="ds-status-gauge-ring" aria-hidden />
      {tone !== 'bad' ? <div className="ds-status-gauge-pulse" aria-hidden /> : null}
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="ds-status-gauge-track" cx="50" cy="50" r={GAUGE_RADIUS} />
        <circle className="ds-status-gauge-arc" cx="50" cy="50" r={GAUGE_RADIUS} />
      </svg>
      <div className="ds-status-gauge-center">
        <span className="ds-status-gauge-value">{total > 0 ? `${pct}%` : '—'}</span>
        <span className="ds-status-gauge-label">Online</span>
      </div>
    </div>
  );
}

function nodeEdgeClass(node: StatusNodePayload): string {
  if (node.maintenanceMode) return 'ds-status-node--maintenance';
  if (node.online) return 'ds-status-node--online';
  return 'ds-status-node--offline';
}

function NodeBoard({
  node,
  showServers,
  index,
}: {
  node: StatusNodePayload;
  showServers: boolean;
  index: number;
}) {
  const live = node.live;
  const cpuLimit = node.allocated.cpuLimit;
  const cpuAllocated = node.allocated.cpuAllocated;
  const cpuCores = node.allocated.cpuCores;
  const liveCpu = live?.cpuPercent ?? 0;
  const liveCpuPct =
    cpuLimit > 0 ? Math.min(100, Math.round((liveCpu / cpuLimit) * 100)) : Math.min(100, Math.round(liveCpu));
  const allocatedCpuPct =
    cpuLimit > 0 ? Math.min(100, Math.round((cpuAllocated / cpuLimit) * 100)) : 0;
  const cpuLimitLabel =
    cpuCores != null && cpuCores > 0
      ? `${cpuCores} ${cpuCores === 1 ? 'core' : 'cores'}`
      : '—';

  const liveTone = node.maintenanceMode ? 'maint' : node.online ? 'on' : 'off';
  const liveLabel = node.maintenanceMode ? 'Maintenance' : node.online ? 'Online' : 'Offline';

  return (
    <article
      className={`ds-status-node ${nodeEdgeClass(node)}`}
      style={{ '--i': index } as CSSProperties}
    >
      <div className="ds-status-node-head">
        <div className="ds-status-node-identity">
          <LocationFlag url={node.location.flagUrl} size="md" alt="" />
          <div className="ds-status-node-copy">
            <h2 className="ds-status-node-name">{node.name}</h2>
            <p className="ds-status-node-loc">
              <span>{node.location.short}</span>
              {node.location.long ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{node.location.long}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="ds-status-node-chips">
          <span className={`ds-status-live-dot ds-status-live-dot--${liveTone}`}>
            <i aria-hidden />
            {liveLabel}
          </span>
          {node.counts.installing > 0 ? (
            <StatusPill label={`${node.counts.installing} installing`} tone="info" compact />
          ) : null}
        </div>
      </div>

      <div className="ds-status-ribbon" role="list" aria-label={`${node.name} server counts`}>
        <div className="ds-status-ribbon-item ds-status-ribbon-item--running" role="listitem">
          <Play className="ds-status-ribbon-icon" aria-hidden />
          <strong>{node.counts.running}</strong>
          <span>Running</span>
        </div>
        <div className="ds-status-ribbon-item" role="listitem">
          <CircleOff className="ds-status-ribbon-icon" aria-hidden />
          <strong>{node.counts.offline}</strong>
          <span>Offline</span>
        </div>
        <div className="ds-status-ribbon-item ds-status-ribbon-item--suspended" role="listitem">
          <Pause className="ds-status-ribbon-icon" aria-hidden />
          <strong>{node.counts.suspended}</strong>
          <span>Suspended</span>
        </div>
        <div className="ds-status-ribbon-item" role="listitem">
          <Layers className="ds-status-ribbon-icon" aria-hidden />
          <strong>{node.counts.total}</strong>
          <span>Total</span>
        </div>
      </div>

      <div className="ds-status-meters">
        <DualMeter
          label="Memory"
          icon={MemoryStick}
          liveLabel={live ? formatBytes(live.memoryBytes) : '—'}
          allocatedLabel={formatResourceAmount(node.allocated.memoryMiB, 'MiB')}
          livePercent={live?.memoryPercent ?? 0}
          allocatedPercent={node.allocated.memoryPercent}
          limitName="Memory limit"
          limitValue={formatResource(node.allocated.effectiveMemoryLimitMiB, 'MiB')}
        />
        <DualMeter
          label="Disk"
          icon={HardDrive}
          liveLabel={live ? formatBytes(live.diskBytes) : '—'}
          allocatedLabel={formatResourceAmount(node.allocated.diskMiB, 'MiB')}
          livePercent={live?.diskPercent ?? 0}
          allocatedPercent={node.allocated.diskPercent}
          limitName="Disk limit"
          limitValue={formatResource(node.allocated.effectiveDiskLimitMiB, 'MiB')}
        />
        <DualMeter
          label="CPU"
          icon={Cpu}
          liveLabel={`${Math.round(liveCpu)}%`}
          allocatedLabel={formatCpuLimit(cpuAllocated)}
          livePercent={liveCpuPct}
          allocatedPercent={allocatedCpuPct}
          limitName="CPU limit"
          limitValue={cpuLimitLabel}
        />
      </div>

      {showServers ? (
        <div className="ds-status-servers" aria-label={`Servers on ${node.name}`}>
          <div className="ds-status-servers-head">
            <p className="ds-status-servers-title">Servers</p>
            <span className="ds-status-servers-empty">{node.servers?.length ?? 0}</span>
          </div>
          {node.servers && node.servers.length > 0 ? (
            <div className="ds-status-servers-list">
              {node.servers.map((server) => (
                <div key={server.id} className="ds-status-server-row">
                  <span className="ds-status-server-name" title={server.name}>
                    {server.name}
                  </span>
                  <StatusPill
                    label={server.statusLabel}
                    tone={toneToPill(server.statusTone)}
                    compact
                    pulse={server.statusTone === 'success' || server.statusTone === 'info'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="ds-status-servers-empty">No servers on this node.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function StatusContent() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const logoSrc = sanitizeImageSrc(branding.logoUrl);

  const [data, setData] = useState<StatusNodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft);
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const next = await api.status.nodes();
      setData(next);
      setUpdatedAt(new Date());
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
      if (!soft) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load({ soft: true }), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  const showServers = (data?.detail ?? branding.statusDetail) === 'servers';

  const globalUsage = useMemo(() => {
    if (!data?.nodes.length) {
      return {
        memoryPercent: null as number | null,
        diskPercent: null as number | null,
        cpuPercent: null as number | null,
        memoryLive: 0,
        diskLive: 0,
        memoryLimitMiB: 0,
        diskLimitMiB: 0,
        cpuSampleCount: 0,
      };
    }
    let memoryLive = 0;
    let diskLive = 0;
    let memoryLimitMiB = 0;
    let diskLimitMiB = 0;
    let cpuLiveAbsolute = 0;
    let cpuLimitAbsolute = 0;
    let cpuSampleCount = 0;
    for (const node of data.nodes) {
      memoryLive += node.live?.memoryBytes ?? 0;
      diskLive += node.live?.diskBytes ?? 0;
      if (node.allocated.effectiveMemoryLimitMiB > 0) {
        memoryLimitMiB += node.allocated.effectiveMemoryLimitMiB;
      }
      if (node.allocated.effectiveDiskLimitMiB > 0) {
        diskLimitMiB += node.allocated.effectiveDiskLimitMiB;
      }
      // live.cpuPercent is Wings absolute CPU (100 = 1 core), same as the node DualMeter.
      const cpuLimit = node.allocated.cpuLimit;
      const cpuLive = node.live?.cpuPercent;
      if (
        node.online &&
        !node.maintenanceMode &&
        cpuLimit > 0 &&
        typeof cpuLive === 'number' &&
        Number.isFinite(cpuLive)
      ) {
        cpuLiveAbsolute += cpuLive;
        cpuLimitAbsolute += cpuLimit;
        cpuSampleCount += 1;
      }
    }
    const memoryLimitBytes = memoryLimitMiB * 1024 * 1024;
    const diskLimitBytes = diskLimitMiB * 1024 * 1024;
    return {
      memoryPercent:
        memoryLimitBytes > 0 ? Math.min(100, Math.round((memoryLive / memoryLimitBytes) * 100)) : null,
      diskPercent:
        diskLimitBytes > 0 ? Math.min(100, Math.round((diskLive / diskLimitBytes) * 100)) : null,
      cpuPercent:
        cpuLimitAbsolute > 0
          ? Math.min(100, Math.round((cpuLiveAbsolute / cpuLimitAbsolute) * 100))
          : null,
      memoryLive,
      diskLive,
      memoryLimitMiB,
      diskLimitMiB,
      cpuSampleCount,
    };
  }, [data]);

  return (
    <Page className="ds-status-page">
      <header className="ds-status-hero">
        <div className="ds-status-hero-inner">
          <div className="ds-status-hero-copy">
            <div className="ds-status-hero-kicker">
              <div className="ds-status-hero-brand">
                {logoSrc ? (
                  <div className="ds-status-hero-mark">
                    <img src={logoSrc} alt="" />
                  </div>
                ) : (
                  <div className="ds-status-hero-mark" style={panelNameGradientStyle()}>
                    {panelNameInitial(branding.panelName)}
                  </div>
                )}
                <PanelName name={branding.panelName} variant="compact" />
              </div>
              <p className="ds-status-hero-greeting">
                {getGreeting()}
                {user ? `, ${displayName(user)}` : ''}
              </p>
            </div>

            <div className="ds-status-hero-title-row">
              <h1 className="ds-status-hero-title">Infrastructure Status</h1>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="ds-status-hero-refresh"
                onClick={() => void load({ soft: true })}
                disabled={refreshing || (loading && !loadedRef.current)}
                aria-label="Refresh status"
                title="Refresh status"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="ds-status-hero-refresh-label">Refresh</span>
              </Button>
            </div>

            <div className="ds-status-hero-meta">
              {data ? (
                <>
                  <span className="ds-status-hero-meta-item">
                    <HardDrive className="ds-status-hero-meta-icon" aria-hidden />
                    <span className="ds-status-hero-meta-copy">
                      Nodes <strong>{data.summary.nodesOnline}/{data.summary.nodesTotal}</strong>
                    </span>
                  </span>
                  <span className="ds-status-hero-dot" aria-hidden />
                  <span className="ds-status-hero-meta-item">
                    <Server className="ds-status-hero-meta-icon" aria-hidden />
                    <span className="ds-status-hero-meta-copy">
                      Running <strong>{data.summary.serversRunning}</strong>
                    </span>
                  </span>
                  <span className="ds-status-hero-dot" aria-hidden />
                </>
              ) : null}
              <span className="ds-status-hero-meta-item">
                <Clock className="ds-status-hero-meta-icon" aria-hidden />
                <span className="ds-status-hero-meta-copy">
                  Updated <strong>{formatUpdatedAt(updatedAt)}</strong>
                </span>
              </span>
            </div>
          </div>

          <div className="ds-status-hero-gauge">
            <FleetHealthGauge
              online={data?.summary.nodesOnline ?? 0}
              total={data?.summary.nodesTotal ?? 0}
            />
          </div>
        </div>
      </header>

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      {loading && !loadedRef.current ? (
        <div className="ds-status-loading">
          <Spinner />
        </div>
      ) : null}

      {!loading && data && data.nodes.length === 0 ? (
        <EmptyState
          icon={<DsIcon icon={Cpu} className="ds-icon--md" />}
          title="No nodes yet"
          description="When nodes are added, their health and capacity will appear here."
        />
      ) : null}

      {data && data.nodes.length > 0 ? (
        <>
          <section className="ds-status-global" aria-label="Fleet resource usage">
            <div className="ds-status-global-card">
              <div className="ds-status-global-head">
                <MemoryStick className="ds-status-global-icon" aria-hidden />
                <div>
                  <p className="ds-status-global-label">Global Memory Usage</p>
                  <p className="ds-status-global-detail">
                    {formatBytes(globalUsage.memoryLive)}
                    {globalUsage.memoryLimitMiB > 0
                      ? ` of ${formatResource(globalUsage.memoryLimitMiB, 'MiB')}`
                      : ''}
                  </p>
                </div>
                <strong className="ds-status-global-value">
                  {globalUsage.memoryPercent != null ? `${globalUsage.memoryPercent}%` : '—'}
                </strong>
              </div>
              <div className="ds-status-global-track" aria-hidden>
                <div
                  className="ds-status-global-fill"
                  style={{ width: `${globalUsage.memoryPercent ?? 0}%` }}
                />
              </div>
            </div>
            <div className="ds-status-global-card">
              <div className="ds-status-global-head">
                <HardDrive className="ds-status-global-icon" aria-hidden />
                <div>
                  <p className="ds-status-global-label">Global Disk Usage</p>
                  <p className="ds-status-global-detail">
                    {formatBytes(globalUsage.diskLive)}
                    {globalUsage.diskLimitMiB > 0
                      ? ` of ${formatResource(globalUsage.diskLimitMiB, 'MiB')}`
                      : ''}
                  </p>
                </div>
                <strong className="ds-status-global-value">
                  {globalUsage.diskPercent != null ? `${globalUsage.diskPercent}%` : '—'}
                </strong>
              </div>
              <div className="ds-status-global-track" aria-hidden>
                <div
                  className="ds-status-global-fill"
                  style={{ width: `${globalUsage.diskPercent ?? 0}%` }}
                />
              </div>
            </div>
            <div className="ds-status-global-card">
              <div className="ds-status-global-head">
                <Cpu className="ds-status-global-icon" aria-hidden />
                <div>
                  <p className="ds-status-global-label">Average CPU Usage</p>
                  <p className="ds-status-global-detail">
                    {globalUsage.cpuSampleCount > 0
                      ? `Across ${globalUsage.cpuSampleCount} reporting node${globalUsage.cpuSampleCount === 1 ? '' : 's'}`
                      : 'No live CPU samples'}
                  </p>
                </div>
                <strong className="ds-status-global-value">
                  {globalUsage.cpuPercent != null ? `${globalUsage.cpuPercent}%` : '—'}
                </strong>
              </div>
              <div className="ds-status-global-track" aria-hidden>
                <div
                  className="ds-status-global-fill"
                  style={{ width: `${globalUsage.cpuPercent ?? 0}%` }}
                />
              </div>
            </div>
          </section>

          <div className="ds-status-board">
            {data.nodes.map((node, index) => (
              <NodeBoard
                key={node.id}
                node={node}
                showServers={showServers}
                index={index}
              />
            ))}
          </div>
        </>
      ) : null}
    </Page>
  );
}

function PublicStatusShell({ children }: { children: ReactNode }) {
  const { branding } = useBranding();
  return (
    <div className="ds-status-public-shell">
      <div className="ds-status-public-bar">
        <BrandMark
          name={branding.panelName}
          subtitle={branding.tagline || 'Status'}
          logoUrl={branding.logoUrl || undefined}
          homeTo="/status"
        />
        <div className="flex items-center gap-2">
          <ThemeToggle cycle />
          <Link to="/login" className="app-navbar__text-link">
            Sign in
          </Link>
        </div>
      </div>
      <div className="ds-status-public-main">{children}</div>
    </div>
  );
}

export function StatusPage() {
  const { user } = useAuth();
  const { branding } = useBranding();

  if (!branding.statusEnabled) {
    if (user) {
      return (
        <ClientLayout>
          <Page>
            <EmptyState
              icon={<DsIcon icon={ShieldAlert} className="ds-icon--md" />}
              title="Status is disabled"
              description="An administrator can enable the Status page under Settings → Features."
              action={
                <Link to="/servers" className="ds-btn ds-btn--secondary ds-btn--md">
                  Back to servers
                </Link>
              }
            />
          </Page>
        </ClientLayout>
      );
    }
    return <Navigate to="/login" replace />;
  }

  if (branding.statusVisibility === 'authenticated' && !user) {
    return <Navigate to="/login" replace state={{ from: '/status' }} />;
  }

  if (user) {
    return (
      <ClientLayout>
        <StatusContent />
      </ClientLayout>
    );
  }

  return (
    <PublicStatusShell>
      <StatusContent />
    </PublicStatusShell>
  );
}
