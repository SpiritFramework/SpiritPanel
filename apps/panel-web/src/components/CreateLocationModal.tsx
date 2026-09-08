import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Input } from './Layout';
import { LocationFlag } from './LocationFlag';
import { ModalShell } from './ModalShell';

export function CreateLocationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ short: '', long: '', flagUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.admin.createLocation({
        short: form.short,
        long: form.long,
        flagUrl: form.flagUrl.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/25 via-transparent to-transparent" />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add location</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Create a geographic region to group nodes
              </p>
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <Input
          label="Short code"
          value={form.short}
          onChange={(e) => setForm({ ...form, short: e.target.value.toLowerCase() })}
          required
          placeholder="us-east"
          maxLength={32}
        />
        <Input
          label="Display name"
          value={form.long}
          onChange={(e) => setForm({ ...form, long: e.target.value })}
          required
          placeholder="US East (New York)"
        />
        <div className="space-y-2">
          <Input
            label="Flag image URL"
            value={form.flagUrl}
            onChange={(e) => setForm({ ...form, flagUrl: e.target.value })}
            placeholder="https://flagcdn.com/w40/us.png"
            type="url"
          />
          {form.flagUrl.trim() ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
              <LocationFlag url={form.flagUrl} size="md" />
              <span className="text-[11px] text-[var(--muted)]">Preview</span>
            </div>
          ) : null}
          <p className="text-[11px] text-[var(--muted)]">
            Optional — link to a PNG/SVG flag (e.g. from{' '}
            <a href="https://flagcdn.com" target="_blank" rel="noreferrer" className="accent-text">
              flagcdn.com
            </a>
            ).
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          Short codes are used in node badges and filters. Use lowercase with hyphens.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create location'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
