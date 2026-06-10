import { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Key,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import { AccountSection } from './account/AccountShell';
import { Button, Input } from './Layout';
import { Spinner } from './ui';
import type { ApiKeySummary, CreatedApiKey } from '../lib/api';

function formatKeyTime(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(value: string | null) {
  if (!value) return 'Never used';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatKeyTime(value);
}

function keyTypeLabel(keyType: number) {
  return keyType === 2 ? 'Application' : 'Account';
}

export function ApiKeysPanel({
  title,
  description,
  apiBase,
  keys,
  loading,
  creating,
  onRefresh,
  onCreate,
  onDelete,
  allowApplicationKeys,
}: {
  title: string;
  description: string;
  apiBase: string;
  keys: ApiKeySummary[];
  loading: boolean;
  creating: boolean;
  onRefresh: () => void;
  onCreate: (data: { memo: string; keyType?: 'account' | 'application' }) => Promise<CreatedApiKey>;
  onDelete: (id: string) => Promise<void>;
  allowApplicationKeys?: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');
    try {
      await onDelete(id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <AccountSection title={title} description={description} icon={Key}>
        <div className="account-grid account-grid--split">
          <aside className="account-aside">
            <div className="account-card">
              <p className="account-card-label">Authentication</p>
              <div className="account-code-block">
                <div>
                  <span className="token-key">Authorization</span>:{' '}
                  <span className="token-str">Bearer {'{identifier}.{token}'}</span>
                </div>
                <div className="mt-2">
                  <span className="token-key">Base URL</span>:{' '}
                  <span className="token-str">{apiBase}</span>
                </div>
              </div>
            </div>
            <div className="account-card">
              <p className="account-card-label">Tips</p>
              <ul className="space-y-2 text-xs leading-relaxed text-[var(--muted)]">
                <li className="flex gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-text" />
                  Copy the full key immediately — the secret is only shown once.
                </li>
                <li className="flex gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-text" />
                  Use a descriptive memo so you know which script or service owns each key.
                </li>
                <li className="flex gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-text" />
                  Revoke keys you no longer use from this page.
                </li>
              </ul>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="account-keys-toolbar">
              <p className="text-xs text-[var(--muted)]">
                {loading ? 'Loading keys…' : `${keys.length} active key${keys.length === 1 ? '' : 's'}`}
              </p>
              <Button type="button" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create key
              </Button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-fg)]">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            ) : keys.length === 0 ? (
              <div className="account-keys-empty">
                <span className="account-keys-empty-icon">
                  <Key className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">No API keys yet</p>
                  <p className="mt-0.5 max-w-xs text-xs text-[var(--muted)]">
                    Create a key to authenticate scripts and automation against the panel API.
                  </p>
                </div>
                <Button type="button" variant="subtle" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Create your first key
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {keys.map((key) => (
                  <article key={key.id} className="account-key-card">
                    <div className="account-key-card-head">
                      <div className="min-w-0">
                        <p className="account-key-memo truncate">{key.memo || 'Untitled key'}</p>
                        <p className="account-key-id truncate">{key.identifier}</p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === key.id}
                        onClick={() => handleDelete(key.id)}
                        className="shrink-0 rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] disabled:opacity-50"
                        aria-label="Revoke key"
                      >
                        {deletingId === key.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="account-key-meta">
                      <span className="account-key-meta-item">{keyTypeLabel(key.keyType)}</span>
                      <span className="account-key-meta-item">
                        <Clock className="h-3 w-3" />
                        {formatRelative(key.lastUsedAt)}
                      </span>
                      <span className="account-key-meta-item hidden sm:inline-flex">
                        Created {formatKeyTime(key.createdAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </AccountSection>

      {showCreate && (
        <CreateApiKeyModal
          creating={creating}
          allowApplicationKeys={allowApplicationKeys}
          onClose={() => {
            setShowCreate(false);
            setCreatedKey(null);
          }}
          onCreate={async (data) => {
            const key = await onCreate(data);
            setCreatedKey(key);
            onRefresh();
            return key;
          }}
          createdKey={createdKey}
        />
      )}
    </>
  );
}

function CreateApiKeyModal({
  creating,
  allowApplicationKeys,
  onClose,
  onCreate,
  createdKey,
}: {
  creating: boolean;
  allowApplicationKeys?: boolean;
  onClose: () => void;
  onCreate: (data: { memo: string; keyType?: 'account' | 'application' }) => Promise<CreatedApiKey>;
  createdKey: CreatedApiKey | null;
}) {
  const [memo, setMemo] = useState('');
  const [keyType, setKeyType] = useState<'account' | 'application'>('account');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fullKey = createdKey ? `${createdKey.identifier}.${createdKey.token}` : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onCreate({ memo: memo.trim(), keyType: allowApplicationKeys ? keyType : 'account' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  }

  async function copyKey() {
    if (!fullKey) return;
    await navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="border-b border-[var(--border)] px-5 py-4 pr-12">
          <h2 className="text-base font-semibold">{createdKey ? 'API key created' : 'Create API key'}</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {createdKey
              ? 'Copy this key now — the secret will not be shown again.'
              : 'Add a description so you can identify this key later.'}
          </p>
        </div>
      }
    >
      <div className="p-5">
        {createdKey ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-xs" style={{ color: 'var(--warning-fg)' }}>
              Store this key securely. You won&apos;t be able to view the secret again.
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Your API key</p>
              <div className="account-code-block flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all">{fullKey}</code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="shrink-0 rounded-md p-1.5 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                  aria-label="Copy API key"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="button" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Description"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. My automation script"
              maxLength={255}
            />

            {allowApplicationKeys && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text)]">Key type</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setKeyType('account')}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                      keyType === 'account'
                        ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)]'
                        : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
                    }`}
                  >
                    <p className="font-semibold">Account</p>
                    <p className="mt-0.5 text-[var(--muted)]">Access /api/client endpoints</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyType('application')}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                      keyType === 'application'
                        ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)]'
                        : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
                    }`}
                  >
                    <p className="font-semibold">Application</p>
                    <p className="mt-0.5 text-[var(--muted)]">Access /api/application endpoints</p>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-fg)]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create key'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
