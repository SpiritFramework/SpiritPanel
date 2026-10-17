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
  const countLabel =
    totalEvents <= 0 ? 'No events' : `${totalEvents} event${totalEvents === 1 ? '' : 's'}`;

  return (
    <header className="ds-srv-act-header">
      <div className="ds-srv-act-header-accent" aria-hidden />

      <div className="ds-srv-act-header-body">
        <div className="ds-srv-act-header-main">
          <div className="ds-srv-act-header-identity">
            <div className="ds-srv-act-header-icon-wrap" aria-hidden>
              <ServerEggIcon
                eggName={eggName}
                logoUrl={eggLogoUrl}
                className="h-5 w-5"
                iconClassName="h-5 w-5 text-white/90"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-act-header-title-row">
                <h1 className="ds-srv-act-header-title truncate">{serverName}</h1>
                <span className="ds-srv-act-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-act-header-route">Activity</span>
                <StatusPill label={countLabel} tone="neutral" compact />
              </div>
              <p className="ds-srv-act-header-meta truncate">
                Audit trail for power, files, settings &amp; access · kept for 30 days
              </p>
            </div>
          </div>

          <div className="ds-srv-act-header-actions">
            <button
              type="button"
              className="ds-srv-act-action-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh activity"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              <span className="ds-srv-act-action-label">Refresh</span>
            </button>
            {canClear ? (
              <button
                type="button"
                className="ds-srv-act-action-btn ds-srv-act-action-btn--danger"
                title="Clear all activity"
                aria-label="Clear all activity"
                disabled={clearing || totalEvents <= 0}
                onClick={onClear}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="ds-srv-act-action-label">Clear</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-act-header-kicker" aria-hidden>
          <History className="h-3 w-3" />
          <span>Audit log</span>
        </div>
      </div>
    </header>
  );
}
