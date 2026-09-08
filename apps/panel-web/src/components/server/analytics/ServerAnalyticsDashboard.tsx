import { Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useServerAnalytics } from '../../../hooks/useServerAnalytics';
import { AnalyticsHeader } from './AnalyticsHeader';
import { AnalyticsLiveStrip } from './AnalyticsLiveStrip';
import { AnalyticsChartsPanel } from './AnalyticsChartsPanel';

export function ServerAnalyticsDashboard() {
  const {
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
    refresh,
  } = useServerAnalytics();

  if (loading) {
    return (
      <div className="ds-srv-an ds-srv-an--loading">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-hover)]" aria-hidden />
        <p className="ds-srv-an-loading-text">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="ds-srv-an-shell">
      <AnalyticsHeader
        serverName={server.name}
        eggName={server.egg.name}
        eggLogoUrl={server.egg.logoUrl}
        connected={connected}
        range={range}
        activeRangeLabel={activeRange.longLabel}
        refreshing={refreshing}
        onRangeChange={setRange}
        onRefresh={refresh}
      />

      <div className="ds-srv-an-body">
        <AnalyticsLiveStrip
          current={current}
          limits={limits}
          memoryLimitBytes={memoryLimitBytes}
          diskLimitBytes={diskLimitBytes}
        />

        <AnalyticsChartsPanel
          range={range}
          activeRangeLabel={activeRange.longLabel}
          seriesCount={series.length}
          limits={limits}
          memoryLimitBytes={memoryLimitBytes}
          diskLimitBytes={diskLimitBytes}
          cpuData={cpuData}
          memoryData={memoryData}
          diskData={diskData}
          networkData={networkData}
        />

        {!connected && series.length > 0 ? (
          <div className="ds-srv-an-notice ds-srv-an-notice--info" role="status">
            <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Showing stored snapshots. Open the console tab for live usage updates.</span>
          </div>
        ) : null}

        {liveOnlyCharts ? (
          <div className="ds-srv-an-notice" role="status">
            <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Live usage only — check back after a few minutes once snapshots accumulate.
            </span>
          </div>
        ) : null}

        {!liveOnlyCharts && hasHistory ? (
          <div className="ds-srv-an-notice ds-srv-an-notice--muted" role="status">
            <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Hover charts for point-in-time values. Auto-refreshes every minute.</span>
          </div>
        ) : null}

        {statsError && !current ? (
          <div className="ds-srv-an-notice ds-srv-an-notice--warning" role="alert">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Could not load usage data. Check that the node is online and try refreshing.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
