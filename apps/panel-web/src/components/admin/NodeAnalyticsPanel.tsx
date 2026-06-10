import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Cpu, HardDrive, Loader2, MemoryStick, RefreshCw, Server } from 'lucide-react';
import { api, type NodeStatsResponse } from '../../lib/api';
import { formatBytes } from '../../lib/stats';
import { formatActivityTime } from '../../lib/activity';
import { formatResource } from '../../lib/server-theme';
import { UsageChart } from '../UsageChart';
import { AdminServerStatusBadge } from './AdminServerStatus';
import { StatCard } from '../ui';
import { NodeCapacityOverview } from './NodeCapacityOverview';

const RANGES = [
  { id: '1h', label: '1h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

export function NodeAnalyticsPanel({ nodeId }: { nodeId: string }) {
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error || 'Could not load analytics'}
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

  return (
    <div className="space-y-5">
      <div className="node-analytics-toolbar">
        <div className="node-analytics-range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`node-analytics-range-btn${range === r.id ? ' is-active' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="node-analytics-refresh" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <NodeCapacityOverview
        capacity={capacity}
        serverCount={summary.serverCount}
        assignedAllocations={summary.assignedAllocations}
        allocationCount={summary.allocationCount}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Running now"
          value={`${summary.runningCount}/${summary.serverCount}`}
          hint={
            summary.suspendedCount > 0
              ? `${summary.suspendedCount} suspended · ${summary.liveServerCount} live from Wings`
              : `${summary.liveServerCount} reporting live from Wings`
          }
          icon={<Server className="h-3.5 w-3.5" />}
          tone={summary.runningCount > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Live CPU"
          value={`${summary.liveCpuPercent.toFixed(1)}%`}
          hint={`Across ${summary.totalCpuLimit}% limit total`}
          icon={<Cpu className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Live memory"
          value={formatBytes(summary.liveMemoryBytes)}
          hint={
            capacity.effectiveMemoryLimit > 0
              ? `${liveMemoryPct.toFixed(1)}% of node limit`
              : `${formatResource(capacity.allocatedMemory, 'MiB')} allocated`
          }
          icon={<MemoryStick className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Live disk"
          value={formatBytes(summary.liveDiskBytes)}
          hint={
            capacity.effectiveDiskLimit > 0
              ? `${liveDiskPct.toFixed(1)}% of node limit`
              : `${formatResource(capacity.allocatedDisk, 'MiB')} allocated`
          }
          icon={<HardDrive className="h-3.5 w-3.5" />}
        />
      </div>

      {stats.series.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <UsageChart
            title="Combined CPU usage"
            unit="Sum of all server CPU on this node"
            color="#818cf8"
            range={range}
            data={cpuData}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
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
          <UsageChart
            title="Running servers"
            unit="Containers reporting running/starting"
            color="#38bdf8"
            range={range}
            data={runningData}
            formatValue={(v) => String(Math.round(v))}
          />
        </div>
      ) : (
        <div className="node-analytics-empty">
          <Activity className="h-8 w-8" />
          <p className="font-medium">No historical data yet</p>
          <p className="text-xs text-[var(--muted)]">
            Snapshots build when servers are opened in the panel or send live stats. Live totals above are still current.
          </p>
        </div>
      )}

      {stats.servers.length > 0 && (
        <section className="node-server-capacity-list">
          <div className="node-server-capacity-head">
            <h3 className="text-sm font-semibold">Server resource usage</h3>
            <p className="text-xs text-[var(--muted)]">
              Allocated limits vs live usage from Wings
              {summary.liveServerCount < summary.serverCount && (
                <>
                  {' '}
                  · {summary.liveServerCount}/{summary.serverCount} live
                  {summary.liveServerCount < summary.serverCount && summary.serverCount - summary.liveServerCount > 0
                    ? ' (others use last snapshot or show offline)'
                    : ''}
                </>
              )}
            </p>
          </div>
          <ul className="node-server-capacity-rows">
            {stats.servers.map((server) => {
              const hasLive = server.live !== null;
              const memPct =
                server.memory > 0 && hasLive
                  ? Math.min(100, (server.live!.memoryBytes / (server.memory * 1024 * 1024)) * 100)
                  : 0;
              const diskPct =
                server.disk > 0 && hasLive
                  ? Math.min(100, (server.live!.diskBytes / (server.disk * 1024 * 1024)) * 100)
                  : 0;
              const liveLabel = hasLive ? formatBytes(server.live!.memoryBytes) : '—';
              const diskLabel = hasLive ? formatBytes(server.live!.diskBytes) : '—';
              const cpuLabel = hasLive ? `${server.live!.cpu.toFixed(1)}%` : '—';
              const sourceHint =
                server.liveSource === 'wings'
                  ? 'Live from Wings'
                  : server.liveSource === 'snapshot' && server.live
                    ? `Snapshot ${formatActivityTime(server.live.recordedAt)}`
                    : 'No live data — open server console or check Wings';

              return (
                <li key={server.id}>
                  <Link to={`/admin/servers/${server.id}`} className="node-server-capacity-row group">
                    <div className="node-server-capacity-row-main">
                      <div className="min-w-0">
                        <p className="truncate font-medium group-hover:accent-text">{server.name}</p>
                        <p className="truncate text-[10px] text-[var(--muted)]">{sourceHint}</p>
                      </div>
                      <AdminServerStatusBadge
                        status={server.status}
                        suspended={server.suspended}
                        installStatus={server.installStatus ?? undefined}
                        containerState={server.containerState}
                        compact
                      />
                    </div>
                    <div className="node-server-capacity-meters">
                      <ServerMeter
                        label="RAM"
                        live={liveLabel}
                        limit={formatResource(server.memory, 'MiB')}
                        percent={memPct}
                        tone="memory"
                        state={server.live?.state}
                      />
                      <ServerMeter
                        label="Disk"
                        live={diskLabel}
                        limit={formatResource(server.disk, 'MiB')}
                        percent={diskPct}
                        tone="disk"
                        state={server.live?.state}
                      />
                      <div className="node-server-capacity-cpu">
                        <span className="text-[10px] text-[var(--muted)]">CPU</span>
                        <span className="font-mono text-xs font-semibold">{cpuLabel}</span>
                        <span className="text-[10px] text-[var(--muted)]">/ {server.cpu}% limit</span>
                        {server.live?.state && (
                          <span className="node-server-live-state">{server.live.state}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ServerMeter({
  label,
  live,
  limit,
  percent,
  tone,
  state,
}: {
  label: string;
  live: string;
  limit: string;
  percent: number;
  tone: 'memory' | 'disk';
  state?: string;
}) {
  const offline = state === 'offline' || state === 'stopped';
  return (
    <div className="node-server-meter">
      <div className="node-server-meter-head">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-[var(--muted)]">
          {live} / {limit}
        </span>
      </div>
      <div className="node-server-meter-track">
        <div
          className={`node-server-meter-fill node-server-meter-fill--${tone}${offline ? ' node-server-meter-fill--muted' : ''}`}
          style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
    </div>
  );
}
