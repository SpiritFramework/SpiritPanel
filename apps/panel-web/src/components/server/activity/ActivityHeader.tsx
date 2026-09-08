import { History, RefreshCw, Trash2 } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function ActivityHeader({
  serverName,
  eggName,
  eggLogoUrl,
  totalEvents,
  refreshing,
  canClear,
  clearing,
  onRefresh,
  onClear,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  totalEvents: number;
  refreshing: boolean;
  canClear: boolean;
  clearing: boolean;
  onRefresh: () => void;
  onClear: () => void;
}) {
  return (
    <header className="ds-srv-act-header">
      <div className="ds-srv-act-header-accent" aria-hidden />

      <div className="ds-srv-act-header-body">
        <div className="ds-srv-act-header-main">
          <div className="ds-srv-act-header-identity">
            <div className="ds-srv-act-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-act-header-title-row">
                <h1 className="ds-srv-act-header-title truncate">{serverName}</h1>
                <span className="ds-srv-act-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-act-header-route">Activity</span>
                <StatusPill label="Audit log" tone="neutral" compact />
              </div>
              <p className="ds-srv-act-header-meta truncate">
                Power, files, settings &amp; access events · 30-day retention
              </p>
            </div>
          </div>

          <div className="ds-srv-act-header-actions">
            {totalEvents > 0 ? (
              <span className="ds-srv-act-header-count">{totalEvents} events</span>
            ) : null}
            <button
              type="button"
              className="ds-srv-act-action-btn"
              title="Refresh activity"
              aria-label="Refresh activity"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canClear ? (
              <button
                type="button"
                className="ds-srv-act-action-btn ds-srv-act-action-btn--danger"
                title="Clear all activity"
                aria-label="Clear all activity"
                disabled={clearing}
                onClick={onClear}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-act-header-kicker" aria-hidden>
          <History className="h-3 w-3" />
          <span>Server audit trail</span>
        </div>
      </div>
    </header>
  );
}
