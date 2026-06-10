import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, RefreshCw, Wifi } from 'lucide-react';
import { api, type ServerStatsResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useServerLiveStats } from '../../hooks/useServerLiveStats';
import { formatBytes, buildAnalyticsSeries, networkRateSeries, formatNetworkRate } from '../../lib/stats';
import { formatResource } from '../../lib/server-theme';
import { UsageChart, UsageMeter } from '../../components/UsageChart';
import {
  ServerLoadingBlock,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';
import { StatCard } from '../../components/ui';

const RANGES = [
  { id: '1h', label: '1h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

export function ServerAnalyticsPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const [range, setRange] = useState<RangeId>('24h');
  const [stats, setStats] = useState<ServerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const { connected, live: wsLive } = useServerLiveStats(id);
  const livePointRef = useRef(wsLive ?? stats?.live ?? null);

  const livePoint = wsLive ?? stats?.live ?? null;
  livePointRef.current = livePoint;
  const current = livePoint ?? stats?.series[stats?.series.length - 1] ?? null;
  const limits = stats?.limits ?? { memory: server.memory, disk: server.disk, cpu: server.cpu };
  const memoryLimitBytes = limits.memory > 0 ? limits.memory * 1024 * 1024 : 0;
  const diskLimitBytes = limits.disk > 0 ? limits.disk * 1024 * 1024 : 0;

  async function load(showRefresh = false) {
    if (!id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.client.stats(id, range);
      setStats(data);
      setStatsError(false);
    } catch {
      setStatsError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [id, range]);

  useEffect(() => {
    if (!id || !connected) return;
    const persist = () => {
      const live = livePointRef.current;
      if (!live) return;
      api.client
        .statsSnapshot(id, {
          cpu: live.cpu,
          memoryBytes: live.memoryBytes,
          diskBytes: live.diskBytes,
          networkRxBytes: live.networkRxBytes,
          networkTxBytes: live.networkTxBytes,
          state: live.state,
        })
        .catch(() => {});
    };
    persist();
    const timer = window.setInterval(persist, 30_000);
    return () => window.clearInterval(timer);
  }, [id, connected]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => load(true), 60_000);
    return () => window.clearInterval(timer);
  }, [id, range]);

  const series = useMemo(() => {
    const maxPoints = range === '7d' ? 96 : range === '24h' ? 72 : 60;
    return buildAnalyticsSeries(stats?.series ?? [], livePoint, range, maxPoints);
  }, [stats?.series, livePoint, range]);

  const hasHistory = (stats?.series.length ?? 0) > 0;
  const liveOnlyCharts = !hasHistory && series.length > 0;

  const cpuData = series.map((p) => ({ x: p.recordedAt, y: p.cpu }));
  const memoryData = series.map((p) => ({
    x: p.recordedAt,
    y: memoryLimitBytes > 0 ? (p.memoryBytes / memoryLimitBytes) * 100 : p.memoryBytes,
  }));
  const diskData = series.map((p) => ({
    x: p.recordedAt,
    y: diskLimitBytes > 0 ? (p.diskBytes / diskLimitBytes) * 100 : p.diskBytes,
  }));
  const networkData = networkRateSeries(series);

  return (
    <ServerPage>
      <ServerPageHeader
        title="Analytics"
        description="CPU, memory, disk, and network usage over time"
        actions={
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                connected
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 status-pulse' : 'bg-[var(--border)]'}`} />
              {connected ? 'Live' : 'Historical'}
            </span>
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
                    range === r.id ? 'accent-bg text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <ServerToolbarButton icon={RefreshCw} label="Refresh" onClick={() => load(true)} disabled={refreshing} />
          </>
        }
      />

      {loading ? (
        <ServerLoadingBlock />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UsageMeter
              label="CPU"
              value={current?.cpu ?? 0}
              limit={limits.cpu > 0 ? limits.cpu : 0}
              unit={`${(current?.cpu ?? 0).toFixed(1)}%`}
              limitLabel={limits.cpu > 0 ? `${limits.cpu}% limit` : 'Unlimited'}
              color="#818cf8"
            />
            <UsageMeter
              label="Memory"
              value={current?.memoryBytes ?? 0}
              limit={memoryLimitBytes}
              unit={formatBytes(current?.memoryBytes ?? 0)}
              limitLabel={memoryLimitBytes > 0 ? `${formatResource(limits.memory, 'MiB')} limit` : 'Unlimited'}
              color="#34d399"
            />
            <UsageMeter
              label="Disk"
              value={current?.diskBytes ?? 0}
              limit={diskLimitBytes}
              unit={formatBytes(current?.diskBytes ?? 0)}
              limitLabel={diskLimitBytes > 0 ? `${formatResource(limits.disk, 'MiB')} limit` : 'Unlimited'}
              color="#fbbf24"
            />
            <StatCard
              label="Network"
              value={`↓ ${formatBytes(current?.networkRxBytes ?? 0)}`}
              hint={`↑ ${formatBytes(current?.networkTxBytes ?? 0)}`}
              icon={<Wifi className="h-3.5 w-3.5" />}
            />
          </div>

          <ServerPanel icon={BarChart3} title="Usage charts" description={`Showing ${range} range`} noPadding bodyClassName="p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <UsageChart title="CPU usage" unit={limits.cpu > 0 ? `Limit ${limits.cpu}%` : 'Unlimited'} color="#818cf8" range={range} data={cpuData} max={limits.cpu > 0 ? limits.cpu : undefined} valueUnit="percent" formatValue={(v) => `${v.toFixed(1)}%`} />
              <UsageChart
                title="Memory usage"
                unit={memoryLimitBytes > 0 ? `Limit ${formatResource(limits.memory, 'MiB')}` : 'Unlimited'}
                color="#34d399"
                range={range}
                data={memoryData}
                max={memoryLimitBytes > 0 ? 100 : undefined}
                valueUnit={memoryLimitBytes > 0 ? 'percent' : 'bytes'}
                formatValue={memoryLimitBytes > 0 ? (v) => `${v.toFixed(1)}%` : formatBytes}
              />
              <UsageChart
                title="Disk usage"
                unit={diskLimitBytes > 0 ? `Limit ${formatResource(limits.disk, 'MiB')}` : 'Unlimited'}
                color="#fbbf24"
                range={range}
                data={diskData}
                max={diskLimitBytes > 0 ? 100 : undefined}
                valueUnit={diskLimitBytes > 0 ? 'percent' : 'bytes'}
                formatValue={diskLimitBytes > 0 ? (v) => `${v.toFixed(1)}%` : formatBytes}
              />
              <UsageChart title="Network throughput" unit="Combined RX + TX rate" color="#38bdf8" range={range} data={networkData} valueUnit="rate" formatValue={formatNetworkRate} />
            </div>
          </ServerPanel>

          {!connected && series.length > 0 && (
            <ServerNotice tone="muted">
              <span className="inline-flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                Showing stored snapshots. Open the console tab for live usage updates.
              </span>
            </ServerNotice>
          )}

          {liveOnlyCharts && (
            <ServerNotice tone="muted">
              <span className="inline-flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                Live usage only — snapshots are saved every 30 seconds while the console is connected, or by the
                panel collector in the background. Check back after a few minutes for chart history.
              </span>
            </ServerNotice>
          )}

          {!liveOnlyCharts && hasHistory && (
            <ServerNotice tone="muted">
              <span className="inline-flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                Snapshots are stored for up to 8 days, then pruned automatically.
              </span>
            </ServerNotice>
          )}

          {statsError && !current && (
            <ServerNotice tone="warning">
              Could not load usage data. Check that the node is online and try refreshing.
            </ServerNotice>
          )}
        </>
      )}
    </ServerPage>
  );
}
