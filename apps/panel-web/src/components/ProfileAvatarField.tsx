import { useEffect, useState } from 'react';
import { ImageIcon, Link2, Trash2 } from 'lucide-react';
import { Button, Input } from './Layout';
import { sanitizeImageSrc } from '../lib/safe-url';

export function ProfileAvatarField({
  avatarUrl,
  username,
  onSave,
  disabled,
}: {
  avatarUrl?: string | null;
  username: string;
  onSave: (url: string | null) => Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(avatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(avatarUrl ?? '');
  }, [avatarUrl]);

  const previewUrl = draft.trim();
  const hasChanges = previewUrl !== (avatarUrl ?? '');
  const initial = username.charAt(0).toUpperCase();

  async function apply(next: string | null) {
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo URL');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && !/^https?:\/\/.+/i.test(trimmed)) {
      setError('Enter a valid http or https image URL');
      return;
    }
    await apply(trimmed || null);
  }

  async function handleClear() {
    setDraft('');
    await apply(null);
  }

  const safePreview = sanitizeImageSrc(previewUrl);

  return (
    <div className="profile-avatar-upload">
      <div className="profile-avatar-preview-wrap">
        {safePreview ? (
          <img
            src={safePreview}
            alt=""
            className="profile-avatar-preview"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="profile-avatar-preview profile-avatar-preview--initial">{initial}</span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="text-sm font-semibold">Profile photo URL</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Paste a direct link to your avatar image. It is saved to your account and shown across the panel.
          </p>
        </div>

        <Input
          label="Image URL"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
            setError('');
          }}
          placeholder="https://example.com/avatar.png"
          disabled={disabled || busy}
          autoComplete="off"
        />

        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="subtle" disabled={busy || !hasChanges} onClick={handleSave}>
              <Link2 className="h-3.5 w-3.5" />
              {busy ? 'Saving…' : 'Save photo URL'}
            </Button>
            {(avatarUrl || draft.trim()) && (
              <Button type="button" variant="ghost" disabled={busy} onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-xs text-[var(--danger-fg)]">{error}</p>}
        {saved && !error && <p className="text-xs text-[var(--success-fg)]">Profile photo updated</p>}

        <p className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
          <ImageIcon className="h-3 w-3 shrink-0" />
          Use a public HTTPS URL (Gravatar, Discord CDN, Imgur, etc.)
        </p>
      </div>
    </div>
  );
}
