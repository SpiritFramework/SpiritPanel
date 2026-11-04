import { Button } from '../../Layout';
import { AdminSaveBar } from '../primitives';
import type { UserDetailController } from '../../../pages/admin/user-detail/useUserDetail';

export function UserDetailSaveBar({
  ctrl,
  fullAdmin,
}: {
  ctrl: UserDetailController;
  fullAdmin: boolean;
}) {
  const { hasChanges, saving, error, saved, resetForm } = ctrl;
  if (!fullAdmin) return null;

  const status = error && hasChanges ? (
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
  );

  return (
    <AdminSaveBar
      dirty={hasChanges}
      saved={saved && !hasChanges}
      status={status}
      actions={
        <>
          <Button type="button" variant="ghost" disabled={!hasChanges || saving} onClick={resetForm}>
            Reset
          </Button>
          <Button type="submit" disabled={!hasChanges || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    />
  );
}
