import { useEffect, useRef, useState } from 'react';
import { Egg, FileJson, Upload, X } from 'lucide-react';
import { api, type AdminNestSummary } from '../lib/api';
import { Button, Select } from './Layout';
import { ModalShell } from './ModalShell';

export function ImportEggModal({
  onClose,
  onImported,
  defaultNestId,
}: {
  onClose: () => void;
  onImported: () => void;
  defaultNestId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nests, setNests] = useState<AdminNestSummary[]>([]);
  const [nestId, setNestId] = useState(defaultNestId ?? '');
  const [json, setJson] = useState('');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.nests().then(setNests).catch(() => setNests([]));
  }, []);

  useEffect(() => {
    if (defaultNestId) setNestId(defaultNestId);
  }, [defaultNestId]);

  function clearFile() {
    setFileName('');
    setJson('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    setError('');

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please choose a .json egg export file');
      return;
    }

    try {
      const text = await file.text();
      JSON.parse(text);
      setJson(text);
      setFileName(file.name);
    } catch {
      setError('That file is not valid JSON');
      clearFile();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!json.trim()) {
      setError('Choose a JSON file from your PC or paste egg JSON below');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const parsed = JSON.parse(json);
      await api.admin.importEgg(nestId, parsed);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import egg');
    } finally {
      setSaving(false);
    }
  }

  const hasContent = json.trim().length > 0;

  return (
    <ModalShell
      onClose={onClose}
      wide
      header={
        <div className="relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/25 via-transparent to-transparent" />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 shadow-lg">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Import egg</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Upload a PTDL_v2 JSON file from your PC, or paste an export from Pterodactyl or Spirit-Panel
              </p>
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <Select
          label="Target nest"
          value={nestId}
          onChange={(e) => setNestId(e.target.value)}
          required
        >
          <option value="">Select nest</option>
          {nests.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </Select>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Egg file</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
            {fileName ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                    <FileJson className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-[11px] text-[var(--muted)]">Ready to import</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]">
                  <FileJson className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Upload from your computer</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    PTDL_v2 egg exports — typically named like <code className="font-mono">egg-*.json</code>
                  </p>
                </div>
                <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
            Or paste JSON
          </label>
          <textarea
            className="h-40 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-xs shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            placeholder='{"meta": {"version": "PTDL_v2"}, ...}'
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              if (fileName) {
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
        </div>

        <p className="text-[11px] text-[var(--muted)]">
          Importing creates a new egg with variables, docker images, and startup configuration from the file.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !nestId || !hasContent}>
            <Egg className="h-3.5 w-3.5" />
            {saving ? 'Importing…' : 'Import egg'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
