import { useState } from 'react';
import { Database, Lock, Server } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button, Input } from './Layout';

const REMOTE_OPTIONS = [
  {
    value: '%',
    short: 'Anywhere',
    icon: Server,
  },
  {
    value: 'localhost',
    short: 'Localhost',
    icon: Lock,
  },
  {
    value: '127.0.0.1',
    short: '127.0.0.1',
    icon: Lock,
  },
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

  function pickRemote(value: string) {
    setRemote(value);
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="create-db-modal-header">
          <span className="create-db-modal-header__icon">
            <Database className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="create-db-modal-header__title">Create database</h2>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="create-db-modal-minimal">
        <div className="create-db-modal-section">
          <p className="create-db-modal-section__label">Database name</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LuckPerms permissions storage"
            required
            maxLength={64}
            disabled={blocked}
          />
        </div>

        <div className="create-db-modal-section">
          <p className="create-db-modal-section__label">Who can connect?</p>
          <div className="create-db-remote-grid-minimal">
            {REMOTE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = remote === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={blocked}
                  onClick={() => pickRemote(option.value)}
                  className={`create-db-remote-card-minimal ${active ? 'create-db-remote-card-minimal--active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.short}</span>
                </button>
              );
            })}
          </div>
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
