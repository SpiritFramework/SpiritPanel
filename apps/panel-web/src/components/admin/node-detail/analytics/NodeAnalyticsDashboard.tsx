import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '../../../Layout';
import { NodeOverviewSection } from '../NodeDetailShell';
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
          <Button type="button" size="sm" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
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

  const liveStrip: { icon: LucideIcon; label: string; value: string; tone?: string }[] = [
    {
      icon: PlayCircle,
      label: 'Running',
      value: `${summary.runningCount}/${summary.serverCount}`,
    },
    {
      icon: Cpu,
      label: 'Live CPU',
      value: `${summary.liveCpuPercent.toFixed(1)}%`,
      tone: usageTone(summary.liveCpuPercent),
    },
    {
      icon: MemoryStick,
      label: 'Live RAM',
      value: formatBytes(summary.liveMemoryBytes),
      tone: usageTone(liveMemoryPct),
    },
    {
      icon: HardDrive,
      label: 'Live disk',
      value: formatBytes(summary.liveDiskBytes),
      tone: usageTone(liveDiskPct),
    },
    {
      icon: Network,
      label: 'Ports',
      value: `${summary.assignedAllocations}/${summary.allocationCount}`,
    },
  ];

  return (
    <div className="ds-nd-an">
      <div className="ds-nd-an-topbar">
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
        <p className="ds-nd-an-topbar-meta">{activeRange.longLabel} · aggregated snapshots</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
      </div>

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
            </span>
          </div>
        ))}
      </div>

      <div className="ds-nd-an-bento">
        <div className="ds-nd-an-bento-main">
          <NodeOverviewSection
            icon={TrendingUp}
            title="Historical trends"
            description={`${activeRange.longLabel} · node-wide performance`}
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
                  Snapshots build when servers run or their console is opened. Live metrics above reflect
                  the current state.
                </p>
              </div>
            )}
          </NodeOverviewSection>
        </div>

        <aside className="ds-nd-an-bento-side">
          <NodeOverviewSection
            icon={Gauge}
            title="Capacity snapshot"
            description="Live Wings usage vs panel limits"
            badge={
              summary.liveServerCount > 0
                ? `${summary.liveServerCount}/${summary.serverCount} live`
                : undefined
            }
          >
            <NodeSettingsUsageSnapshot capacity={capacity} liveUsage={liveUsage} showLive />

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
              <CapacityPill
                label="Assigned RAM"
                value={formatResourceAmount(capacity.allocatedMemory, 'MiB')}
              />
              <CapacityPill
                label="Assigned disk"
                value={formatResourceAmount(capacity.allocatedDisk, 'MiB')}
              />
              <CapacityPill label="CPU fleet" value={`${summary.totalCpuLimit}%`} />
            </div>
          </NodeOverviewSection>
        </aside>
      </div>

      {stats.servers.length > 0 ? (
        <NodeOverviewSection
          icon={Server}
          title="Server workload"
          description={`${stats.servers.length} server${stats.servers.length === 1 ? '' : 's'} on this node`}
        >
          <ul className="ds-nd-an-fleet">
            {stats.servers.map((server) => (
              <ServerWorkloadRow key={server.id} server={server} />
            ))}
          </ul>
        </NodeOverviewSection>
      ) : null}
    </div>
  );
}

function CapacityPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-nd-an-cap-pill">
      <span className="ds-nd-an-cap-pill-label">{label}</span>
      <span className="ds-nd-an-cap-pill-value">{value}</span>
    </div>
  );
}

function ServerWorkloadRow({ server }: { server: NodeStatsResponse['servers'][number] }) {
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
      ? 'Live'
      : server.liveSource === 'snapshot' && server.live
        ? formatActivityTime(server.live.recordedAt)
        : 'No data';

  const sourceTone =
    server.liveSource === 'wings' ? 'live' : server.liveSource === 'snapshot' ? 'snapshot' : 'offline';

  return (
    <li>
      <Link to={`/admin/servers/${server.id}`} className="ds-nd-an-fleet-row">
        <div className="ds-nd-an-fleet-main">
          <p className="ds-nd-an-fleet-name">{server.name}</p>
          <span className={`ds-nd-an-fleet-source ds-nd-an-fleet-source--${sourceTone}`}>{sourceLabel}</span>
        </div>

        <div className="ds-nd-an-fleet-meters">
          <FleetMeter
            icon={MemoryStick}
            label="RAM"
            live={hasLive ? formatBytes(server.live!.memoryBytes) : '—'}
            limit={formatResource(server.memory, 'MiB')}
            percent={memPct}
          />
          <FleetMeter
            icon={HardDrive}
            label="Disk"
            live={hasLive ? formatBytes(server.live!.diskBytes) : '—'}
            limit={formatResource(server.disk, 'MiB')}
            percent={diskPct}
          />
          <FleetMeter
            icon={Cpu}
            label="CPU"
            live={hasLive ? `${server.live!.cpu.toFixed(0)}%` : '—'}
            limit={`${server.cpu}%`}
            percent={cpuPct}
          />
        </div>

        <div className="ds-nd-an-fleet-status">
          <AdminServerStatusBadge
            status={server.status}
            suspended={server.suspended}
            installStatus={server.installStatus ?? undefined}
            containerState={server.containerState}
            compact
          />
          <ChevronRight className="ds-nd-an-fleet-chevron ds-icon ds-icon--sm" aria-hidden />
        </div>
      </Link>
    </li>
  );
}

function FleetMeter({
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
    <div className="ds-nd-an-fleet-meter">
      <div className="ds-nd-an-fleet-meter-head">
        <span className="ds-nd-an-fleet-meter-label">
          <Icon className="ds-icon ds-icon--sm" aria-hidden />
          {label}
        </span>
        {percent > 0 ? <span className="ds-nd-an-fleet-meter-pct">{Math.round(percent)}%</span> : null}
      </div>
      <p className="ds-nd-an-fleet-meter-values">
        <span className="font-mono">{live}</span>
        <span className="ds-nd-an-fleet-meter-sep">/</span>
        <span className="font-mono opacity-70">{limit}</span>
      </p>
      <div className="ds-progress ds-nd-an-fleet-meter-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${fillClass}`}
          style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
    </div>
  );
}
