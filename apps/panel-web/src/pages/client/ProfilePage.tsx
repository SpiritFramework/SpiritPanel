import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  Lock,
  Mail,
  RotateCcw,
  Save,
  Server,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { api, type ApiKeySummary } from '../../lib/api';
import { ApiKeysPanel } from '../../components/ApiKeysPanel';
import {
  AccountSection,
  AccountShell,
  type AccountTab,
} from '../../components/account/AccountShell';
import { AccountStatus, RoleBadge, displayName } from '../../components/UserCard';
import { Button, ClientLayout, Input } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { SecuritySettings } from '../../components/SecuritySettings';
import { ProfileAvatarField } from '../../components/ProfileAvatarField';
import { UserAvatar } from '../../components/UserAvatar';

type Tab = 'profile' | 'security' | 'keys';

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
    <div className="account-field">
      <label>{label}</label>
      <div className="account-field-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="account-field-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { branding } = useBranding();
  const [loading, setLoading] = useState(!user);
  const [tab, setTab] = useState<Tab>('profile');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [accountKeys, setAccountKeys] = useState<ApiKeySummary[]>([]);
  const [applicationKeys, setApplicationKeys] = useState<ApiKeySummary[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [keysLoading, setKeysLoading] = useState(true);
  const [creatingAccountKey, setCreatingAccountKey] = useState(false);
  const [creatingApplicationKey, setCreatingApplicationKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.rootAdmin;

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const [account, servers] = await Promise.all([api.accountApiKeys(), api.client.servers()]);
      setServerCount(servers.length);
      setAccountKeys(account.filter((key) => key.keyType !== 2));
      if (isAdmin) {
        const application = await api.admin.apiKeys();
        setApplicationKeys(application.filter((key) => key.keyType === 2));
      } else {
        setApplicationKeys([]);
      }
    } catch {
      setAccountKeys([]);
      setApplicationKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshUser()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    loadKeys();
  }, [user, loadKeys]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setEmail(user.email);
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
  }, [user]);

  const hasProfileChanges = useMemo(() => {
    if (!user) return false;
    return (
      username.trim() !== user.username ||
      email.trim() !== user.email ||
      (firstName.trim() || null) !== user.firstName ||
      (lastName.trim() || null) !== user.lastName
    );
  }, [user, username, email, firstName, lastName]);

  const passwordChecks = useMemo(() => {
    const min = branding.minPasswordLength;
    return {
      length: newPassword.length >= min,
      match: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword, branding.minPasswordLength]);

  if (loading || !user) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </ClientLayout>
    );
  }

  const name = displayName(user);
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const totalKeys = accountKeys.length + applicationKeys.length;
  const minPasswordLength = branding.minPasswordLength;
  const profileUser = user;

  const tabs: AccountTab<Tab>[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'keys', label: 'API keys', icon: Key, count: totalKeys },
  ];

  function resetProfileForm() {
    setUsername(profileUser.username);
    setEmail(profileUser.email);
    setFirstName(profileUser.firstName ?? '');
    setLastName(profileUser.lastName ?? '');
    setProfileError('');
    setProfileSaved(false);
  }

  async function copyUuid() {
    await navigator.clipboard.writeText(profileUser.uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      await api.updateProfile({
        username: username.trim(),
        email: email.trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      await refreshUser();
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < minPasswordLength) {
      setPasswordError(`Password must be at least ${minPasswordLength} characters`);
      return;
    }

    setPasswordSaving(true);
    try {
      await api.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <ClientLayout>
      <AccountShell
        avatar={<UserAvatar user={user} size="xl" ring className="account-avatar" />}
        title={name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>@{user.username}</span>
            <span className="text-[var(--border-strong)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {user.email}
            </span>
          </span>
        }
        badges={
          <>
            <RoleBadge role={user.role} rootAdmin={user.rootAdmin} />
            <AccountStatus suspended={false} />
          </>
        }
        stats={[
          { icon: Server, label: 'Servers', value: String(serverCount) },
          { icon: Key, label: 'API keys', value: String(totalKeys) },
          { icon: Calendar, label: 'Joined', value: joined },
        ]}
        adminLink={isAdmin}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
      >
        {tab === 'profile' && (
          <form onSubmit={saveProfile}>
            <div className="account-grid account-grid--split">
              <aside className="account-aside">
                <div className="account-card">
                  <p className="account-card-label">Account ID</p>
                  <div className="account-uuid">
                    <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{user.uuid}</span>
                  </div>
                  <Button
                    type="button"
                    variant="subtle"
                    className="mt-3 w-full"
                    onClick={copyUuid}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy UUID'}
                  </Button>
                </div>

                <div className="account-card">
                  <p className="account-card-label">Quick links</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTab('security')}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-xs transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--surface-hover)]"
                    >
                      <Shield className="h-4 w-4 accent-text" />
                      <span>
                        <span className="block font-medium">Security</span>
                        <span className="text-[10px] text-[var(--muted)]">Password, 2FA & keys</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('keys')}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-xs transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--surface-hover)]"
                    >
                      <Key className="h-4 w-4 accent-text" />
                      <span>
                        <span className="block font-medium">API keys</span>
                        <span className="text-[10px] text-[var(--muted)]">{totalKeys} active</span>
                      </span>
                    </button>
                  </div>
                </div>
              </aside>

              <div className="space-y-4">
                <AccountSection
                  title="Profile photo"
                  description="Your photo appears in the sidebar and across the panel"
                  icon={User}
                >
                  <ProfileAvatarField
                    avatarUrl={user.avatarUrl}
                    username={user.username}
                    onSave={async (url) => {
                      await api.updateProfile({ avatarUrl: url });
                      await refreshUser();
                    }}
                  />
                </AccountSection>

                <AccountSection
                  title="Personal details"
                  description="How your name and contact info appear across the panel"
                  icon={User}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="First name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setProfileSaved(false);
                      }}
                      placeholder="Optional"
                    />
                    <Input
                      label="Last name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setProfileSaved(false);
                      }}
                      placeholder="Optional"
                    />
                    <Input
                      label="Username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setProfileSaved(false);
                      }}
                      required
                      minLength={3}
                      maxLength={32}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setProfileSaved(false);
                      }}
                      required
                    />
                  </div>
                </AccountSection>

                <div className="account-save-strip">
                  <div className="min-w-0">
                    {profileError && (
                      <p className="text-xs text-[var(--danger-fg)]">{profileError}</p>
                    )}
                    {profileSaved && !profileError && (
                      <p className="text-xs text-[var(--success-fg)]">Profile saved successfully</p>
                    )}
                    {!profileError && !profileSaved && hasProfileChanges && (
                      <p className="text-xs text-[var(--muted)]">You have unsaved changes</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetProfileForm}
                      disabled={!hasProfileChanges || profileSaving}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <Button type="submit" disabled={!hasProfileChanges || profileSaving}>
                      {profileSaving ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {profileSaving ? 'Saving…' : 'Save profile'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {tab === 'security' && (
          <div className="space-y-4">
            <AccountSection
              title="Change password"
              description={`Use at least ${minPasswordLength} characters — mix letters, numbers, and symbols`}
              icon={Lock}
            >
              <form onSubmit={savePassword}>
                <div className="account-password-grid">
                  <div className="account-field account-field--full">
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChange={(value) => {
                        setCurrentPassword(value);
                        setPasswordSaved(false);
                      }}
                      autoComplete="current-password"
                    />
                  </div>
                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={(value) => {
                      setNewPassword(value);
                      setPasswordSaved(false);
                    }}
                    autoComplete="new-password"
                    minLength={minPasswordLength}
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      setPasswordSaved(false);
                    }}
                    autoComplete="new-password"
                  />
                </div>

                {(newPassword || confirmPassword) && (
                  <div className="account-checklist">
                    <div className={`account-checklist-item ${passwordChecks.length ? 'account-checklist-item--ok' : ''}`}>
                      {passwordChecks.length ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-[var(--border)]" />}
                      At least {minPasswordLength} characters
                    </div>
                    <div className={`account-checklist-item ${passwordChecks.match ? 'account-checklist-item--ok' : ''}`}>
                      {passwordChecks.match ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-[var(--border)]" />}
                      Passwords match
                    </div>
                  </div>
                )}

                <div className="account-save-strip">
                  <div className="min-w-0">
                    {passwordError && (
                      <p className="text-xs text-[var(--danger-fg)]">{passwordError}</p>
                    )}
                    {passwordSaved && !passwordError && (
                      <p className="text-xs text-[var(--success-fg)]">Password updated</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={passwordSaving || !currentPassword || !newPassword || !passwordChecks.match}
                  >
                    {passwordSaving ? 'Updating…' : passwordSaved ? 'Updated' : 'Update password'}
                  </Button>
                </div>
              </form>
            </AccountSection>

            <SecuritySettings />
          </div>
        )}

        {tab === 'keys' && (
          <div className="space-y-6">
            <ApiKeysPanel
              title="Account API keys"
              description="Authenticate against the client API to manage your servers programmatically."
              apiBase="/api/client"
              keys={accountKeys}
              loading={keysLoading}
              creating={creatingAccountKey}
              onRefresh={loadKeys}
              onCreate={async ({ memo }) => {
                setCreatingAccountKey(true);
                try {
                  return await api.createAccountApiKey(memo);
                } finally {
                  setCreatingAccountKey(false);
                }
              }}
              onDelete={async (id) => {
                await api.deleteAccountApiKey(id);
              }}
            />

            {isAdmin && (
              <ApiKeysPanel
                title="Application API keys"
                description="Admin-only keys for automating panel management via the application API."
                apiBase="/api/application"
                keys={applicationKeys}
                loading={keysLoading}
                creating={creatingApplicationKey}
                onRefresh={loadKeys}
                onCreate={async ({ memo }) => {
                  setCreatingApplicationKey(true);
                  try {
                    return await api.admin.createApiKey(memo);
                  } finally {
                    setCreatingApplicationKey(false);
                  }
                }}
                onDelete={async (id) => {
                  await api.admin.deleteApiKey(id);
                }}
              />
            )}
          </div>
        )}
      </AccountShell>
    </ClientLayout>
  );
}
