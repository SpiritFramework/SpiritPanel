import { AlertTriangle } from 'lucide-react';
import { Spinner } from '../../ui';
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
    liveOnlyCharts,
    cpuData,
    memoryData,
    diskData,
    networkData,
    activeRange,
    refresh,
  } = useServerAnalytics();

  return (
    <div className={`ds-srv-an-shell${refreshing ? ' ds-srv-an-shell--refreshing' : ''}`}>
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

      {loading ? (
        <div className="ds-srv-an-body ds-srv-an-body--loading" role="status" aria-live="polite">
          <Spinner className="h-7 w-7" />
          <span className="sr-only">Loading analytics</span>
        </div>
      ) : (
        <div className="ds-srv-an-body">
          <AnalyticsLiveStrip
            current={current}
            limits={limits}
            memoryLimitBytes={memoryLimitBytes}
            diskLimitBytes={diskLimitBytes}
          />

          {statsError && !current ? (
            <div className="ds-srv-an-notice ds-srv-an-notice--warning" role="alert">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Could not load usage data. Check that the node is online and try refreshing.</span>
            </div>
          ) : null}

          {!connected && series.length > 0 ? (
            <div className="ds-srv-an-notice ds-srv-an-notice--info" role="status">
              <span>Showing stored snapshots. Open Console for a live tip on the charts.</span>
            </div>
          ) : null}

          {liveOnlyCharts ? (
            <div className="ds-srv-an-notice" role="status">
              <span>Live usage only — history appears after a few minutes of snapshots.</span>
            </div>
          ) : null}

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
        </div>
      )}
    </div>
  );
}
