import { Button } from '../../Layout';
import type { NestDetailController } from '../../../pages/admin/nest-detail/useNestDetail';

export function NestDetailSaveBar({ ctrl }: { ctrl: NestDetailController }) {
  const { hasChanges, saving, error, saved, resetForm } = ctrl;

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
