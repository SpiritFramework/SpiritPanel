import { Check, RefreshCw, RotateCcw, Rocket, Save } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function StartupHeader({
  serverName,
  eggName,
  eggLogoUrl,
  hasChanges,
  saving,
  saved,
  canUpdate,
  refreshing,
  editableCount,
  onRefresh,
  onReset,
  onSave,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  hasChanges: boolean;
  saving: boolean;
  saved: boolean;
  canUpdate: boolean;
  refreshing: boolean;
  editableCount: number;
  onRefresh: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const statusLabel = hasChanges ? 'Unsaved changes' : saved ? 'Saved' : 'Up to date';
  const statusTone = hasChanges ? 'warning' : saved ? 'success' : 'neutral';

  return (
    <header className="ds-srv-stu-header">
      <div className="ds-srv-stu-header-accent" aria-hidden />

      <div className="ds-srv-stu-header-body">
        <div className="ds-srv-stu-header-main">
          <div className="ds-srv-stu-header-identity">
            <div className="ds-srv-stu-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-stu-header-title-row">
                <h1 className="ds-srv-stu-header-title truncate">{serverName}</h1>
                <span className="ds-srv-stu-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-stu-header-route">Startup</span>
                <StatusPill label={statusLabel} tone={statusTone} compact />
              </div>
              <p className="ds-srv-stu-header-meta truncate">
                Command template, docker image &amp; environment for {eggName}
              </p>
            </div>
          </div>

          <div className="ds-srv-stu-header-actions">
            <button
              type="button"
              className="ds-srv-stu-action-btn"
              title="Refresh startup"
              aria-label="Refresh startup"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canUpdate ? (
              <>
                <button
                  type="button"
                  className="ds-srv-stu-action-btn"
                  title="Reset changes"
                  disabled={!hasChanges || saving}
                  onClick={onReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="ds-srv-stu-save-btn"
                  disabled={saving || !hasChanges}
                  onClick={onSave}
                >
                  {saving ? (
                    <span>Saving…</span>
                  ) : saved && !hasChanges ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" aria-hidden />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="ds-srv-stu-header-kicker" aria-hidden>
          <Rocket className="h-3 w-3" />
          <span>{editableCount} editable variable{editableCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </header>
  );
}
