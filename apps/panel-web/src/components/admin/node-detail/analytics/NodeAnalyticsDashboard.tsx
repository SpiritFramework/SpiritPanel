import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ChevronRight,
  Cpu,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  Network,
  PlayCircle,
  RefreshCw,
  Server,
  TrendingUp,
} from 'lucide-react';
import { api, type NodeStatsResponse } from '../../../../lib/api';
import { formatActivityTime } from '../../../../lib/activity';
import { usageTone } from '../../../../lib/node-capacity';
import { formatBytes } from '../../../../lib/stats';
import { formatResource, formatResourceAmount } from '../../../../lib/server-theme';
import { ChartSyncProvider, UsageChart } from '../../../UsageChart';
import { AdminServerStatusBadge } from '../../AdminServerStatus';
import { AdminSection } from '../../primitives';

const RANGES = [
  { id: '1h', label: '1h', longLabel: 'Last hour' },
  { id: '24h', label: '24h', longLabel: 'Last 24 hours' },
  { id: '7d', label: '7d', longLabel: 'Last 7 days' },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

export function NodeAnalyticsDashboard({ nodeId }: { nodeId: string }) {
  const [range, setRange] = useState<RangeId>('24h');
  const [stats, setStats] = useState<NodeStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        setStats(await api.admin.nodeStats(nodeId, range));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load node analytics');
        setStats(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [nodeId, range],
  );

  useEffect(() => {
    load();
  }, [load]);

  const cpuData = useMemo(
    () => (stats?.series ?? []).map((p) => ({ x: p.recordedAt, y: p.cpu })),
    [stats?.series],
  );
  const memoryData = useMemo(() => {
    if (!stats) return [];
    const limit = stats.capacity.effectiveMemoryLimit;
    return stats.series.map((p) => ({
      x: p.recordedAt,
      y: limit > 0 ? Math.min(100, (p.memoryBytes / (limit * 1024 * 1024)) * 100) : 0,
    }));
  }, [stats]);
  const runningData = useMemo(
    () => (stats?.series ?? []).map((p) => ({ x: p.recordedAt, y: p.runningCount })),
    [stats?.series],
  );
  const diskData = useMemo(() => {
    if (!stats) return [];
    const limit = stats.capacity.effectiveDiskLimit;
    return stats.series.map((p) => ({
      x: p.recordedAt,
      y: limit > 0 ? Math.min(100, (p.diskBytes / (limit * 1024 * 1024)) * 100) : 0,
    }));
  }, [stats]);

  const activeRange = RANGES.find((r) => r.id === range) ?? RANGES[1];

  if (loading) {
    return (
      <div className="ds-nd-an ds-nd-an--loading">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-hover)]" aria-hidden />
        <p className="ds-nd-an-loading-text">Loading node analytics…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="ds-nd-an">
        <div className="ds-nd-an-error">
          <p>{error || 'Could not load analytics'}</p>
          <button type="button" className="ds-nd-tool-btn" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, capacity } = stats;
  const liveMemoryPct =
    capacity.effectiveMemoryLimit > 0
      ? Math.min(100, (summary.liveMemoryBytes / (capacity.effectiveMemoryLimit * 1024 * 1024)) * 100)
      : 0;
  const liveDiskPct =
    capacity.effectiveDiskLimit > 0
      ? Math.min(100, (summary.liveDiskBytes / (capacity.effectiveDiskLimit * 1024 * 1024)) * 100)
      : 0;
  const assignedMemoryPct = capacity.memoryUsedPercent;
  const assignedDiskPct = capacity.diskUsedPercent;
  const portPercent =
    summary.allocationCount > 0
      ? Math.min(100, Math.round((summary.assignedAllocations / summary.allocationCount) * 100))
      : 0;

  const liveStrip: { icon: LucideIcon; label: string; value: string; hint?: string; tone?: string }[] = [
    {
      icon: PlayCircle,
      label: 'Running',
      value: `${summary.runningCount}/${summary.serverCount}`,
      hint: summary.liveServerCount > 0 ? `${summary.liveServerCount} live from Wings` : 'From latest snapshots',
    },
    {
      icon: Cpu,
      label: 'CPU',
      value: `${summary.liveCpuPercent.toFixed(1)}%`,
      hint: `Fleet limit ${summary.totalCpuLimit}%`,
      tone: usageTone(summary.liveCpuPercent),
    },
    {
      icon: MemoryStick,
      label: 'RAM',
      value: formatBytes(summary.liveMemoryBytes),
      hint:
        capacity.effectiveMemoryLimit > 0
          ? `${Math.round(liveMemoryPct)}% of ${formatResource(capacity.effectiveMemoryLimit, 'MiB')}`
          : undefined,
      tone: usageTone(liveMemoryPct),
    },
    {
      icon: HardDrive,
      label: 'Disk',
      value: formatBytes(summary.liveDiskBytes),
      hint:
        capacity.effectiveDiskLimit > 0
          ? `${Math.round(liveDiskPct)}% of ${formatResource(capacity.effectiveDiskLimit, 'MiB')}`
          : undefined,
      tone: usageTone(liveDiskPct),
    },
    {
      icon: Network,
      label: 'Ports',
      value: `${summary.assignedAllocations}/${summary.allocationCount || '—'}`,
      hint: summary.allocationCount > 0 ? `${portPercent}% used` : 'No ports',
      tone: summary.allocationCount > 0 ? usageTone(portPercent) : undefined,
    },
  ];

  return (
    <div className="ds-nd-an">
      <section className="ds-nd-an-hero">
        <div className="ds-nd-an-hero-copy">
          <p className="ds-nd-an-hero-eyebrow">Telemetry</p>
          <h2 className="ds-nd-an-hero-title">Analytics</h2>
          <p className="ds-nd-an-hero-desc">
            Live pressure and historical trends for every server on this node
          </p>
        </div>
        <div className="ds-nd-an-hero-controls">
          <div className="ds-nd-an-range" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`ds-nd-an-range-btn${range === r.id ? ' ds-nd-an-range-btn--active' : ''}`}
                aria-pressed={range === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ds-nd-tool-btn"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </section>

      <div className="ds-nd-an-live-strip" role="list" aria-label="Live node metrics">
        {liveStrip.map((item) => (
          <div
            key={item.label}
            className={`ds-nd-an-live-stat${item.tone ? ` ds-nd-an-live-stat--${item.tone}` : ''}`}
            role="listitem"
          >
            <span className="ds-nd-an-live-stat-icon" aria-hidden>
              <item.icon className="h-3.5 w-3.5" />
            </span>
            <span className="ds-nd-an-live-stat-copy">
              <span className="ds-nd-an-live-stat-label">{item.label}</span>
              <span className="ds-nd-an-live-stat-value">{item.value}</span>
              {item.hint ? <span className="ds-nd-an-live-stat-hint">{item.hint}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="ds-nd-an-layout">
        <AnalyticsBlock
          tone="trends"
          icon={TrendingUp}
          eyebrow="History"
          title="Trends"
          description={`${activeRange.longLabel} · node-wide aggregates`}
          badge={stats.series.length > 0 ? `${stats.series.length} points` : undefined}
        >
          {stats.series.length > 0 ? (
            <ChartSyncProvider>
              <div className="ds-nd-an-charts">
                <div className="ds-nd-an-chart">
                  <UsageChart
                    title="Combined CPU"
                    unit="Sum of server CPU in use"
                    color="var(--accent)"
                    range={range}
                    data={cpuData}
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    sync
                  />
                </div>
                <div className="ds-nd-an-chart">
                  <UsageChart
                    title="Memory pressure"
                    unit={
                      capacity.effectiveMemoryLimit > 0
                        ? `vs ${formatResource(capacity.effectiveMemoryLimit, 'MiB')} node limit`
                        : 'Live RAM trend'
                    }
                    color="#34d399"
                    range={range}
                    data={memoryData}
                    max={100}
                    warnFrom={80}
                    valueUnit="percent"
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    sync
                  />
                </div>
                <div className="ds-nd-an-chart">
                  <UsageChart
                    title="Disk pressure"
                    unit={
                      capacity.effectiveDiskLimit > 0
                        ? `vs ${formatResource(capacity.effectiveDiskLimit, 'MiB')} node limit`
                        : 'Live disk trend'
                    }
                    color="#fbbf24"
                    range={range}
                    data={diskData}
                    max={capacity.effectiveDiskLimit > 0 ? 100 : undefined}
                    warnFrom={capacity.effectiveDiskLimit > 0 ? 80 : undefined}
                    valueUnit="percent"
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    sync
                  />
                </div>
                <div className="ds-nd-an-chart">
                  <UsageChart
                    title="Running servers"
                    unit="Containers running or starting"
                    color="#38bdf8"
                    range={range}
                    data={runningData}
                    formatValue={(v) => String(Math.round(v))}
                    sync
                  />
                </div>
              </div>
            </ChartSyncProvider>
          ) : (
            <div className="ds-nd-an-empty">
              <Activity className="h-5 w-5 opacity-50" aria-hidden />
              <p className="ds-nd-an-empty-title">No historical data yet</p>
              <p className="ds-nd-an-empty-desc">
                Snapshots build when servers run or their console is opened. Live metrics above still
                reflect the latest known state.
              </p>
            </div>
          )}
        </AnalyticsBlock>

        <AnalyticsBlock
          tone="capacity"
          icon={Gauge}
          eyebrow="Pressure"
          title="Capacity"
          description="Live usage vs panel-assigned limits"
        >
          <div className="ds-nd-an-cap-board">
            <CapacityMetric
              icon={MemoryStick}
              label="Memory"
              liveLabel={formatBytes(summary.liveMemoryBytes)}
              assignedLabel={formatResourceAmount(capacity.allocatedMemory, 'MiB')}
              limitLabel={
                capacity.effectiveMemoryLimit > 0
                  ? formatResource(capacity.effectiveMemoryLimit, 'MiB')
                  : 'Unlimited'
              }
              livePercent={liveMemoryPct}
              assignedPercent={assignedMemoryPct}
            />
            <CapacityMetric
              icon={HardDrive}
              label="Disk"
              liveLabel={formatBytes(summary.liveDiskBytes)}
              assignedLabel={formatResourceAmount(capacity.allocatedDisk, 'MiB')}
              limitLabel={
                capacity.effectiveDiskLimit > 0
                  ? formatResource(capacity.effectiveDiskLimit, 'MiB')
                  : 'Unlimited'
              }
              livePercent={liveDiskPct}
              assignedPercent={assignedDiskPct}
            />
          </div>

          {summary.allocationCount > 0 ? (
            <div className="ds-nd-an-ports">
              <div className="ds-nd-an-ports-head">
                <span>Port allocation</span>
                <span className="ds-text-mono">{portPercent}%</span>
              </div>
              <div className="ds-progress" aria-hidden>
                <div
                  className={`ds-progress-fill ds-progress-fill--${portPercent >= 90 ? 'bad' : portPercent >= 75 ? 'warn' : 'good'}`}
                  style={{ width: `${Math.max(portPercent > 0 ? 4 : 0, portPercent)}%` }}
                />
              </div>
              <p className="ds-nd-an-ports-meta">
                {summary.assignedAllocations} assigned ·{' '}
                {summary.allocationCount - summary.assignedAllocations} free
              </p>
            </div>
          ) : null}

          <div className="ds-nd-an-capacity-foot">
            <div className="ds-nd-an-cap-pill">
              <span className="ds-nd-an-cap-pill-label">CPU fleet</span>
              <span className="ds-nd-an-cap-pill-value">{summary.totalCpuLimit}%</span>
            </div>
            <div className="ds-nd-an-cap-pill">
              <span className="ds-nd-an-cap-pill-label">Suspended</span>
              <span className="ds-nd-an-cap-pill-value">{summary.suspendedCount}</span>
            </div>
            <div className="ds-nd-an-cap-pill">
              <span className="ds-nd-an-cap-pill-label">Source</span>
              <span className="ds-nd-an-cap-pill-value">
                {summary.liveServerCount > 0 ? 'Wings' : 'Snapshots'}
              </span>
            </div>
          </div>
        </AnalyticsBlock>
      </div>

      {stats.servers.length > 0 ? (
        <AnalyticsBlock
          tone="fleet"
          icon={Server}
          eyebrow="Workload"
          title="Servers"
          description={`${stats.servers.length} server${stats.servers.length === 1 ? '' : 's'} on this node`}
        >
          <ul className="ds-nd-an-fleet">
            {stats.servers.map((server) => (
              <ServerWorkloadCard key={server.id} server={server} />
            ))}
          </ul>
        </AnalyticsBlock>
      ) : null}
    </div>
  );
}

function AnalyticsBlock({
  tone,
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  tone: 'trends' | 'capacity' | 'fleet';
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminSection
      tone={tone}
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={badge}
      className={`ds-nd-an-block ds-nd-an-block--${tone}`}
    >
      {children}
    </AdminSection>
  );
}

function CapacityMetric({
  icon: Icon,
  label,
  liveLabel,
  assignedLabel,
  limitLabel,
  livePercent,
  assignedPercent,
}: {
  icon: LucideIcon;
  label: string;
  liveLabel: string;
  assignedLabel: string;
  limitLabel: string;
  livePercent: number;
  assignedPercent: number;
}) {
  const liveTone = usageTone(livePercent);
  const assignedTone = usageTone(assignedPercent);
  const liveFill =
    liveTone === 'success' ? 'ds-progress-fill--good' : liveTone === 'warning' ? 'ds-progress-fill--warn' : 'ds-progress-fill--bad';
  const assignedFill =
    assignedTone === 'success'
      ? 'ds-progress-fill--good'
      : assignedTone === 'warning'
        ? 'ds-progress-fill--warn'
        : 'ds-progress-fill--bad';

  return (
    <div className="ds-nd-an-cap-metric">
      <div className="ds-nd-an-cap-metric-head">
        <span className="ds-nd-an-cap-metric-icon" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="ds-nd-an-cap-metric-title">{label}</p>
        <span className="ds-nd-an-cap-metric-limit">{limitLabel}</span>
      </div>

      <div className="ds-nd-an-cap-metric-row">
        <div className="ds-nd-an-cap-metric-copy">
          <span>Live</span>
          <strong className="font-mono">{liveLabel}</strong>
        </div>
        <span className="ds-nd-an-cap-metric-pct">{Math.round(livePercent)}%</span>
      </div>
      <div className="ds-progress ds-nd-an-cap-metric-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${liveFill}`}
          style={{ width: `${Math.max(livePercent > 0 ? 4 : 0, livePercent)}%` }}
        />
      </div>

      <div className="ds-nd-an-cap-metric-row">
        <div className="ds-nd-an-cap-metric-copy">
          <span>Assigned</span>
          <strong className="font-mono">{assignedLabel}</strong>
        </div>
        <span className="ds-nd-an-cap-metric-pct">{Math.round(assignedPercent)}%</span>
      </div>
      <div className="ds-progress ds-nd-an-cap-metric-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${assignedFill}`}
          style={{ width: `${Math.max(assignedPercent > 0 ? 4 : 0, assignedPercent)}%` }}
        />
      </div>
    </div>
  );
}

function ServerWorkloadCard({ server }: { server: NodeStatsResponse['servers'][number] }) {
  const hasLive = server.live !== null;
  const memPct =
    server.memory > 0 && hasLive
      ? Math.min(100, (server.live!.memoryBytes / (server.memory * 1024 * 1024)) * 100)
      : 0;
  const diskPct =
    server.disk > 0 && hasLive
      ? Math.min(100, (server.live!.diskBytes / (server.disk * 1024 * 1024)) * 100)
      : 0;
  const cpuPct = hasLive ? Math.min(100, server.live!.cpu) : 0;
  const initial = (server.name.trim().charAt(0) || 'S').toUpperCase();

  const sourceLabel =
    server.liveSource === 'wings'
      ? 'Live from Wings'
      : server.liveSource === 'snapshot' && server.live
        ? `Snapshot · ${formatActivityTime(server.live.recordedAt)}`
        : 'No telemetry yet';

  const sourceTone =
    server.liveSource === 'wings' ? 'live' : server.liveSource === 'snapshot' ? 'snapshot' : 'offline';

  const hottest = Math.max(memPct, diskPct, cpuPct);
  const pressureTone = hasLive ? usageTone(hottest) : 'offline';

  return (
    <li>
      <Link
        to={`/admin/servers/${server.id}`}
        className={`ds-nd-an-server ds-nd-an-server--${pressureTone}`}
      >
        <div className="ds-nd-an-server-top">
          <span className="ds-nd-an-server-mark" aria-hidden>
            {initial}
          </span>
          <div className="ds-nd-an-server-identity">
            <p className="ds-nd-an-server-name">{server.name}</p>
            <span className={`ds-nd-an-server-source ds-nd-an-server-source--${sourceTone}`}>
              {sourceLabel}
            </span>
          </div>
          <div className="ds-nd-an-server-status">
            <AdminServerStatusBadge
              status={server.status}
              suspended={server.suspended}
              installStatus={server.installStatus ?? undefined}
              containerState={server.containerState}
              compact
            />
            <ChevronRight className="ds-nd-an-server-chevron" aria-hidden />
          </div>
        </div>

        <div className="ds-nd-an-server-metrics" role="group" aria-label={`${server.name} resource pressure`}>
          <ServerMetric
            icon={MemoryStick}
            label="RAM"
            percent={memPct}
            primary={hasLive ? formatBytes(server.live!.memoryBytes) : '—'}
            secondary={formatResource(server.memory, 'MiB')}
          />
          <ServerMetric
            icon={HardDrive}
            label="Disk"
            percent={diskPct}
            primary={hasLive ? formatBytes(server.live!.diskBytes) : '—'}
            secondary={formatResource(server.disk, 'MiB')}
          />
          <ServerMetric
            icon={Cpu}
            label="CPU"
            percent={cpuPct}
            primary={hasLive ? `${server.live!.cpu.toFixed(0)}%` : '—'}
            secondary={`${server.cpu}%`}
          />
        </div>

        {hasLive ? (
          <div className="ds-nd-an-server-foot">
            <span className="ds-nd-an-server-net">
              <Network className="h-3 w-3" aria-hidden />
              <span>
                ↓ {formatBytes(server.live!.networkRxBytes)}
                <span className="ds-nd-an-server-net-sep">·</span>
                ↑ {formatBytes(server.live!.networkTxBytes)}
              </span>
            </span>
            <span className="ds-nd-an-server-open">Open server</span>
          </div>
        ) : (
          <div className="ds-nd-an-server-foot ds-nd-an-server-foot--empty">
            <span>No live or snapshot samples yet</span>
            <span className="ds-nd-an-server-open">Open server</span>
          </div>
        )}
      </Link>
    </li>
  );
}

function ServerMetric({
  icon: Icon,
  label,
  percent,
  primary,
  secondary,
}: {
  icon: LucideIcon;
  label: string;
  percent: number;
  primary: string;
  secondary: string;
}) {
  const tone = percent > 0 ? usageTone(percent) : null;
  const fillClass =
    tone === 'warning' ? 'ds-progress-fill--warn' : tone === 'danger' ? 'ds-progress-fill--bad' : 'ds-progress-fill--good';

  return (
    <div className={`ds-nd-an-server-metric${tone ? ` ds-nd-an-server-metric--${tone}` : ''}`}>
      <div className="ds-nd-an-server-metric-head">
        <span className="ds-nd-an-server-metric-label">
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </span>
        <strong className="ds-nd-an-server-metric-pct">{percent > 0 ? `${Math.round(percent)}%` : '—'}</strong>
      </div>
      <div className="ds-progress ds-nd-an-server-metric-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${fillClass}`}
          style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
      <p className="ds-nd-an-server-metric-values">
        <span className="font-mono">{primary}</span>
        <span className="ds-nd-an-server-metric-sep">/</span>
        <span className="font-mono opacity-65">{secondary}</span>
      </p>
    </div>
  );
}
