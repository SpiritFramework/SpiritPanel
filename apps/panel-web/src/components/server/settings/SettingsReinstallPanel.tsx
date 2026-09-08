import { RotateCw } from 'lucide-react';
import { Button } from '../../Layout';
import { Checkbox } from '../../Checkbox';

export function SettingsReinstallPanel({
  serverName,
  canReinstall,
  installing,
  suspended,
  confirmReinstall,
  wipeFiles,
  reinstalling,
  reinstallError,
  onStartConfirm,
  onCancelConfirm,
  onWipeFilesChange,
  onReinstall,
}: {
  serverName: string;
  canReinstall: boolean;
  installing: boolean;
  suspended: boolean;
  confirmReinstall: boolean;
  wipeFiles: boolean;
  reinstalling: boolean;
  reinstallError: string;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onWipeFilesChange: (checked: boolean) => void;
  onReinstall: () => void;
}) {
  if (!canReinstall) return null;

  return (
    <section className="ds-srv-set-panel ds-srv-set-panel--danger">
      <div className="ds-srv-set-panel-head ds-srv-set-panel-head--danger">
        <RotateCw className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-set-panel-title">Reinstall server</h3>
          <p className="ds-srv-set-panel-meta">Re-run the egg installation script via FeatherWings</p>
        </div>
      </div>

      <div className="ds-srv-set-panel-body">
        <p className="ds-srv-set-reinstall-copy">
          Use this if your server is broken or you want a clean setup. The server will be stopped before
          reinstalling.
        </p>

        {installing ? (
          <div className="ds-srv-set-info">Installation is already in progress — open the Console tab to watch output.</div>
        ) : null}

        {!confirmReinstall ? (
          <Button type="button" variant="ghost" disabled={installing || suspended} onClick={onStartConfirm}>
            <RotateCw className="h-3.5 w-3.5" />
            Reinstall server
          </Button>
        ) : (
          <div className="ds-srv-set-reinstall-confirm">
            <p className="ds-srv-set-reinstall-confirm-text">
              Reinstall <strong>{serverName}</strong>? The install script will run again on FeatherWings.
            </p>
            <Checkbox
              label="Wipe all files first"
              description="Deletes everything in the server directory before reinstalling (worlds, configs, mods, etc.)"
              checked={wipeFiles}
              onChange={onWipeFilesChange}
            />
            {reinstallError ? <div className="ds-srv-set-error-inline">{reinstallError}</div> : null}
            <div className="ds-srv-set-reinstall-actions">
              <Button type="button" variant="danger" disabled={reinstalling} onClick={onReinstall}>
                {reinstalling ? 'Reinstalling…' : wipeFiles ? 'Wipe & reinstall' : 'Reinstall'}
              </Button>
              <Button type="button" variant="ghost" disabled={reinstalling} onClick={onCancelConfirm}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
