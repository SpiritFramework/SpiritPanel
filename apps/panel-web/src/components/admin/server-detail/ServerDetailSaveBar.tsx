import { Button } from '../../Layout';
import type { ServerDetailController } from '../../../pages/admin/server-detail/useServerDetail';

export function ServerDetailSaveBar({
  ctrl,
  fullAdmin,
}: {
  ctrl: ServerDetailController;
  fullAdmin: boolean;
}) {
  const { hasChanges, saving, error, saved, resetForm } = ctrl;
  if (!fullAdmin && !hasChanges) return null;

  return (
    <div
      className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : ''}${saved ? ' ds-nd-st-savebar--saved' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="ds-nd-st-savebar-status">
        {error && hasChanges ? (
          <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
        ) : saved && !hasChanges ? (
          <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Changes saved</span>
        ) : hasChanges ? (
          <span className="ds-nd-st-savebar-msg">
            <span className="ds-nd-st-savebar-dot" aria-hidden />
            Unsaved changes
          </span>
        ) : (
          <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">All changes saved</span>
        )}
      </div>
      <div className="ds-nd-st-savebar-actions">
        <Button type="button" variant="ghost" disabled={!hasChanges || saving} onClick={resetForm}>
          Reset
        </Button>
        <Button type="submit" disabled={!hasChanges || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
