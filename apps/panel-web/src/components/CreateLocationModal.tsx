import { useState } from 'react';
import { AlertCircle, Image as ImageIcon, MapPin, Tag } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Input } from './Layout';
import { LocationFlag } from './LocationFlag';
import { ModalShell } from './ModalShell';

export function CreateLocationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ short: '', long: '', flagUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const shortPreview = form.short.trim() || 'code';
  const namePreview = form.long.trim() || 'Display name';
  const canSubmit = Boolean(form.short.trim() && form.long.trim()) && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.admin.createLocation({
        short: form.short.trim(),
        long: form.long.trim(),
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
        <div className="ds-loc-modal-header relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="ds-loc-modal-header-glow" aria-hidden />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="ds-loc-modal-mark" aria-hidden>
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="ds-loc-modal-eyebrow">Locations</p>
              <h2 className="text-base font-bold tracking-tight">Add location</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Create a geographic region to group nodes and filters
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="ds-loc-modal-footer">
          <div className="ds-loc-modal-footer-status min-w-0">
            <span className="ds-loc-modal-footer-hint">Short codes appear on node badges</span>
          </div>
          <div className="ds-loc-modal-footer-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="create-location-form" disabled={!canSubmit}>
              {saving ? 'Creating…' : 'Create location'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="create-location-form" onSubmit={submit} className="ds-loc-modal-body">
        <div className="ds-loc-modal-preview" aria-live="polite">
          <span className="ds-loc-modal-preview-label">Preview</span>
          <div className="ds-loc-modal-preview-chip">
            {form.flagUrl.trim() ? <LocationFlag url={form.flagUrl} size="sm" /> : null}
            <span className="ds-loc-modal-preview-code">{shortPreview}</span>
            <span className="ds-loc-modal-preview-sep" aria-hidden>
              —
            </span>
            <span className="ds-loc-modal-preview-name truncate">{namePreview}</span>
          </div>
        </div>

        <section className="ds-loc-modal-section ds-loc-modal-section--identity">
          <header className="ds-loc-modal-section-head">
            <span className="ds-loc-modal-section-icon" aria-hidden>
              <Tag className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="ds-loc-modal-section-title">Identity</h3>
              <p className="ds-loc-modal-section-desc">Code used in badges and filters; name shown in admin</p>
            </div>
          </header>

          <div className="ds-loc-modal-grid">
            <Input
              label="Short code"
              value={form.short}
              onChange={(e) => setForm({ ...form, short: e.target.value.toLowerCase() })}
              required
              placeholder="us-east"
              maxLength={32}
              hint="Lowercase letters, numbers, and hyphens"
            />
            <Input
              label="Display name"
              value={form.long}
              onChange={(e) => setForm({ ...form, long: e.target.value })}
              required
              placeholder="US East (New York)"
            />
          </div>
        </section>

        <section className="ds-loc-modal-section">
          <header className="ds-loc-modal-section-head">
            <span className="ds-loc-modal-section-icon" aria-hidden>
              <ImageIcon className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="ds-loc-modal-section-title">Flag</h3>
              <p className="ds-loc-modal-section-desc">Optional PNG/SVG shown next to the location label</p>
            </div>
          </header>

          <Input
            label="Flag image URL"
            value={form.flagUrl}
            onChange={(e) => setForm({ ...form, flagUrl: e.target.value })}
            placeholder="https://flagcdn.com/w40/us.png"
            type="url"
          />
          <p className="ds-loc-modal-flag-help">
            Optional — e.g. from{' '}
            <a href="https://flagcdn.com" target="_blank" rel="noreferrer" className="accent-text">
              flagcdn.com
            </a>
          </p>

          {form.flagUrl.trim() ? (
            <div className="ds-loc-modal-flag-preview">
              <LocationFlag url={form.flagUrl} size="md" />
              <div className="min-w-0">
                <p className="ds-loc-modal-flag-preview-title">Flag preview</p>
                <p className="ds-loc-modal-flag-preview-desc truncate">{form.flagUrl.trim()}</p>
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="ds-loc-modal-banner ds-loc-modal-banner--error" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="ds-loc-modal-banner-title">Couldn&apos;t create location</p>
              <p className="ds-loc-modal-banner-desc">{error}</p>
            </div>
          </div>
        ) : null}
      </form>
    </ModalShell>
  );
}
