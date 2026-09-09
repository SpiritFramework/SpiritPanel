import { Activity, BarChart3, Clock, Cpu, Database, Gauge, HardDrive, MemoryStick, TrendingUp, type LucideIcon } from 'lucide-react';
import { ChartSyncProvider, UsageChart } from '../../UsageChart';
import { formatBytes, formatNetworkRate } from '../../../lib/stats';
import { formatResource } from '../../../lib/server-theme';
import type { ChartPoint } from '../../UsageChart';
import type { AnalyticsRangeId } from '../../../hooks/useServerAnalytics';

export function AnalyticsChartsPanel({
  range,
  activeRangeLabel,
  seriesCount,
  limits,
  memoryLimitBytes,
  diskLimitBytes,
  cpuData,
  memoryData,
  diskData,
  networkData,
}: {
  range: AnalyticsRangeId;
  activeRangeLabel: string;
  seriesCount: number;
  limits: { memory: number; disk: number; cpu: number };
  memoryLimitBytes: number;
  diskLimitBytes: number;
  cpuData: ChartPoint[];
  memoryData: ChartPoint[];
  diskData: ChartPoint[];
  networkData: ChartPoint[];
}) {
  const hasCharts = seriesCount > 0;

  const allocationRows: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    hint: string;
    tone: 'cpu' | 'ram' | 'disk';
  }> = [
    {
      icon: Cpu,
      label: 'CPU',
      value: limits.cpu > 0 ? `${limits.cpu}%` : 'Unlimited',
      hint: limits.cpu > 0 ? 'Processor limit' : 'No hard cap',
      tone: 'cpu',
    },
    {
      icon: MemoryStick,
      label: 'Memory',
      value: limits.memory > 0 ? formatResource(limits.memory, 'MiB') : 'Unlimited',
      hint: limits.memory > 0 ? 'RAM allocation' : 'No hard cap',
      tone: 'ram',
    },
    {
      icon: HardDrive,
      label: 'Disk',
      value: limits.disk > 0 ? formatResource(limits.disk, 'MiB') : 'Unlimited',
      hint: limits.disk > 0 ? 'Files + backups' : 'No hard cap',
      tone: 'disk',
    },
  ];

  return (
    <div className="ds-srv-an-bento">
      <section className="ds-srv-an-panel ds-srv-an-bento-main">
        <div className="ds-srv-an-panel-head">
          <span className="ds-srv-an-panel-icon" aria-hidden>
            <TrendingUp className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="ds-srv-an-panel-title">Historical trends</h2>
            <p className="ds-srv-an-panel-desc">{activeRangeLabel} · usage over time</p>
          </div>
          {hasCharts ? (
            <span className="ds-srv-an-panel-badge">{seriesCount} snapshots</span>
          ) : null}
        </div>

        <div className="ds-srv-an-panel-body">
          {hasCharts ? (
            <ChartSyncProvider>
              <div className="ds-srv-an-charts">
                <div className="ds-srv-an-chart">
                  <UsageChart
                    className="ds-srv-an-chart-inner"
                    title="CPU usage"
                    unit={limits.cpu > 0 ? `Limit ${limits.cpu}%` : 'Processor load'}
                    color="var(--accent)"
                    range={range}
                    data={cpuData}
                    max={limits.cpu > 0 ? limits.cpu : undefined}
                    warnFrom={limits.cpu > 0 ? limits.cpu * 0.8 : undefined}
                    valueUnit="percent"
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    sync
                  />
                </div>
                <div className="ds-srv-an-chart">
                  <UsageChart
                    className="ds-srv-an-chart-inner"
                    title="Memory pressure"
                    unit={memoryLimitBytes > 0 ? `Limit ${formatResource(limits.memory, 'MiB')}` : 'RAM allocated'}
                    color="#34d399"
                    range={range}
                    data={memoryData}
                    max={memoryLimitBytes > 0 ? 100 : undefined}
                    warnFrom={memoryLimitBytes > 0 ? 80 : undefined}
                    valueUnit={memoryLimitBytes > 0 ? 'percent' : 'bytes'}
                    formatValue={memoryLimitBytes > 0 ? (v) => `${v.toFixed(1)}%` : formatBytes}
                    sync
                  />
                </div>
                <div className="ds-srv-an-chart">
                  <UsageChart
                    className="ds-srv-an-chart-inner"
                    title="Disk footprint"
                    unit={
                      diskLimitBytes > 0
                        ? `Limit ${formatResource(limits.disk, 'MiB')} (files + backups)`
                        : 'Storage used'
                    }
                    color="#fbbf24"
                    range={range}
                    data={diskData}
                    max={diskLimitBytes > 0 ? 100 : undefined}
                    warnFrom={diskLimitBytes > 0 ? 80 : undefined}
                    valueUnit={diskLimitBytes > 0 ? 'percent' : 'bytes'}
                    formatValue={diskLimitBytes > 0 ? (v) => `${v.toFixed(1)}%` : formatBytes}
                    sync
                  />
                </div>
                <div className="ds-srv-an-chart">
                  <UsageChart
                    className="ds-srv-an-chart-inner"
                    title="Network throughput"
                    unit="Combined RX + TX rate"
                    color="#38bdf8"
                    range={range}
                    data={networkData}
                    valueUnit="rate"
                    formatValue={formatNetworkRate}
                    sync
                  />
                </div>
              </div>
            </ChartSyncProvider>
          ) : (
            <div className="ds-srv-an-empty">
              <Activity className="h-5 w-5 opacity-50" aria-hidden />
              <p className="ds-srv-an-empty-title">No chart history yet</p>
              <p className="ds-srv-an-empty-desc">
                Open the console for live stats — snapshots are saved every 30 seconds while connected, or by
                the panel collector in the background.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="ds-srv-an-bento-side">
        <section className="ds-srv-an-side-card ds-srv-an-alloc">
          <div className="ds-srv-an-side-head">
            <Gauge className="h-4 w-4" aria-hidden />
            <div className="min-w-0">
              <h3 className="ds-srv-an-side-title">Allocation</h3>
              <p className="ds-srv-an-alloc-desc">Hard limits for this server</p>
            </div>
          </div>
          <ul className="ds-srv-an-alloc-list" aria-label="Server resource limits">
            {allocationRows.map((row) => (
              <li key={row.label} className={`ds-srv-an-alloc-row ds-srv-an-alloc-row--${row.tone}`}>
                <span className={`ds-srv-an-alloc-icon ds-srv-an-alloc-icon--${row.tone}`} aria-hidden>
                  <row.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-srv-an-alloc-copy">
                  <span className="ds-srv-an-alloc-label">{row.label}</span>
                  <span className="ds-srv-an-alloc-hint">{row.hint}</span>
                </span>
                <strong className="ds-srv-an-alloc-value">{row.value}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="ds-srv-an-side-card">
          <div className="ds-srv-an-side-head">
            <Database className="h-4 w-4" aria-hidden />
            <h3 className="ds-srv-an-side-title">Data source</h3>
          </div>
          <p className="ds-srv-an-side-text">
            Charts combine stored snapshots with a live tip when the console websocket is connected.
          </p>
        </section>

        <section className="ds-srv-an-side-card">
          <div className="ds-srv-an-side-head">
            <Clock className="h-4 w-4" aria-hidden />
            <h3 className="ds-srv-an-side-title">Retention</h3>
          </div>
          <p className="ds-srv-an-side-text">Snapshots are kept for up to 8 days, then pruned automatically.</p>
        </section>

        <section className="ds-srv-an-side-card ds-srv-an-side-card--muted">
          <div className="ds-srv-an-side-head">
            <BarChart3 className="h-4 w-4" aria-hidden />
            <h3 className="ds-srv-an-side-title">Tip</h3>
          </div>
          <p className="ds-srv-an-side-text">
            Peak and average values update as you hover charts. Use 1h for debugging spikes, 7d for capacity planning.
          </p>
        </section>
      </aside>
    </div>
  );
}
