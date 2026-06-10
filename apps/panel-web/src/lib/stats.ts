export function formatBytes(bytes: number): string {
  const n = Math.max(0, bytes);
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

export function formatNetworkRate(bytesPerSec: number): string {
  const n = Math.max(0, bytesPerSec);
  if (n < 1) return `${n.toFixed(2)} B/s`;
  if (n < 1024) return `${n.toFixed(1)} B/s`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB/s`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MiB/s`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GiB/s`;
}

export const CHART_RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export function chartWindowForRange(range: string, endMs = Date.now()): { startMs: number; endMs: number } {
  const span = CHART_RANGE_MS[range] ?? CHART_RANGE_MS['24h'];
  return { startMs: endMs - span, endMs };
}

export function formatChartTime(iso: string, range: string): string {
  const d = new Date(iso);
  if (range === '1h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatChartAxisValue(value: number, unit: 'percent' | 'bytes' | 'rate'): string {
  if (unit === 'percent') return `${value.toFixed(0)}%`;
  if (unit === 'rate') return formatNetworkRate(value);
  return formatBytes(value);
}

export function percentOf(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (value / limit) * 100);
}

export interface StatSeriesPoint {
  recordedAt: string;
  cpu: number;
  memoryBytes: number;
  diskBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  state: string;
}

function downsampleSeries(series: StatSeriesPoint[], maxPoints: number): StatSeriesPoint[] {
  if (series.length <= maxPoints) return series;
  const bucketSize = Math.ceil(series.length / maxPoints);
  const buckets: StatSeriesPoint[] = [];
  for (let i = 0; i < series.length; i += bucketSize) {
    const slice = series.slice(i, i + bucketSize);
    if (slice.length === 0) continue;
    const first = slice[0];
    const last = slice[slice.length - 1];
    buckets.push({
      // Use bucket end time so cumulative network counters align with Δt between points.
      recordedAt: last.recordedAt,
      cpu: slice.reduce((sum, p) => sum + p.cpu, 0) / slice.length,
      memoryBytes: slice.reduce((sum, p) => sum + p.memoryBytes, 0) / slice.length,
      diskBytes: slice.reduce((sum, p) => sum + p.diskBytes, 0) / slice.length,
      networkRxBytes: last.networkRxBytes,
      networkTxBytes: last.networkTxBytes,
      state: last.state,
    });
  }
  return buckets;
}

/** Merge historical + live points, clip to range, and downsample for chart density. */
export function buildAnalyticsSeries(
  historical: StatSeriesPoint[],
  live: StatSeriesPoint | null | undefined,
  range: string,
  maxPoints: number,
): StatSeriesPoint[] {
  const { startMs } = chartWindowForRange(range);
  let series = historical.filter((point) => new Date(point.recordedAt).getTime() >= startMs);

  if (live) {
    const last = series[series.length - 1];
    const liveMs = new Date(live.recordedAt).getTime();
    if (!last) {
      series = [live];
    } else {
      const lastMs = new Date(last.recordedAt).getTime();
      if (liveMs > lastMs) {
        series.push(live);
      }
    }
  }

  if (series.length === 0 && live) {
    series = [live];
  }

  if (series.length === 1) {
    const point = series[0];
    const t = new Date(point.recordedAt).getTime();
    const padMs = range === '1h' ? 5 * 60_000 : range === '24h' ? 30 * 60_000 : 6 * 60 * 60_000;
    series = [{ ...point, recordedAt: new Date(Math.max(startMs, t - padMs)).toISOString() }, point];
  }

  return downsampleSeries(series, maxPoints);
}

/** Compute combined RX+TX throughput (bytes/s) from cumulative counter snapshots. */
export function networkRateSeries(series: StatSeriesPoint[]): Array<{ x: string; y: number }> {
  return series.map((point, index) => {
    if (index === 0) return { x: point.recordedAt, y: 0 };
    const prev = series[index - 1];
    const dt = (new Date(point.recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 1000;
    const delta =
      point.networkRxBytes + point.networkTxBytes - (prev.networkRxBytes + prev.networkTxBytes);
    if (dt <= 0 || delta < 0) return { x: point.recordedAt, y: 0 };
    return { x: point.recordedAt, y: delta / dt };
  });
}
