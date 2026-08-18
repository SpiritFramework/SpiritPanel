import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Cpu,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
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
import { UsageChart } from '../../../UsageChart';
import { AdminServerStatusBadge } from '../../AdminServerStatus';
import { Button } from '../../../Layout';
import { NodeSettingsUsageSnapshot } from '../settings/NodeSettingsUsageSnapshot';

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
          <Button type="button" size="sm" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
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

  const liveUsage = {
    liveMemoryBytes: summary.liveMemoryBytes,
    liveDiskBytes: summary.liveDiskBytes,
    liveCpuPercent: summary.liveCpuPercent,
    liveServerCount: summary.liveServerCount,
    serverCount: summary.serverCount,
    runningCount: summary.runningCount,
  };

  const portPercent =
    summary.allocationCount > 0
      ? Math.min(100, Math.round((summary.assignedAllocations / summary.allocationCount) * 100))
      : 0;

  return (
    <div className="ds-nd-an">
      <header className="ds-nd-an-header">
        <div className="ds-nd-an-header-main">
          <span className="ds-nd-an-header-icon" aria-hidden>
            <BarChart3 className="ds-icon" />
          </span>
          <div>
            <p className="ds-nd-an-eyebrow">Performance</p>
            <h2 className="ds-nd-an-title">Node analytics</h2>
            <p className="ds-nd-an-desc">
              Live resource totals from Wings and historical trends for this host
            </p>
          </div>
        </div>
        <div className="ds-nd-an-toolbar">
          <div className="ds-nd-an-range" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`ds-nd-an-range-btn${range === r.id ? ' ds-nd-an-range-btn--active' : ''}`}
                aria-pressed={range === r.id}
              >
                <span className="ds-nd-an-range-short">{r.label}</span>
                <span className="ds-nd-an-range-long">{r.longLabel}</span>
              </button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="ds-nd-an-kpis">
        <KpiCard
          icon={PlayCircle}
          label="Running now"
          value={`${summary.runningCount}/${summary.serverCount}`}
          hint={
            summary.suspendedCount > 0
              ? `${summary.suspendedCount} suspended · ${summary.liveServerCount} live`
              : `${summary.liveServerCount} reporting from Wings`
          }
          tone="info"
        />
        <KpiCard
          icon={Cpu}
          label="Live CPU"
          value={`${summary.liveCpuPercent.toFixed(1)}%`}
          hint={`${summary.totalCpuLimit}% total limit across fleet`}
          tone={usageTone(summary.liveCpuPercent)}
        />
        <KpiCard
          icon={MemoryStick}
          label="Live memory"
          value={formatBytes(summary.liveMemoryBytes)}
          hint={
            capacity.effectiveMemoryLimit > 0
              ? `${liveMemoryPct.toFixed(1)}% of node limit`
              : `${formatResourceAmount(capacity.allocatedMemory, 'MiB')} assigned`
          }
          tone={usageTone(liveMemoryPct)}
        />
        <KpiCard
          icon={HardDrive}
          label="Live disk"
          value={formatBytes(summary.liveDiskBytes)}
          hint={
            capacity.effectiveDiskLimit > 0
              ? `${liveDiskPct.toFixed(1)}% of node limit`
              : `${formatResourceAmount(capacity.allocatedDisk, 'MiB')} assigned`
          }
          tone={usageTone(liveDiskPct)}
        />
      </div>

      <div className="ds-nd-an-snapshot-wrap">
        <NodeSettingsUsageSnapshot capacity={capacity} liveUsage={liveUsage} />
        {summary.allocationCount > 0 ? (
          <div className="ds-nd-an-ports-card">
            <div className="ds-nd-an-ports-head">
              <Gauge className="ds-icon ds-icon--sm" aria-hidden />
              <div>
                <p className="ds-nd-an-ports-label">Port allocation</p>
                <p className="ds-nd-an-ports-value">
                  {summary.assignedAllocations}/{summary.allocationCount} assigned
                </p>
              </div>
              <span className="ds-nd-an-ports-pct">{portPercent}%</span>
            </div>
            <div className="ds-progress" aria-hidden>
              <div
                className={`ds-progress-fill ds-progress-fill--${portPercent >= 90 ? 'bad' : portPercent >= 75 ? 'warn' : 'good'}`}
                style={{ width: `${Math.max(portPercent > 0 ? 4 : 0, portPercent)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <section className="ds-nd-an-section" aria-labelledby="node-analytics-charts">
        <header className="ds-nd-an-section-head">
          <TrendingUp className="ds-icon ds-icon--sm" aria-hidden />
          <div>
            <h3 id="node-analytics-charts" className="ds-nd-an-section-title">
              Historical trends
            </h3>
            <p className="ds-nd-an-section-desc">{activeRange.longLabel} · aggregated node snapshots</p>
          </div>
        </header>

        {stats.series.length > 0 ? (
          <div className="ds-nd-an-charts">
            <div className="ds-nd-an-chart-card">
              <UsageChart
                title="Combined CPU usage"
                unit="Sum of all server CPU on this node"
                color="#818cf8"
                range={range}
                data={cpuData}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
            <div className="ds-nd-an-chart-card">
              <UsageChart
                title="Memory pressure"
                unit={
                  capacity.effectiveMemoryLimit > 0
                    ? `Live RAM vs ${formatResource(capacity.effectiveMemoryLimit, 'MiB')} limit`
                    : 'Live RAM usage trend'
                }
                color="#34d399"
                range={range}
                data={memoryData}
                max={100}
                valueUnit="percent"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
            <div className="ds-nd-an-chart-card ds-nd-an-chart-card--wide">
              <UsageChart
                title="Running servers"
                unit="Containers reporting running or starting"
                color="#38bdf8"
                range={range}
                data={runningData}
                formatValue={(v) => String(Math.round(v))}
              />
            </div>
          </div>
        ) : (
          <div className="ds-nd-an-empty">
            <Activity className="h-8 w-8" aria-hidden />
            <p className="ds-nd-an-empty-title">No historical data yet</p>
            <p className="ds-nd-an-empty-desc">
              Snapshots build when servers run or their console is opened. Live totals above reflect
              the current state.
            </p>
          </div>
        )}
      </section>

      {stats.servers.length > 0 ? (
        <section className="ds-nd-an-section" aria-labelledby="node-analytics-fleet">
          <header className="ds-nd-an-section-head">
            <Server className="ds-icon ds-icon--sm" aria-hidden />
            <div>
              <h3 id="node-analytics-fleet" className="ds-nd-an-section-title">
                Per-server breakdown
              </h3>
              <p className="ds-nd-an-section-desc">
                {stats.servers.length} server{stats.servers.length === 1 ? '' : 's'} · live limits vs
                Wings usage
              </p>
            </div>
          </header>
          <ul className="ds-nd-an-fleet">
            {stats.servers.map((server) => (
              <ServerUsageCard key={server.id} server={server} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <div className={`ds-nd-an-kpi ds-nd-an-kpi--${tone}`}>
      <span className="ds-nd-an-kpi-icon" aria-hidden>
        <Icon className="ds-icon ds-icon--sm" />
      </span>
      <div className="min-w-0">
        <p className="ds-nd-an-kpi-label">{label}</p>
        <p className="ds-nd-an-kpi-value">{value}</p>
        <p className="ds-nd-an-kpi-hint">{hint}</p>
      </div>
    </div>
  );
}

function ServerUsageCard({
  server,
}: {
  server: NodeStatsResponse['servers'][number];
}) {
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

  const sourceLabel =
    server.liveSource === 'wings'
      ? 'Live from Wings'
      : server.liveSource === 'snapshot' && server.live
        ? `Snapshot · ${formatActivityTime(server.live.recordedAt)}`
        : 'No live data';

  const sourceTone =
    server.liveSource === 'wings' ? 'live' : server.liveSource === 'snapshot' ? 'snapshot' : 'offline';

  return (
    <li>
      <Link to={`/admin/servers/${server.id}`} className="ds-nd-an-server-card">
        <div className="ds-nd-an-server-head">
          <div className="min-w-0">
            <p className="ds-nd-an-server-name">{server.name}</p>
            <span className={`ds-nd-an-server-source ds-nd-an-server-source--${sourceTone}`}>
              {sourceLabel}
            </span>
          </div>
          <AdminServerStatusBadge
            status={server.status}
            suspended={server.suspended}
            installStatus={server.installStatus ?? undefined}
            containerState={server.containerState}
            compact
          />
        </div>
        <div className="ds-nd-an-server-metrics">
          <ServerMetric
            icon={MemoryStick}
            label="RAM"
            live={hasLive ? formatBytes(server.live!.memoryBytes) : '—'}
            limit={formatResource(server.memory, 'MiB')}
            percent={memPct}
          />
          <ServerMetric
            icon={HardDrive}
            label="Disk"
            live={hasLive ? formatBytes(server.live!.diskBytes) : '—'}
            limit={formatResource(server.disk, 'MiB')}
            percent={diskPct}
          />
          <ServerMetric
            icon={Cpu}
            label="CPU"
            live={hasLive ? `${server.live!.cpu.toFixed(1)}%` : '—'}
            limit={`${server.cpu}%`}
            percent={cpuPct}
          />
        </div>
      </Link>
    </li>
  );
}

function ServerMetric({
  icon: Icon,
  label,
  live,
  limit,
  percent,
}: {
  icon: LucideIcon;
  label: string;
  live: string;
  limit: string;
  percent: number;
}) {
  const tone = usageTone(percent);
  const fillClass =
    tone === 'success' ? 'ds-progress-fill--good' : tone === 'warning' ? 'ds-progress-fill--warn' : 'ds-progress-fill--bad';

  return (
    <div className={`ds-nd-an-metric ds-nd-an-metric--${tone}`}>
      <div className="ds-nd-an-metric-head">
        <span className="ds-nd-an-metric-label">
          <Icon className="ds-icon ds-icon--sm" aria-hidden />
          {label}
        </span>
        {percent > 0 ? <span className="ds-nd-an-metric-pct">{Math.round(percent)}%</span> : null}
      </div>
      <p className="ds-nd-an-metric-values">
        <span className="font-mono">{live}</span>
        <span className="ds-nd-an-metric-sep">/</span>
        <span className="font-mono ds-nd-an-metric-limit">{limit}</span>
      </p>
      <div className="ds-progress ds-nd-an-metric-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${fillClass}`}
          style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
    </div>
  );
}
