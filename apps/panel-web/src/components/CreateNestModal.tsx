import { useState } from 'react';
import { Layers } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Input, Textarea } from './Layout';
import { ModalShell } from './ModalShell';

export function CreateNestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.admin.createNest(form);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nest');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_25%,transparent)] via-transparent to-transparent" />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg">
              <Layers className="h-5 w-5 text-[var(--accent-contrast)]" />
            </div>
            <div>
              <h2 className="text-base font-bold">Create nest</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Group related eggs under a category like Minecraft or Source
              </p>
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <Input
          label="Nest name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="Minecraft"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Eggs for Minecraft and related game servers"
          rows={3}
        />

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create nest'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
