import { useState } from 'react';
import { Database, Globe, Info } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button, Input } from './Layout';

const REMOTE_PRESETS = [
  { value: '%', label: 'Anywhere', hint: 'Allow connections from any IP' },
  { value: 'localhost', label: 'Localhost', hint: 'Only from the game server itself' },
  { value: '127.0.0.1', label: '127.0.0.1', hint: 'Loopback only' },
] as const;

export function CreateDatabaseModal({
  onClose,
  onCreate,
  databaseCount = 0,
  databaseLimit = 0,
  canCreate = true,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; remote: string }) => Promise<void>;
  databaseCount?: number;
  databaseLimit?: number;
  canCreate?: boolean;
}) {
  const [name, setName] = useState('');
  const [remote, setRemote] = useState('%');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const atLimit = databaseCount >= databaseLimit;
  const slotsLeft = Math.max(0, databaseLimit - databaseCount);
  const blocked = atLimit || !canCreate;
  const disabled = databaseLimit === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), remote: remote.trim() || '%' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create database');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="resource-modal-header">
          <span className="resource-modal-icon resource-modal-icon--cyan">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <h2 className="resource-modal-title">Create database</h2>
            <p className="resource-modal-subtitle">
              A MySQL database and user will be provisioned automatically on your node.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="resource-modal-body">
        <div className={`resource-modal-quota ${atLimit ? 'resource-modal-quota--danger' : ''}`}>
          {disabled
            ? 'Databases are disabled on this server (limit 0).'
            : atLimit
              ? `Database limit reached (${databaseLimit}). Delete an existing database first.`
              : `${databaseCount} of ${databaseLimit} databases used · ${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left`}
        </div>

        <Input
          label="Description"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. LuckPerms, plugin storage, website"
          required
          maxLength={64}
          disabled={blocked}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Connections from</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {REMOTE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                disabled={blocked}
                onClick={() => setRemote(preset.value)}
                className={`resource-remote-chip ${remote === preset.value ? 'resource-remote-chip--active' : ''}`}
                title={preset.hint}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Input value={remote} onChange={(e) => setRemote(e.target.value)} placeholder="%" disabled={blocked} />
          <p className="mt-1 flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
            <Globe className="mt-0.5 h-3 w-3 shrink-0" />
            MySQL user host pattern — use % to allow your game server IP, or a specific address.
          </p>
        </div>

        <div className="resource-modal-info">
          <Info className="h-3.5 w-3.5 shrink-0 accent-text" />
          <p>
            Database name, username, and password are generated automatically. Connection details appear after
            creation.
          </p>
        </div>

        {error && <div className="resource-modal-error">{error}</div>}

        <div className="resource-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || blocked || !name.trim()}>
            {loading ? 'Creating…' : 'Create database'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
