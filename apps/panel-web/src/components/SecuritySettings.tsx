import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Terminal,
  Trash2,
} from 'lucide-react';
import { api, type SshKeySummary, type TwoFactorStatus } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useBranding } from '../context/BrandingContext';
import { DiscordIcon } from './icons/DiscordIcon';
import { NodeOverviewSection } from './admin/node-detail/NodeDetailShell';
import { Button, Input, Textarea } from './Layout';
import { ConfirmModal } from './ConfirmModal';
import { Spinner } from './ui';
import {
  ProfileSecuritySidebar,
  type SecurityOverviewItem,
} from './profile/ProfileSecuritySidebar';

function SecurityBadge({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <span className={`ds-sec-badge${active ? ' ds-sec-badge--on' : ''}`}>
      <span className="ds-sec-badge-dot" aria-hidden />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="ds-prof-field">
      <label className="ds-prof-field-label">{label}</label>
      <div className="ds-prof-field-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          className="ds-prof-field-input"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="ds-prof-field-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordPanel({ minPasswordLength, onChanged }: { minPasswordLength: number; onChanged?: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const checks = useMemo(
    () => ({
      length: newPassword.length >= minPasswordLength,
      match: newPassword.length > 0 && newPassword === confirmPassword,
    }),
    [newPassword, confirmPassword, minPasswordLength],
  );

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters`);
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <NodeOverviewSection
      icon={Lock}
      title="Password"
      description={`At least ${minPasswordLength} characters — use a unique passphrase`}
      badge={<SecurityBadge active activeLabel="Set" inactiveLabel="Unset" />}
    >
      <form onSubmit={savePassword}>
        <div className="ds-prof-password-grid">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(value) => {
              setCurrentPassword(value);
              setSaved(false);
            }}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value);
              setSaved(false);
            }}
            autoComplete="new-password"
            minLength={minPasswordLength}
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setSaved(false);
            }}
            autoComplete="new-password"
          />
        </div>

        {(newPassword || confirmPassword) && (
          <div className="ds-prof-checklist">
            <div className={`ds-prof-checklist-item${checks.length ? ' ds-prof-checklist-item--ok' : ''}`}>
              {checks.length ? <Check className="h-3.5 w-3.5" /> : <span className="ds-prof-checklist-dot" aria-hidden />}
              At least {minPasswordLength} characters
            </div>
            <div className={`ds-prof-checklist-item${checks.match ? ' ds-prof-checklist-item--ok' : ''}`}>
              {checks.match ? <Check className="h-3.5 w-3.5" /> : <span className="ds-prof-checklist-dot" aria-hidden />}
              Passwords match
            </div>
          </div>
        )}

        <div className="ds-prof-inline-save">
          <div className="min-w-0">
            {error ? <p className="text-xs text-[var(--danger-fg)]">{error}</p> : null}
            {saved && !error ? <p className="text-xs text-[var(--success-fg)]">Password updated</p> : null}
          </div>
          <Button type="submit" disabled={saving || !currentPassword || !newPassword || !checks.match}>
            {saving ? 'Updating…' : saved ? 'Updated' : 'Update password'}
          </Button>
        </div>
      </form>
    </NodeOverviewSection>
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
    <div className="ds-sec-recovery">
      <p className="ds-sec-recovery-title">Save your recovery codes</p>
      <p className="ds-sec-recovery-desc">
        Each code works once if you lose your authenticator. Store them somewhere safe — they won&apos;t be shown again.
      </p>
      <div className="ds-sec-recovery-grid">
        {codes.map((code) => (
          <span key={code} className="ds-sec-recovery-code">
            {code}
          </span>
        ))}
      </div>
      <div className="ds-sec-recovery-actions">
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
    <NodeOverviewSection
      icon={ShieldCheck}
      title="Two-factor authentication"
      description="Require a one-time code from your authenticator app when signing in"
      badge={<SecurityBadge active={enabled} activeLabel="Enabled" inactiveLabel="Disabled" />}
    >
      {loading ? (
        <div className="ds-sec-loading">
          <Spinner className="h-5 w-5" />
        </div>
      ) : recoveryCodes ? (
        <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      ) : enabled ? (
        <div className="ds-sec-stack">
          <p className="ds-sec-copy">
            Your account is protected with TOTP. You have{' '}
            <strong>{status?.recoveryRemaining ?? 0}</strong> recovery codes remaining.
          </p>

          {regenerating || disabling ? (
            <div className="ds-sec-panel">
              <p className="ds-sec-panel-lead">
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
              <div className="ds-sec-actions">
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
            <div className="ds-sec-actions">
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
        <div className="ds-sec-stack">
          <div className="ds-sec-2fa-setup">
            <div className="ds-sec-qr-frame">
              <img src={setup.qr} alt="2FA QR code" className="h-36 w-36" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="ds-sec-copy">
                Scan with Google Authenticator, 1Password, Authy, or any TOTP app. Or enter this key manually:
              </p>
              <code className="ds-sec-secret">{setup.secret}</code>
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
          <div className="ds-sec-actions">
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
        <div className="ds-sec-stack">
          <p className="ds-sec-copy">
            Add an extra layer of protection — you&apos;ll enter a code from your phone each time you sign in.
          </p>
          <Button onClick={beginSetup} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
            Set up two-factor
          </Button>
        </div>
      )}
    </NodeOverviewSection>
  );
}

function GithubPatPanel({ onChanged }: { onChanged: () => void }) {
  const { success, error: toastError } = useToast();
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

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
    setBusy(true);
    try {
      await api.removeGithubPat();
      setConfigured(false);
      setEditing(false);
      setConfirmRemove(false);
      success('GitHub token removed');
      onChanged();
    } catch (err) {
      toastError('Could not remove token', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <NodeOverviewSection
      icon={Github}
      title="GitHub token"
      description="Use your own API rate limit for marketplace search and installs (5000 req/hr)"
      badge={<SecurityBadge active={configured} activeLabel="Linked" inactiveLabel="Not linked" />}
    >
      {loading ? (
        <div className="ds-sec-loading">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <div className="ds-sec-stack">
          <p className="ds-sec-copy-sm">
            Create a{' '}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer"
              className="accent-text hover:underline"
            >
              fine-grained personal access token
            </a>{' '}
            or classic PAT with <strong>public repository read</strong> access. Your token is encrypted and never
            shown again after saving.
          </p>

          {configured && !editing ? (
            <div className="ds-sec-success-banner">
              <Check className="h-4 w-4 shrink-0" />
              <span className="flex-1">GitHub token saved — marketplace uses your rate limit</span>
              <div className="ds-sec-actions ds-sec-actions--inline">
                <Button variant="subtle" onClick={() => setEditing(true)} disabled={busy}>
                  Replace
                </Button>
                <Button variant="ghost" onClick={() => setConfirmRemove(true)} disabled={busy}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="ds-sec-panel">
              <Input
                label="Personal access token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_… or github_pat_…"
                autoComplete="off"
              />
              <div className="ds-sec-actions">
                <Button onClick={savePat} disabled={busy || !token.trim()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
                  Save token
                </Button>
                {editing && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setToken('');
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmRemove}
        title="Remove GitHub token?"
        description="Marketplace will use the panel default token (if any) after this token is removed."
        confirmLabel="Remove token"
        tone="danger"
        loading={busy}
        onClose={() => {
          if (!busy) setConfirmRemove(false);
        }}
        onConfirm={() => void removePat()}
      />
    </NodeOverviewSection>
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
  const [pendingRemove, setPendingRemove] = useState<SshKeySummary | null>(null);
  const [removing, setRemoving] = useState(false);

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

  async function removeKey() {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await api.deleteSshKey(pendingRemove.id);
      setPendingRemove(null);
      success('SSH key removed');
      await load();
      onChanged();
    } catch (err) {
      toastError('Could not remove key', err instanceof Error ? err.message : undefined);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <NodeOverviewSection
      icon={Terminal}
      title="SSH keys"
      description="Authenticate to SFTP with a public key instead of your password"
      badge={
        keys.length > 0 ? (
          <span className="ds-sec-badge ds-sec-badge--on">
            <span className="ds-sec-badge-dot" aria-hidden />
            {keys.length} key{keys.length === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="ds-sec-loading">
          <Spinner className="h-5 w-5" />
        </div>
      ) : keys.length === 0 && !adding ? (
        <div className="ds-sec-empty">
          <span className="ds-sec-empty-icon" aria-hidden>
            <Terminal className="h-5 w-5" />
          </span>
          <div>
            <p className="ds-sec-empty-title">No SSH keys yet</p>
            <p className="ds-sec-empty-desc">Add a public key to connect via SFTP without your panel password.</p>
          </div>
          <Button variant="subtle" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add SSH key
          </Button>
        </div>
      ) : (
        <div className="ds-sec-stack">
          {keys.length > 0 && (
            <ul className="ds-sec-ssh-list">
              {keys.map((key) => (
                <li key={key.id} className="ds-sec-ssh-item">
                  <span className="ds-sec-ssh-icon" aria-hidden>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="ds-sec-ssh-name">{key.name}</p>
                    <p className="ds-sec-ssh-fp">{key.fingerprint}</p>
                  </div>
                  <span className="ds-sec-ssh-date">{new Date(key.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setPendingRemove(key)}
                    className="ds-sec-ssh-remove"
                    aria-label={`Remove ${key.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {adding ? (
            <div className="ds-sec-panel">
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
              <div className="ds-sec-actions">
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
            keys.length > 0 && (
              <Button variant="subtle" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add SSH key
              </Button>
            )
          )}
        </div>
      )}
      <ConfirmModal
        open={pendingRemove !== null}
        title="Remove SSH key?"
        description={`Remove SSH key "${pendingRemove?.name ?? ''}"? You will no longer be able to use it for SFTP.`}
        confirmLabel="Remove key"
        tone="danger"
        loading={removing}
        onClose={() => {
          if (!removing) setPendingRemove(null);
        }}
        onConfirm={() => void removeKey()}
      />
    </NodeOverviewSection>
  );
}

function DiscordPanel({ onChanged }: { onChanged: () => void }) {
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.discordStatus();
      setEnabled(status.enabled);
      setLinked(status.linked);
      setUsername(status.username);
      setTwoFactorEnabled(status.twoFactorEnabled);
    } catch {
      setEnabled(false);
      setLinked(false);
      setUsername(null);
      setTwoFactorEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const linkedFlag = searchParams.get('discord');
    const discordError = searchParams.get('discord_error');
    if (linkedFlag === 'linked') {
      success('Discord account linked. You can use it to sign in next time.');
      searchParams.delete('discord');
      setSearchParams(searchParams, { replace: true });
      void load();
      onChanged();
    }
    if (discordError) {
      const messages: Record<string, string> = {
        denied: 'Discord authorization was cancelled.',
        failed: 'Could not complete Discord linking. Please try again.',
        taken: 'That Discord account is already linked to another user.',
        disabled: 'Discord login is not enabled on this panel.',
        reauth: 'Confirm your password again before linking Discord.',
      };
      toastError('Discord link failed', messages[discordError] ?? 'Could not link Discord.');
      searchParams.delete('discord_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [load, onChanged, searchParams, setSearchParams, success, toastError]);

  function openConfirm() {
    setConfirmError('');
    setPassword('');
    setCode('');
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (busy) return;
    setConfirmOpen(false);
    setConfirmError('');
    setPassword('');
    setCode('');
  }

  async function confirmAndStartLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setConfirmError('');
    try {
      const { linkToken } = await api.prepareDiscordLink(password, code.trim() || undefined);
      window.location.href = `/api/auth/discord/start?intent=link&linkToken=${encodeURIComponent(linkToken)}`;
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Could not verify your account');
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await api.unlinkDiscord();
      setLinked(false);
      setUsername(null);
      setConfirmUnlink(false);
      success('Discord unlinked');
      onChanged();
    } catch (err) {
      toastError('Could not unlink Discord', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <NodeOverviewSection
      icon={DiscordIcon}
      title="Discord"
      description="Link Discord to sign in without your password next time"
      badge={<SecurityBadge active={linked} activeLabel="Linked" inactiveLabel="Not linked" />}
    >
      {loading ? (
        <div className="ds-sec-loading">
          <Spinner className="h-5 w-5" />
        </div>
      ) : !enabled ? (
        <p className="ds-sec-copy-sm">
          Discord login is not enabled on this panel. An administrator can turn it on in Settings → Security.
        </p>
      ) : confirmOpen ? (
        <form className="ds-sec-stack" onSubmit={(e) => void confirmAndStartLink(e)}>
          <p className="ds-sec-copy-sm">
            {linked
              ? 'Confirm your password to change the linked Discord account.'
              : 'Confirm your password to link Discord to this account.'}
            {twoFactorEnabled ? ' Enter your authenticator code as well.' : ''}
          </p>
          <PasswordField
            label="Current password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          {twoFactorEnabled ? (
            <div className="ds-prof-field">
              <label className="ds-prof-field-label">Authentication code</label>
              <div className="ds-prof-field-wrap">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="ds-prof-field-input"
                  required
                />
              </div>
            </div>
          ) : null}
          {confirmError ? <p className="text-sm text-[var(--danger-fg,#f87171)]">{confirmError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy || !password.trim()}>
              {busy ? 'Verifying…' : linked ? 'Continue to Discord' : 'Continue to Discord'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={closeConfirm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : linked ? (
        <div className="ds-sec-stack">
          <p className="ds-sec-copy-sm">
            Linked as <strong>@{username?.replace(/^@/, '')}</strong>. You can sign in with Discord or your password.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled={busy} onClick={openConfirm}>
              Change Discord
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmUnlink(true)}>
              {busy ? 'Unlinking…' : 'Unlink Discord'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="ds-sec-stack">
          <p className="ds-sec-copy-sm">
            Connect your Discord account, then use Continue with Discord on the login page. You will need your password
            {twoFactorEnabled ? ' and 2FA code' : ''} to link.
          </p>
          <Button type="button" variant="primary" disabled={busy} onClick={openConfirm}>
            Link Discord
          </Button>
        </div>
      )}

      <ConfirmModal
        open={confirmUnlink}
        title="Unlink Discord?"
        description="You can still sign in with your password after Discord is unlinked."
        confirmLabel="Unlink Discord"
        tone="warning"
        loading={busy}
        onClose={() => {
          if (!busy) setConfirmUnlink(false);
        }}
        onConfirm={() => void unlink()}
      />
    </NodeOverviewSection>
  );
}

export function SecuritySettings() {
  const { branding } = useBranding();
  const [twoFa, setTwoFa] = useState<TwoFactorStatus | null>(null);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [sshCount, setSshCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [status, github, discord, ssh] = await Promise.all([
        api.twoFactorStatus(),
        api.githubPatStatus(),
        api.discordStatus(),
        api.sshKeys(),
      ]);
      setTwoFa(status);
      setGithubConfigured(github.configured);
      setDiscordLinked(discord.linked);
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

  const items: SecurityOverviewItem[] = [
    { id: 'password', label: 'Password', value: 'Set', ok: true, icon: KeyRound },
    {
      id: '2fa',
      label: 'Two-factor',
      value: twoFa?.enabled ? 'Enabled' : 'Off',
      ok: Boolean(twoFa?.enabled),
      icon: ShieldCheck,
    },
    {
      id: 'github',
      label: 'GitHub',
      value: githubConfigured ? 'Linked' : 'Not linked',
      ok: githubConfigured,
      icon: Github,
    },
    {
      id: 'discord',
      label: 'Discord',
      value: discordLinked ? 'Linked' : 'Not linked',
      ok: discordLinked,
      icon: DiscordIcon,
    },
    {
      id: 'ssh',
      label: 'SSH keys',
      value: sshCount === 0 ? 'None' : `${sshCount}`,
      ok: sshCount > 0,
      icon: Terminal,
    },
  ];

  return (
    <div className="ds-prof-workspace">
      <div className="ds-prof-main">
        <section className="ds-sec-overview" aria-label="Security overview">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`ds-sec-overview-tile${item.ok ? ' ds-sec-overview-tile--ok' : ''}${overviewLoading ? ' ds-sec-overview-tile--loading' : ''}`}
              >
                <span className="ds-sec-overview-icon" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-sec-overview-copy">
                  <span className="ds-sec-overview-label">{item.label}</span>
                  <span className="ds-sec-overview-value">{overviewLoading ? '…' : item.value}</span>
                </span>
              </div>
            );
          })}
        </section>

        <div className="ds-sec-grid">
          <div className="ds-sec-col">
            <PasswordPanel minPasswordLength={branding.minPasswordLength} />
            <DiscordPanel onChanged={loadOverview} />
            <GithubPatPanel onChanged={loadOverview} />
          </div>
          <div className="ds-sec-col">
            <TwoFactorPanel onChanged={loadOverview} />
            <SshKeysPanel onChanged={loadOverview} />
          </div>
        </div>
      </div>

      <ProfileSecuritySidebar items={items} loading={overviewLoading} />
    </div>
  );
}
