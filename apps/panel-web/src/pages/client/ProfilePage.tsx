import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Image as ImageIcon, RotateCcw, Save, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin, isStaffOrPanelAdmin } from '../../lib/roles';
import { api, type ApiKeySummary } from '../../lib/api';
import { ApiKeysPanel } from '../../components/ApiKeysPanel';
import { displayName, RoleBadge } from '../../components/UserCard';
import { Button, ClientLayout, Input, Page } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { SecuritySettings } from '../../components/SecuritySettings';
import { ProfileAvatarUrlField } from '../../components/ProfileAvatarField';
import { UserAvatar } from '../../components/UserAvatar';
import { NodeOverviewSection } from '../../components/admin/node-detail/NodeDetailShell';
import {
  ProfileHeader,
  isProfileTab,
  type ProfileTab,
} from '../../components/profile/ProfileHeader';
import { ProfileSidebar } from '../../components/profile/ProfileSidebar';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = isProfileTab(tabParam) ? tabParam : 'profile';

  function setTab(next: ProfileTab) {
    setSearchParams({ tab: next }, { replace: true });
  }

  const [loading, setLoading] = useState(!user);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [accountKeys, setAccountKeys] = useState<ApiKeySummary[]>([]);
  const [applicationKeys, setApplicationKeys] = useState<ApiKeySummary[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [keysLoading, setKeysLoading] = useState(true);
  const [creatingAccountKey, setCreatingAccountKey] = useState(false);
  const [creatingApplicationKey, setCreatingApplicationKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState('');

  const isStaffAdmin = isStaffOrPanelAdmin(user);
  const isFullAdmin = isFullPanelAdmin(user);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const [account, servers] = await Promise.all([api.accountApiKeys(), api.client.servers()]);
      setServerCount(servers.length);
      setAccountKeys(account.filter((key) => key.keyType !== 2));
      if (isFullAdmin) {
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
  }, [isFullAdmin]);

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
    setAvatarDraft(user.avatarUrl ?? '');
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

  if (loading || !user) {
    return (
      <ClientLayout>
        <Page className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </Page>
      </ClientLayout>
    );
  }

  const name = displayName(user);
  const joinedShort = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const joinedLong = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const totalKeys = accountKeys.length + applicationKeys.length;

  function resetProfileForm() {
    setUsername(user!.username);
    setEmail(user!.email);
    setFirstName(user!.firstName ?? '');
    setLastName(user!.lastName ?? '');
    setProfileError('');
    setProfileSaved(false);
  }

  async function copyUuid() {
    await navigator.clipboard.writeText(user!.uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveProfile(e?: React.FormEvent) {
    e?.preventDefault();
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

  return (
    <ClientLayout>
      <Page className="ds-prof-page">
        <ProfileHeader
          avatar={<UserAvatar user={user} size="lg" ring className="ds-prof-header-avatar" />}
          title={name}
          username={user.username}
          email={user.email}
          badges={<RoleBadge role={user.role} rootAdmin={user.rootAdmin} />}
          activeTab={tab}
          onTabChange={setTab}
          serverCount={serverCount}
          keyCount={totalKeys}
          joined={joinedShort}
          suspended={user.suspended ?? false}
          adminLink={isStaffAdmin}
        />

        {tab === 'profile' && (
          <>
            <div className="ds-prof-workspace">
              <div className="ds-prof-main">
                <form id="profile-details-form" onSubmit={saveProfile} className="ds-prof-stack">
                  <NodeOverviewSection
                    icon={User}
                    title="Personal details"
                    description="Name and contact information for your account"
                  >
                    <div className="ds-prof-field-grid">
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
                  </NodeOverviewSection>

                  <NodeOverviewSection
                    icon={ImageIcon}
                    title="Profile photo"
                    description="Shown in the sidebar and across the panel"
                  >
                    <ProfileAvatarUrlField
                      avatarUrl={user.avatarUrl}
                      draft={avatarDraft}
                      onDraftChange={setAvatarDraft}
                      onSave={async (url) => {
                        await api.updateProfile({ avatarUrl: url });
                        await refreshUser();
                      }}
                    />
                  </NodeOverviewSection>
                </form>
              </div>

              <ProfileSidebar
                avatarUrl={avatarDraft.trim() || user.avatarUrl}
                username={user.username}
                uuid={user.uuid}
                joined={joinedLong}
                role={user.role}
                rootAdmin={user.rootAdmin}
                suspended={user.suspended ?? false}
                copied={copied}
                onCopyUuid={copyUuid}
              />
            </div>

            <div
              className={`ds-nd-st-savebar${hasProfileChanges ? ' ds-nd-st-savebar--dirty' : profileSaved ? ' ds-nd-st-savebar--saved' : ''}`}
              role="status"
            >
              <div className="ds-nd-st-savebar-status">
                {profileError ? (
                  <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{profileError}</span>
                ) : profileSaved ? (
                  <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Profile saved</span>
                ) : hasProfileChanges ? (
                  <span className="ds-nd-st-savebar-msg">
                    <span className="ds-nd-st-savebar-dot" aria-hidden />
                    Unsaved changes
                  </span>
                ) : (
                  <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">No changes to save</span>
                )}
              </div>
              <div className="ds-nd-st-savebar-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetProfileForm}
                  disabled={!hasProfileChanges || profileSaving}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  disabled={!hasProfileChanges || profileSaving}
                  onClick={() => void saveProfile()}
                >
                  {profileSaving ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </div>
          </>
        )}

        {tab === 'security' && <SecuritySettings />}

        {tab === 'keys' && (
          <div className="ds-prof-stack">
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

            {isFullAdmin ? (
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
            ) : null}
          </div>
        )}
      </Page>
    </ClientLayout>
  );
}
