import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button, Input } from './Layout';

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#6366f1';

  return (
    <div>
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <label className="relative shrink-0 cursor-pointer">
          <span
            className="block h-11 w-11 rounded-xl border-2 border-[var(--border)] shadow-inner ring-2 ring-[var(--surface)]"
            style={{ background: safe }}
          />
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

type AssetMode = 'url' | 'upload';

export function BrandingAssetField({
  label,
  hint,
  kind,
  url,
  onUpload,
  onApplyUrl,
  onRemove,
  disabled,
}: {
  label: string;
  hint?: string;
  kind: 'logo' | 'favicon';
  url: string;
  onUpload: (file: File) => Promise<void>;
  onApplyUrl: (url: string) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AssetMode>('url');
  const [urlDraft, setUrlDraft] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrlDraft(url);
  }, [url]);

  const previewSize = kind === 'logo' ? 'h-14 w-14' : 'h-10 w-10';
  const previewUrl = url || (mode === 'url' ? urlDraft.trim() : '');

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await onUpload(file);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function applyUrl() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await onApplyUrl(urlDraft.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save URL');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await onRemove();
      setUrlDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setMode('url')}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
              mode === 'url'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Link2 className="h-3 w-3" />
            URL
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
              mode === 'upload'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Upload className="h-3 w-3" />
            Upload
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div
          className={`flex ${previewSize} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <ImagePlus className="h-5 w-5 text-[var(--muted)]" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {mode === 'url' ? (
            <>
              <Input
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  setSaved(false);
                }}
                placeholder="https://cdn.example.com/logo.png"
                disabled={disabled || busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => void applyUrl()}
                >
                  {busy ? 'Saving…' : 'Save URL'}
                </Button>
                {url && (
                  <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => void remove()}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Paste a public https:// link — saved to panel settings immediately.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
                  {url ? 'Replace file' : 'Choose file'}
                </Button>
                {url && (
                  <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => void remove()}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={
                  kind === 'logo'
                    ? 'image/png,image/jpeg,image/webp'
                    : 'image/png,image/x-icon,image/webp'
                }
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              <p className="text-[11px] text-[var(--muted)]">
                {kind === 'logo'
                  ? 'PNG, JPG, or WebP · max 512 KB'
                  : 'PNG, ICO, or WebP · max 256 KB'}
              </p>
            </>
          )}
        </div>
      </div>

      {hint && mode === 'upload' && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
      {saved && <p className="mt-1 text-xs text-green-400">Saved.</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Bundled fallback shown when no app icon has been generated. */
const DEFAULT_APP_ICON = '/icons/icon-192.png';

/**
 * The square icon used when the panel is installed as an app.
 *
 * It is generated rather than uploaded directly, because installed-app icons
 * must be square and at least 192px — a wide logo or a 32px favicon cannot be
 * used as-is. Rendering happens in the browser (see `lib/app-icon.ts`).
 */
export function BrandingAppIconField({
  url,
  logoUrl,
  faviconUrl,
  onGenerate,
  onUpload,
  onRemove,
  disabled,
}: {
  url: string;
  logoUrl: string;
  faviconUrl: string;
  onGenerate: (source: 'logo' | 'favicon') => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function run(action: () => Promise<void>, fallbackMessage: string) {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await action();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[var(--muted)]">App icon</span>
        {url ? (
          <span className="text-[11px] font-medium text-green-400">Custom</span>
        ) : (
          <span className="text-[11px] text-[var(--muted)]">Using default</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
          <img src={url || DEFAULT_APP_ICON} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || busy || !logoUrl}
              title={logoUrl ? undefined : 'Upload a logo first'}
              onClick={() => void run(() => onGenerate('logo'), 'Could not build icon from logo')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              From logo
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || busy || !faviconUrl}
              title={faviconUrl ? undefined : 'Upload a favicon first'}
              onClick={() => void run(() => onGenerate('favicon'), 'Could not build icon from favicon')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              From favicon
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload image
            </Button>
            {url && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || busy}
                onClick={() => void run(onRemove, 'Remove failed')}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = '';
              if (file) void run(() => onUpload(file), 'Upload failed');
            }}
          />

          <p className="text-[11px] text-[var(--muted)]">
            Used on home screens and in the installed app window. Any source is centred on the
            accent gradient and saved as a 512×512 PNG, so it stays sharp on desktop shortcuts and
            survives Android's circular icon crop.
          </p>
        </div>
      </div>

      {busy && <p className="mt-1 text-xs text-[var(--muted)]">Working…</p>}
      {saved && <p className="mt-1 text-xs text-green-400">Saved.</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
