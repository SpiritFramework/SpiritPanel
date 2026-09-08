import { Check, RefreshCw, RotateCcw, Save, Settings } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function SettingsHeader({
  serverName,
  eggName,
  eggLogoUrl,
  hasChanges,
  saving,
  saved,
  canEdit,
  refreshing,
  suspended,
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
  canEdit: boolean;
  refreshing: boolean;
  suspended: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const statusLabel = hasChanges ? 'Unsaved changes' : saved ? 'Saved' : 'Up to date';
  const statusTone = hasChanges ? 'warning' : saved ? 'success' : 'neutral';

  return (
    <header className="ds-srv-set-header">
      <div className="ds-srv-set-header-accent" aria-hidden />

      <div className="ds-srv-set-header-body">
        <div className="ds-srv-set-header-main">
          <div className="ds-srv-set-header-identity">
            <div className="ds-srv-set-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-set-header-title-row">
                <h1 className="ds-srv-set-header-title truncate">{serverName}</h1>
                <span className="ds-srv-set-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-set-header-route">Settings</span>
                <StatusPill label={statusLabel} tone={statusTone} compact />
                {suspended ? <StatusPill label="Suspended" tone="warning" compact /> : null}
              </div>
              <p className="ds-srv-set-header-meta truncate">
                Server details, metadata &amp; reinstall options
              </p>
            </div>
          </div>

          <div className="ds-srv-set-header-actions">
            <button
              type="button"
              className="ds-srv-set-action-btn"
              title="Refresh settings"
              aria-label="Refresh settings"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="ds-srv-set-action-btn"
                  title="Reset changes"
                  disabled={!hasChanges || saving}
                  onClick={onReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="ds-srv-set-save-btn"
                  disabled={saving || !hasChanges || !serverName.trim()}
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

        <div className="ds-srv-set-header-kicker" aria-hidden>
          <Settings className="h-3 w-3" />
          <span>Configuration</span>
        </div>
      </div>
    </header>
  );
}
