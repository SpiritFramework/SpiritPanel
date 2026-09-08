import { useEffect, useState } from 'react';
import type { FivemCatalogEntryInput } from '../../../../lib/api';
import { AdminFormStatus } from '../../../AdminDetailLayout';
import { Checkbox } from '../../../Checkbox';
import { Button } from '../../../Layout';
import { Modal } from '../../../ui';

export const EMPTY_FIVEM_CATALOG_FORM: FivemCatalogEntryInput = {
  slug: '',
  name: '',
  description: '',
  category: 'script',
  tags: [],
  githubOwner: '',
  githubRepo: '',
  githubRef: 'latest-release',
  installPath: '/resources/[local]/{slug}',
  cfgResource: '',
  cfgAction: 'ensure',
  cfgFile: '/server.cfg',
  dependencies: [],
  featured: false,
  enabled: true,
  sortOrder: 100,
};

export function FivemCatalogEditor({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: FivemCatalogEntryInput;
  onClose: () => void;
  onSave: (data: FivemCatalogEntryInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  function set<K extends keyof FivemCatalogEntryInput>(key: K, value: FivemCatalogEntryInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <form
        className="ds-stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          void onSave({
            ...form,
            tags: form.tags?.filter(Boolean) ?? [],
            dependencies: form.dependencies?.filter(Boolean) ?? [],
            cfgResource: form.cfgResource || form.slug.replace(/-/g, '_'),
          })
            .then(onClose)
            .catch((err) => setError(err instanceof Error ? err.message : 'Save failed'))
            .finally(() => setSaving(false));
        }}
      >
        {error ? <AdminFormStatus error={error} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ds-field">
            <span className="ds-eyebrow">Slug</span>
            <input
              className="ds-input"
              value={form.slug}
              required
              pattern="[a-z0-9-]+"
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
          </label>
          <label className="ds-field">
            <span className="ds-eyebrow">Display name</span>
            <input className="ds-input" value={form.name} required onChange={(e) => set('name', e.target.value)} />
          </label>
        </div>
        <label className="ds-field">
          <span className="ds-eyebrow">Description</span>
          <textarea
            className="ds-input min-h-[88px]"
            value={form.description}
            required
            onChange={(e) => set('description', e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ds-field">
            <span className="ds-eyebrow">GitHub owner</span>
            <input
              className="ds-input"
              value={form.githubOwner}
              required
              onChange={(e) => set('githubOwner', e.target.value)}
            />
          </label>
          <label className="ds-field">
            <span className="ds-eyebrow">GitHub repo</span>
            <input
              className="ds-input"
              value={form.githubRepo}
              required
              onChange={(e) => set('githubRepo', e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ds-field">
            <span className="ds-eyebrow">Install path</span>
            <input
              className="ds-input font-mono text-xs"
              value={form.installPath}
              required
              onChange={(e) => set('installPath', e.target.value)}
            />
          </label>
          <label className="ds-field">
            <span className="ds-eyebrow">server.cfg resource</span>
            <input
              className="ds-input font-mono text-xs"
              value={form.cfgResource}
              placeholder={form.slug}
              onChange={(e) => set('cfgResource', e.target.value)}
            />
          </label>
        </div>
        <label className="ds-field">
          <span className="ds-eyebrow">Dependencies (slug, comma-separated)</span>
          <input
            className="ds-input font-mono text-xs"
            value={(form.dependencies ?? []).join(', ')}
            onChange={(e) =>
              set(
                'dependencies',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Featured in catalog" checked={form.featured ?? false} onChange={(v) => set('featured', v)} />
          <Checkbox label="Enabled" checked={form.enabled ?? true} onChange={(v) => set('enabled', v)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save resource'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
