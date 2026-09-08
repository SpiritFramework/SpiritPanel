import { Plus, RefreshCw, Users } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function SubusersHeader({
  serverName,
  eggName,
  eggLogoUrl,
  totalCount,
  refreshing,
  onRefresh,
  onInvite,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  totalCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onInvite: () => void;
}) {
  return (
    <header className="ds-srv-sub-header">
      <div className="ds-srv-sub-header-accent" aria-hidden />

      <div className="ds-srv-sub-header-body">
        <div className="ds-srv-sub-header-main">
          <div className="ds-srv-sub-header-identity">
            <div className="ds-srv-sub-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-sub-header-title-row">
                <h1 className="ds-srv-sub-header-title truncate">{serverName}</h1>
                <span className="ds-srv-sub-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-sub-header-route">Subusers</span>
                <StatusPill
                  label={`${totalCount} member${totalCount === 1 ? '' : 's'}`}
                  tone={totalCount > 0 ? 'success' : 'neutral'}
                  compact
                />
              </div>
              <p className="ds-srv-sub-header-meta truncate">
                Grant panel users access with fine-grained permissions
              </p>
            </div>
          </div>

          <div className="ds-srv-sub-header-actions">
            <button
              type="button"
              className="ds-srv-sub-action-btn"
              title="Refresh subusers"
              aria-label="Refresh subusers"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            <button type="button" className="ds-srv-sub-create-btn" onClick={onInvite}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Invite user</span>
            </button>
          </div>
        </div>

        <div className="ds-srv-sub-header-kicker" aria-hidden>
          <Users className="h-3 w-3" />
          <span>Team access</span>
        </div>
      </div>
    </header>
  );
}
