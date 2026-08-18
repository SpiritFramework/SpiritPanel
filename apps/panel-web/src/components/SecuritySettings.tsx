import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  Github,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Terminal,
  Trash2,
} from 'lucide-react';
import { api, type SshKeySummary, type TwoFactorStatus } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { AccountSection, AccountStatusBadge } from './account/AccountShell';
import { Button, Input, Textarea } from './Layout';
import { Spinner } from './ui';

export function SecuritySettings({ passwordPanel }: { passwordPanel?: ReactNode }) {
  const [twoFa, setTwoFa] = useState<TwoFactorStatus | null>(null);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [sshCount, setSshCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [status, github, ssh] = await Promise.all([
        api.twoFactorStatus(),
        api.githubPatStatus(),
        api.sshKeys(),
      ]);
      setTwoFa(status);
      setGithubConfigured(github.configured);
      setSshCount(ssh.length);
    } catch {
      /* surfaced on individual panels */
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const items = [
    {
      id: 'password',
      label: 'Password',
      value: 'Set',
      ok: true,
      icon: KeyRound,
    },
    {
      id: '2fa',
      label: 'Two-factor',
      value: overviewLoading ? '…' : twoFa?.enabled ? 'Enabled' : 'Off',
      ok: Boolean(twoFa?.enabled),
      icon: ShieldCheck,
    },
    {
      id: 'github',
      label: 'GitHub',
      value: overviewLoading ? '…' : githubConfigured ? 'Linked' : 'Not linked',
      ok: githubConfigured,
      icon: Github,
    },
    {
      id: 'ssh',
      label: 'SSH keys',
      value: overviewLoading ? '…' : sshCount === 0 ? 'None' : `${sshCount}`,
      ok: sshCount > 0,
      icon: Terminal,
    },
  ] as const;

  return (
    <div className="account-security">
      <div className="account-security-grid" aria-label="Security status">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`account-security-tile ${item.ok ? 'account-security-tile--ok' : ''}`}
            >
              <span className="account-security-tile-icon" aria-hidden>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="account-security-tile-label">{item.label}</span>
              <span className="account-security-tile-value">{item.value}</span>
            </div>
          );
        })}
      </div>

      <div className="account-security-columns">
        {passwordPanel}
        <TwoFactorPanel onChanged={loadOverview} />
      </div>

      <div className="account-security-integrations">
        <GithubPatPanel onChanged={loadOverview} />
        <SshKeysPanel onChanged={loadOverview} />
      </div>
    </div>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    success('Recovery codes copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--warning-fg)' }}>
        Save your recovery codes
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Each code works once if you lose your authenticator. Store them somewhere safe — they won&apos;t be shown again.
      </p>
      <div className="account-recovery-grid mt-3">
        {codes.map((code) => (
          <span key={code} className="account-recovery-code">
            {code}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="subtle" onClick={copyAll}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button onClick={onDone}>I&apos;ve saved them</Button>
      </div>
    </div>
  );
}

function TwoFactorPanel({ onChanged }: { onChanged: () => void }) {
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await api.twoFactorStatus());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function beginSetup() {
    setBusy(true);
    try {
      setSetup(await api.twoFactorSetup());
      setCode('');
    } catch (err) {
      toastError('Could not start setup', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    try {
      const res = await api.twoFactorEnable(code.trim());
      setRecoveryCodes(res.recoveryCodes);
      setSetup(null);
      setCode('');
      success('Two-factor authentication enabled');
      await load();
      onChanged();
    } catch (err) {
      toastError('Verification failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    try {
      await api.twoFactorDisable(password);
      setPassword('');
      setDisabling(false);
      success('Two-factor authentication disabled');
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not disable', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRegenerate() {
    setBusy(true);
    try {
      const res = await api.regenerateRecoveryCodes(password);
      setRecoveryCodes(res.recoveryCodes);
      setPassword('');
      setRegenerating(false);
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not regenerate codes', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const enabled = status?.enabled ?? false;

  return (
    <AccountSection
      title="Two-factor authentication"
      description="Require a one-time code from your authenticator app when signing in"
      icon={ShieldCheck}
      tone={enabled ? 'success' : 'default'}
      badge={<AccountStatusBadge active={enabled} activeLabel="Enabled" inactiveLabel="Disabled" />}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </div>
      ) : recoveryCodes ? (
        <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      ) : enabled ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Your account is protected with TOTP. You have{' '}
            <strong className="text-[var(--text)]">{status?.recoveryRemaining ?? 0}</strong> recovery codes remaining.
          </p>

          {regenerating || disabling ? (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <p className="text-xs text-[var(--muted)]">
                {disabling
                  ? 'Enter your password to turn off two-factor authentication.'
                  : 'Enter your password to generate a fresh set of recovery codes.'}
              </p>
              <Input
                label="Account password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={disabling ? confirmDisable : confirmRegenerate}
                  disabled={busy || !password}
                  variant={disabling ? 'danger' : 'primary'}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : disabling ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  {disabling ? 'Disable 2FA' : 'Generate codes'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDisabling(false);
                    setRegenerating(false);
                    setPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" onClick={() => setRegenerating(true)}>
                <KeyRound className="h-3.5 w-3.5" />
                Regenerate recovery codes
              </Button>
              <Button variant="danger" onClick={() => setDisabling(true)}>
                <ShieldOff className="h-3.5 w-3.5" />
                Disable
              </Button>
            </div>
          )}
        </div>
      ) : setup ? (
        <div className="space-y-4">
          <div className="account-2fa-setup">
            <div className="account-qr-frame">
              <img src={setup.qr} alt="2FA QR code" className="h-36 w-36" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-[var(--muted)]">
                Scan with Google Authenticator, 1Password, Authy, or any TOTP app. Or enter this key manually:
              </p>
              <code className="block break-all rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs">
                {setup.secret}
              </code>
            </div>
          </div>
          <div className="max-w-xs">
            <Input
              label="6-digit verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmEnable} disabled={busy || code.trim().length < 6}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Verify & enable
            </Button>
            <Button variant="ghost" onClick={() => setSetup(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--muted)]">
            Add an extra layer of protection — you&apos;ll enter a code from your phone each time you sign in.
          </p>
          <Button onClick={beginSetup} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
            Set up two-factor
          </Button>
        </div>
      )}
    </AccountSection>
  );
}

function GithubPatPanel({ onChanged }: { onChanged: () => void }) {
  const { success, error: toastError } = useToast();
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.githubPatStatus();
      setConfigured(status.configured);
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function savePat() {
    setBusy(true);
    try {
      const result = await api.saveGithubPat(token.trim());
      setConfigured(true);
      setToken('');
      setEditing(false);
      success(`GitHub linked as @${result.login}`);
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not save token', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function removePat() {
    if (!confirm('Remove your GitHub token? Marketplace will use the panel default (if any).')) return;
    setBusy(true);
    try {
      await api.removeGithubPat();
      setConfigured(false);
      setEditing(false);
      success('GitHub token removed');
      onChanged();
    } catch (err) {
      toastError('Could not remove token', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountSection
      title="GitHub token"
      description="Use your own API rate limit for marketplace search and installs (5000 req/hr)"
      icon={Github}
      tone={configured ? 'success' : 'default'}
      badge={<AccountStatusBadge active={configured} activeLabel="Linked" inactiveLabel="Not linked" />}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Create a{' '}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer"
              className="accent-text hover:underline"
            >
              fine-grained personal access token
            </a>{' '}
            or classic PAT with <strong className="text-[var(--text)]">public repository read</strong> access.
            Your token is encrypted and never shown again after saving.
          </p>

          {configured && !editing ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--success-border,#22c55e)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success-bg,#14532d)_40%,transparent)] px-4 py-3">
              <Check className="h-4 w-4 text-[var(--success-fg)]" />
              <span className="flex-1 text-sm text-[var(--success-fg)]">
                GitHub token saved — marketplace uses your rate limit
              </span>
              <div className="flex gap-2">
                <Button variant="subtle" onClick={() => setEditing(true)} disabled={busy}>
                  Replace
                </Button>
                <Button variant="ghost" onClick={removePat} disabled={busy}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <Input
                label="Personal access token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_… or github_pat_…"
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={savePat} disabled={busy || !token.trim()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
                  Save token
                </Button>
                {editing && (
                  <Button variant="ghost" onClick={() => { setEditing(false); setToken(''); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AccountSection>
  );
}

function SshKeysPanel({ onChanged }: { onChanged: () => void }) {
  const { success, error: toastError } = useToast();
  const [keys, setKeys] = useState<SshKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await api.sshKeys());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addKey() {
    setBusy(true);
    try {
      await api.addSshKey(name.trim(), publicKey.trim());
      setName('');
      setPublicKey('');
      setAdding(false);
      success('SSH key added');
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not add key', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function removeKey(key: SshKeySummary) {
    if (!confirm(`Remove SSH key "${key.name}"?`)) return;
    try {
      await api.deleteSshKey(key.id);
      success('SSH key removed');
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not remove key', err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <AccountSection
      title="SSH keys"
      description="Authenticate to SFTP with a public key instead of your password"
      icon={Terminal}
      badge={
        keys.length > 0 ? (
          <span className="account-status-badge account-status-badge--on">
            <span className="account-status-dot" />
            {keys.length} key{keys.length === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <div className="space-y-3">
          {keys.length === 0 && !adding ? (
            <div className="account-keys-empty">
              <span className="account-keys-empty-icon">
                <Terminal className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">No SSH keys yet</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Add a public key to connect via SFTP without your panel password.
                </p>
              </div>
              <Button variant="subtle" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add SSH key
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {keys.map((key) => (
                  <li key={key.id} className="account-ssh-item">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-elevated))] text-[var(--accent)]">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{key.name}</p>
                      <p className="truncate font-mono text-[11px] text-[var(--muted)]">{key.fingerprint}</p>
                    </div>
                    <span className="hidden text-[11px] text-[var(--muted)] sm:block">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKey(key)}
                      className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)]"
                      aria-label="Remove key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {adding ? (
                <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <Input
                    label="Key name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Work laptop"
                    maxLength={64}
                  />
                  <Textarea
                    label="Public key"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    rows={3}
                    placeholder="ssh-ed25519 AAAA... user@host"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={addKey} disabled={busy || !name.trim() || !publicKey.trim()}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Add key
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAdding(false);
                        setName('');
                        setPublicKey('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="subtle" onClick={() => setAdding(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add SSH key
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </AccountSection>
  );
}
