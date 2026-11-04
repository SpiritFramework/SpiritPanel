import { AlertTriangle, Layers, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '../../Layout';
import { NestDetailPanel } from './NestDetailShell';
import type { NestDetailController } from '../../../pages/admin/nest-detail/useNestDetail';

export function NestManageDashboard({
  ctrl,
  fullAdmin,
}: {
  ctrl: NestDetailController;
  fullAdmin: boolean;
}) {
  const { detail, form, setForm, saving, confirmDelete, setConfirmDelete, deleteNest, hasChanges, error } =
    ctrl;

  if (!detail) return null;

  const canDelete = detail.serverCount === 0;

  if (!fullAdmin) {
    return (
      <div className="ds-nst-manage">
        <NestDetailPanel
          tone="identity"
          icon={Layers}
          eyebrow="Profile"
          title="Nest details"
          description="Read-only view"
        >
          <dl className="ds-nst-readonly-grid ds-ud-readonly-grid">
            <div>
              <dt>Name</dt>
              <dd>{detail.name}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{detail.author}</dd>
            </div>
            <div className="ds-nst-readonly-wide">
              <dt>Description</dt>
              <dd>{detail.description || '—'}</dd>
            </div>
          </dl>
        </NestDetailPanel>
      </div>
    );
  }

  return (
    <div className="ds-nst-manage">
      <NestDetailPanel
        tone="identity"
        icon={Layers}
        eyebrow="Profile"
        title="Nest details"
        description="Name, description, and author contact"
      >
        <div className="ds-nd-st-fields">
          <Input
            label="Name"
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Author"
            value={form.author ?? ''}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            hint="Usually an email or project name"
          />
          <div className="ds-nd-st-fields-span">
            <Textarea
              label="Description"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Optional summary shown in the nest catalog"
            />
          </div>
        </div>
      </NestDetailPanel>

      <NestDetailPanel
        tone="danger"
        icon={Trash2}
        eyebrow="Danger zone"
        title="Delete nest"
        description="Permanently remove this nest and all its eggs"
      >
        {!confirmDelete ? (
          <div className="ds-nst-danger-row ds-ud-danger-row">
            <p className="ds-nst-danger-desc ds-ud-danger-desc">
              {canDelete
                ? 'Deleting a nest removes all eggs inside it. This cannot be undone.'
                : 'Remove all servers using eggs in this nest before deleting.'}
            </p>
            <Button type="button" variant="danger" disabled={!canDelete} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete nest
            </Button>
          </div>
        ) : (
          <div className="ds-nst-confirm-box ds-nst-confirm-box--danger">
            <p className="ds-nst-confirm-text">
              <AlertTriangle className="inline h-3.5 w-3.5" aria-hidden /> Delete{' '}
              <strong>{detail.name}</strong> and all {detail.eggCount} egg
              {detail.eggCount === 1 ? '' : 's'}?
            </p>
            <div className="ds-nst-confirm-actions">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteNest()}>
                {saving ? 'Deleting…' : 'Confirm delete'}
              </Button>
            </div>
            {error && !hasChanges ? <p className="ds-nst-form-error">{error}</p> : null}
          </div>
        )}
      </NestDetailPanel>
    </div>
  );
}
