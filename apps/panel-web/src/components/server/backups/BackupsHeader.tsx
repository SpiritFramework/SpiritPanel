import { Archive, Plus, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function BackupsHeader({
  serverName,
  eggName,
  eggLogoUrl,
  used,
  limit,
  pendingCount,
  refreshing,
  canCreate,
  atLimit,
  onRefresh,
  onCreate,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  used: number;
  limit: number;
  pendingCount: number;
  refreshing: boolean;
  canCreate: boolean;
  atLimit: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const quotaLabel =
    limit === 0 ? 'Disabled' : atLimit ? 'Limit reached' : `${used}/${limit} slots`;

  return (
    <header className="ds-srv-bk-header">
      <div className="ds-srv-bk-header-accent" aria-hidden />

      <div className="ds-srv-bk-header-body">
        <div className="ds-srv-bk-header-main">
          <div className="ds-srv-bk-header-identity">
            <div className="ds-srv-bk-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-bk-header-title-row">
                <h1 className="ds-srv-bk-header-title truncate">{serverName}</h1>
                <span className="ds-srv-bk-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-bk-header-route">Backups</span>
                <StatusPill label={quotaLabel} tone={atLimit ? 'warning' : 'neutral'} compact />
                {pendingCount > 0 ? <StatusPill label={`${pendingCount} running`} tone="info" compact pulse /> : null}
              </div>
              <p className="ds-srv-bk-header-meta truncate">
                Archive files for restore, migration &amp; disaster recovery
              </p>
            </div>
          </div>

          <div className="ds-srv-bk-header-actions">
            <button
              type="button"
              className="ds-srv-bk-action-btn"
              title="Refresh backups"
              aria-label="Refresh backups"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canCreate ? (
              <button
                type="button"
                className="ds-srv-bk-create-btn"
                disabled={atLimit || limit === 0}
                onClick={onCreate}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>New backup</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-bk-header-kicker" aria-hidden>
          <Archive className="h-3 w-3" />
          <span>Server archives</span>
        </div>
      </div>
    </header>
  );
}
