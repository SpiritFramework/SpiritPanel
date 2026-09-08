import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ServerStatsResponse, type StatPoint } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { useServerLiveStats } from './useServerLiveStats';
import { buildAnalyticsSeries, networkRateSeries } from '../lib/stats';

export const ANALYTICS_RANGES = [
  { id: '1h', label: '1h', longLabel: 'Last hour' },
  { id: '24h', label: '24h', longLabel: 'Last 24 hours' },
  { id: '7d', label: '7d', longLabel: 'Last 7 days' },
] as const;

export type AnalyticsRangeId = (typeof ANALYTICS_RANGES)[number]['id'];

export function useServerAnalytics() {
  const id = useServerRouteId();
  const { server } = useServer();
  const [range, setRange] = useState<AnalyticsRangeId>('24h');
  const [stats, setStats] = useState<ServerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const { connected, live: wsLive } = useServerLiveStats(id);
  const livePointRef = useRef<StatPoint | null>(null);

  const livePoint = wsLive ?? stats?.live ?? null;
  livePointRef.current = livePoint;
  const backupBytes = stats?.diskBackupBytes ?? 0;
  const currentRaw = livePoint ?? stats?.series[stats?.series.length - 1] ?? null;
  const current = currentRaw
    ? {
        ...currentRaw,
        diskBytes:
          wsLive && backupBytes > 0 ? currentRaw.diskBytes + backupBytes : currentRaw.diskBytes,
      }
    : null;
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
    const liveForChart =
      wsLive && backupBytes > 0
        ? { ...wsLive, diskBytes: wsLive.diskBytes + backupBytes }
        : livePoint;
    return buildAnalyticsSeries(stats?.series ?? [], liveForChart, range, maxPoints);
  }, [stats?.series, livePoint, wsLive, backupBytes, range]);

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

  const activeRange = ANALYTICS_RANGES.find((r) => r.id === range) ?? ANALYTICS_RANGES[1];

  return {
    server,
    range,
    setRange,
    loading,
    refreshing,
    statsError,
    connected,
    current,
    limits,
    memoryLimitBytes,
    diskLimitBytes,
    series,
    hasHistory,
    liveOnlyCharts,
    cpuData,
    memoryData,
    diskData,
    networkData,
    activeRange,
    refresh: () => load(true),
  };
}
