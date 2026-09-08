import { Database, Plus, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function DatabasesHeader({
  serverName,
  eggName,
  eggLogoUrl,
  used,
  limit,
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
  refreshing: boolean;
  canCreate: boolean;
  atLimit: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const quotaLabel =
    limit === 0 ? 'Disabled' : atLimit ? 'Limit reached' : `${used}/${limit} slots`;

  return (
    <header className="ds-srv-db-header">
      <div className="ds-srv-db-header-accent" aria-hidden />

      <div className="ds-srv-db-header-body">
        <div className="ds-srv-db-header-main">
          <div className="ds-srv-db-header-identity">
            <div className="ds-srv-db-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-db-header-title-row">
                <h1 className="ds-srv-db-header-title truncate">{serverName}</h1>
                <span className="ds-srv-db-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-db-header-route">Databases</span>
                <StatusPill label={quotaLabel} tone={atLimit ? 'warning' : 'neutral'} compact />
              </div>
              <p className="ds-srv-db-header-meta truncate">
                MySQL databases for plugins, integrations &amp; persistent data
              </p>
            </div>
          </div>

          <div className="ds-srv-db-header-actions">
            <button
              type="button"
              className="ds-srv-db-action-btn"
              title="Refresh databases"
              aria-label="Refresh databases"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canCreate ? (
              <button
                type="button"
                className="ds-srv-db-create-btn"
                disabled={atLimit || limit === 0}
                onClick={onCreate}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>New database</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-db-header-kicker" aria-hidden>
          <Database className="h-3 w-3" />
          <span>MySQL storage</span>
        </div>
      </div>
    </header>
  );
}
