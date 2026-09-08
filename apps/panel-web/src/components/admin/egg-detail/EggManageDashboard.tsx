import { AlertTriangle, Egg, Trash2 } from 'lucide-react';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { Button, Input, Textarea } from '../../Layout';
import { Checkbox } from '../../Checkbox';
import { EggDetailPanel } from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

export function EggManageDashboard({ ctrl }: { ctrl: EggDetailController }) {
  const {
    detail,
    form,
    setForm,
    saving,
    confirmDelete,
    setConfirmDelete,
    deleteEgg,
    hasChanges,
    error,
  } = ctrl;

  if (!detail) return null;

  const canDelete = detail.serverCount === 0;

  return (
    <div className="ds-egg-manage">
      <EggDetailPanel icon={Egg} title="Egg details" description="Display name and availability">
        <Input
          label="Name"
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="ds-egg-form-spacer">
          <Textarea
            label="Description"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
        <div className="ds-egg-form-spacer">
          <Input
            label="Logo URL"
            hint="PNG or WebP over https — shown on server cards"
            value={form.logoUrl ?? ''}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://example.com/icon.png"
          />
          {(form.logoUrl ?? '').trim() && sanitizeImageSrc(form.logoUrl) ? (
            <div className="ds-egg-logo-preview">
              <img
                src={sanitizeImageSrc(form.logoUrl)!}
                alt=""
                className="h-7 w-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span>Preview</span>
            </div>
          ) : null}
        </div>
        <div className="ds-egg-form-spacer ds-egg-checkbox-wrap">
          <Checkbox
            checked={form.enabled ?? true}
            onChange={(checked) => setForm({ ...form, enabled: checked })}
            label="Enabled"
            description="Disabled eggs cannot be selected when creating new servers"
          />
        </div>
      </EggDetailPanel>

      <EggDetailPanel
        icon={Trash2}
        title="Danger zone"
        description="Permanently remove this egg"
        tone="danger"
      >
        {!confirmDelete ? (
          <div className="ds-egg-danger-row">
            <p className="ds-egg-danger-desc">
              {canDelete
                ? 'This action cannot be undone.'
                : 'Remove all servers using this egg before deleting.'}
            </p>
            <Button
              type="button"
              variant="danger"
              disabled={!canDelete}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete egg
            </Button>
          </div>
        ) : (
          <div className="ds-egg-confirm-box ds-egg-confirm-box--danger">
            <p className="ds-egg-confirm-text">
              <AlertTriangle className="inline h-3.5 w-3.5" aria-hidden /> Delete{' '}
              <strong>{detail.name}</strong> permanently?
            </p>
            <div className="ds-egg-confirm-actions">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteEgg()}>
                {saving ? 'Deleting…' : 'Confirm delete'}
              </Button>
            </div>
            {error && !hasChanges ? <p className="ds-egg-form-error">{error}</p> : null}
          </div>
        )}
      </EggDetailPanel>
    </div>
  );
}
