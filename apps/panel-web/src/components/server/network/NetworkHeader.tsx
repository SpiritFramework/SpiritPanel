import { Network, Plus, RefreshCw } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function NetworkHeader({
  serverName,
  eggName,
  eggLogoUrl,
  used,
  limit,
  refreshing,
  canCreate,
  atLimit,
  creating,
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
  creating: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const quotaLabel =
    limit === 0 ? 'Ports disabled' : atLimit ? 'Limit reached' : `${used}/${limit} ports`;

  return (
    <header className="ds-srv-net-header">
      <div className="ds-srv-net-header-accent" aria-hidden />

      <div className="ds-srv-net-header-body">
        <div className="ds-srv-net-header-main">
          <div className="ds-srv-net-header-identity">
            <div className="ds-srv-net-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-net-header-title-row">
                <h1 className="ds-srv-net-header-title truncate">{serverName}</h1>
                <span className="ds-srv-net-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-net-header-route">Network</span>
                <StatusPill label={quotaLabel} tone={atLimit ? 'warning' : 'neutral'} compact />
              </div>
              <p className="ds-srv-net-header-meta truncate">
                Connection details, port allocations &amp; optional subdomain
              </p>
            </div>
          </div>

          <div className="ds-srv-net-header-actions">
            <button
              type="button"
              className="ds-srv-net-action-btn"
              title="Refresh network"
              aria-label="Refresh network"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canCreate ? (
              <button
                type="button"
                className="ds-srv-net-create-btn"
                disabled={atLimit || limit === 0 || creating}
                onClick={onCreate}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                <span>{creating ? 'Assigning…' : 'Add port'}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-net-header-kicker" aria-hidden>
          <Network className="h-3 w-3" />
          <span>Connectivity</span>
        </div>
      </div>
    </header>
  );
}
