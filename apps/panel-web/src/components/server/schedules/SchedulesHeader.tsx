import { CalendarClock, Plus, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function SchedulesHeader({
  serverName,
  eggName,
  eggLogoUrl,
  totalCount,
  activeCount,
  refreshing,
  canManage,
  onRefresh,
  onCreate,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  totalCount: number;
  activeCount: number;
  refreshing: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  return (
    <header className="ds-srv-sch-header">
      <div className="ds-srv-sch-header-accent" aria-hidden />

      <div className="ds-srv-sch-header-body">
        <div className="ds-srv-sch-header-main">
          <div className="ds-srv-sch-header-identity">
            <div className="ds-srv-sch-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-sch-header-title-row">
                <h1 className="ds-srv-sch-header-title truncate">{serverName}</h1>
                <span className="ds-srv-sch-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-sch-header-route">Schedules</span>
                {totalCount > 0 ? (
                  <StatusPill label={`${activeCount} active`} tone={activeCount > 0 ? 'success' : 'neutral'} compact />
                ) : null}
              </div>
              <p className="ds-srv-sch-header-meta truncate">
                Automate restarts, backups &amp; commands — all times UTC
              </p>
            </div>
          </div>

          <div className="ds-srv-sch-header-actions">
            <button
              type="button"
              className="ds-srv-sch-action-btn"
              title="Refresh schedules"
              aria-label="Refresh schedules"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canManage ? (
              <button type="button" className="ds-srv-sch-create-btn" onClick={onCreate}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>New schedule</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-sch-header-kicker" aria-hidden>
          <CalendarClock className="h-3 w-3" />
          <span>Automation</span>
        </div>
      </div>
    </header>
  );
}
