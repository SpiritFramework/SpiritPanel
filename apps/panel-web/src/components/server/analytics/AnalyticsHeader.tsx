import { BarChart3, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';
import type { AnalyticsRangeId } from '../../../hooks/useServerAnalytics';
import { ANALYTICS_RANGES } from '../../../hooks/useServerAnalytics';

export function AnalyticsHeader({
  serverName,
  eggName,
  eggLogoUrl,
  connected,
  range,
  activeRangeLabel,
  refreshing,
  onRangeChange,
  onRefresh,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  connected: boolean;
  range: AnalyticsRangeId;
  activeRangeLabel: string;
  refreshing: boolean;
  onRangeChange: (range: AnalyticsRangeId) => void;
  onRefresh: () => void;
}) {
  return (
    <header className="ds-srv-an-header">
      <div className="ds-srv-an-header-accent" aria-hidden />

      <div className="ds-srv-an-header-body">
        <div className="ds-srv-an-header-main">
          <div className="ds-srv-an-header-identity">
            <div className="ds-srv-an-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-an-header-title-row">
                <h1 className="ds-srv-an-header-title truncate">{serverName}</h1>
                <span className="ds-srv-an-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-an-header-route">Analytics</span>
                <StatusPill
                  label={connected ? 'Live feed' : 'Snapshots'}
                  tone={connected ? 'success' : 'neutral'}
                  pulse={connected}
                  compact
                />
              </div>
              <p className="ds-srv-an-header-meta truncate">
                {activeRangeLabel} · CPU, memory, disk &amp; network trends
              </p>
            </div>
          </div>

          <div className="ds-srv-an-header-actions">
            <div className="ds-srv-an-range" role="group" aria-label="Time range">
              {ANALYTICS_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onRangeChange(r.id)}
                  className={`ds-srv-an-range-btn${range === r.id ? ' ds-srv-an-range-btn--active' : ''}`}
                  aria-pressed={range === r.id}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ds-srv-an-action-btn"
              title="Refresh analytics"
              aria-label="Refresh analytics"
              disabled={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
          </div>
        </div>

        <div className="ds-srv-an-header-kicker" aria-hidden>
          <BarChart3 className="h-3 w-3" />
          <span>Resource telemetry</span>
        </div>
      </div>
    </header>
  );
}
