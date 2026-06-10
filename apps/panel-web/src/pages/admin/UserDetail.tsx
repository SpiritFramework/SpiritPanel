import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Ban,
  Calendar,
  Key,
  Lock,
  Mail,
  Server,
  Shield,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { api, type AdminUserDetail, type ApiKeySummary, type UpdateAdminUserInput } from '../../lib/api';
import { ApiKeysPanel } from '../../components/ApiKeysPanel';
import { formatActivityTime, type ActivityEntry } from '../../lib/activity';
import { useAuth } from '../../context/AuthContext';
import {
  AdminActivityTimeline,
  AdminCopyButton,
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailLoading,
  AdminDetailManageLayout,
  AdminDetailNotFound,
  AdminDetailPage,
  AdminDetailTabs,
  AdminFormStatus,
  AdminMetaRow,
  AdminQuickLink,
  AdminRelatedTable,
  AdminResourcePill,
  AdminSaveBar,
  AdminSection,
  AdminSettingsPanel,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button, Input } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import { RoleOption } from '../../components/RoleOption';
import { AccountStatus, getUserTheme, RoleBadge } from '../../components/UserCard';
import { UserAvatar } from '../../components/UserAvatar';
import { EmptyState } from '../../components/ui';
import { AdminServerStatusBadge } from '../../components/admin/AdminServerStatus';

type Tab = 'account' | 'servers' | 'activity' | 'keys';

export function AdminUserDetail() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSelf = userId === currentUser?.id;

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('account');
  const [form, setForm] = useState<UpdateAdminUserInput>({});
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);
  const [userKeys, setUserKeys] = useState<ApiKeySummary[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!userId) return;
    setKeysLoading(true);
    try {
      setUserKeys(await api.admin.userApiKeys(userId));
    } catch (err) {
      console.error(err);
    } finally {
      setKeysLoading(false);
    }
  }, [userId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const u = await api.admin.user(userId);
      setDetail(u);
      setForm({
        email: u.email,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role as 'admin' | 'user',
        suspended: u.suspended,
      });
      setNewPassword('');
    } catch {
      setDetail(null);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  useEffect(() => {
    if (tab === 'keys') loadKeys();
  }, [tab, loadKeys]);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    if (newPassword.trim()) return true;
    return (
      form.email !== detail.email ||
      form.username !== detail.username ||
      (form.firstName ?? null) !== detail.firstName ||
      (form.lastName ?? null) !== detail.lastName ||
      form.role !== detail.role ||
      (form.suspended ?? false) !== detail.suspended
    );
  }, [detail, form, newPassword]);

  function resetForm() {
    if (!detail) return;
    setForm({
      email: detail.email,
      username: detail.username,
      firstName: detail.firstName,
      lastName: detail.lastName,
      role: detail.role as 'admin' | 'user',
      suspended: detail.suspended,
    });
    setNewPassword('');
    setError('');
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload: UpdateAdminUserInput = { ...form };
      if (newPassword.trim()) payload.password = newPassword;
      await api.admin.updateUser(userId, payload);
      setNewPassword('');
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteUser(userId);
      navigate('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'id' | 'uuid') {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) {
    return (
      <AdminLayout>
        <AdminDetailLoading />
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <AdminDetailNotFound message={error || 'User not found'} backTo="/admin/users" backLabel="Back to users" />
      </AdminLayout>
    );
  }

  const displayName = [detail.firstName, detail.lastName].filter(Boolean).join(' ') || detail.username;
  const theme = getUserTheme(detail);
  const joined = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const joinedShort = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'account', label: 'Manage' },
    { id: 'servers', label: 'Servers', count: detail.serverCount + detail.subuserCount },
    { id: 'keys', label: 'API keys', count: detail.apiKeyCount },
    { id: 'activity', label: 'Activity', count: detail.recentActivity.length },
  ];

  const targetIsAdmin = detail.role === 'admin' || detail.rootAdmin;

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Users', to: '/admin/users' }, { label: `@${detail.username}` }]}>
        <AdminDetailHero
          gradient={theme.gradient}
          iconContent={<UserAvatar user={detail} size="lg" ring className="admin-hero-avatar" />}
          title={displayName}
          subtitle={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span>@{detail.username}</span>
              <span className="hidden text-white/30 sm:inline">·</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{detail.email}</span>
              </span>
            </div>
          }
          badges={
            <>
              {isSelf && (
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/80">
                  You
                </span>
              )}
              <RoleBadge role={detail.role} rootAdmin={detail.rootAdmin} onDark />
              <AccountStatus suspended={detail.suspended} onDark />
            </>
          }
          stats={[
            { icon: Server, label: 'Servers', value: String(detail.serverCount) },
            { icon: Users, label: 'Subuser', value: String(detail.subuserCount) },
            { icon: Key, label: 'API keys', value: String(detail.apiKeyCount) },
            { icon: Calendar, label: 'Joined', value: joinedShort },
          ]}
        />

        <AdminDetailTabs tabs={tabs} active={tab} onChange={setTab} />

        <AdminDetailBody>
          {tab === 'account' && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <AdminDetailManageLayout
                sidebar={
                  <>
                    <AdminSidebarCard title="Account">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={detail} size="md" ring />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{displayName}</p>
                          <p className="truncate text-xs text-[var(--muted)]">@{detail.username}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <RoleBadge role={detail.role} rootAdmin={detail.rootAdmin} />
                        <AccountStatus suspended={detail.suspended} />
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{detail.email}</span>
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        Joined {joined}
                      </p>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Resources">
                      <div className="grid grid-cols-3 gap-2">
                        <AdminResourcePill icon={Server} label="Servers" value={detail.serverCount} />
                        <AdminResourcePill icon={Users} label="Shared" value={detail.subuserCount} />
                        <AdminResourcePill icon={Key} label="Keys" value={detail.apiKeyCount} />
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Identifiers">
                      <dl className="space-y-3">
                        <AdminMetaRow
                          label="Panel ID"
                          value={detail.id}
                          mono
                          copy={() => copyText(detail.id, 'id')}
                          copied={copied === 'id'}
                        />
                        <AdminMetaRow
                          label="UUID"
                          value={detail.uuid}
                          mono
                          truncate
                          copy={() => copyText(detail.uuid, 'uuid')}
                          copied={copied === 'uuid'}
                        />
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <AdminCopyButton label={copied === 'id' ? 'Copied' : 'Copy ID'} active={copied === 'id'} onClick={() => copyText(detail.id, 'id')} />
                        <AdminCopyButton label={copied === 'uuid' ? 'Copied' : 'Copy UUID'} active={copied === 'uuid'} onClick={() => copyText(detail.uuid, 'uuid')} />
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Go to">
                      <AdminQuickLink
                        icon={Server}
                        label="Servers"
                        hint={`${detail.serverCount} owned${detail.subuserCount > 0 ? ` · ${detail.subuserCount} shared` : ''}`}
                        onClick={() => setTab('servers')}
                      />
                      <AdminQuickLink
                        icon={Key}
                        label="API keys"
                        hint={`${detail.apiKeyCount} key${detail.apiKeyCount === 1 ? '' : 's'}`}
                        onClick={() => setTab('keys')}
                      />
                      <AdminQuickLink
                        icon={Activity}
                        label="Activity"
                        hint={`${detail.recentActivity.length} recent event${detail.recentActivity.length === 1 ? '' : 's'}`}
                        onClick={() => setTab('activity')}
                      />
                    </AdminSidebarCard>
                  </>
                }
              >
                <AdminSettingsPanel title="Personal details" description="Name, username, and email used across the panel" icon={User}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="First name"
                      value={form.firstName ?? ''}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value || null })}
                      placeholder="Optional"
                    />
                    <Input
                      label="Last name"
                      value={form.lastName ?? ''}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value || null })}
                      placeholder="Optional"
                    />
                    <Input
                      label="Username"
                      value={form.username ?? ''}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={form.email ?? ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </AdminSettingsPanel>

                <div className="grid gap-4 md:grid-cols-2">
                  <AdminSettingsPanel title="Password" description="Leave blank to keep the current password" icon={Lock}>
                    <Input
                      label="New password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                  </AdminSettingsPanel>

                  <AdminSettingsPanel title="Permissions" description="What this user can access in the panel" icon={Shield}>
                    <div className="grid gap-2">
                      <RoleOption
                        active={(form.role ?? 'user') === 'user'}
                        icon={User}
                        title="User"
                        description="Own servers and profile only"
                        onClick={() => setForm({ ...form, role: 'user' })}
                        disabled={isSelf}
                      />
                      <RoleOption
                        active={(form.role ?? 'user') === 'admin'}
                        icon={Shield}
                        title="Admin"
                        description="Full admin panel access"
                        onClick={() => setForm({ ...form, role: 'admin' })}
                        disabled={isSelf}
                      />
                    </div>
                    {isSelf && (
                      <p className="mt-2 text-[11px] text-[var(--muted)]">You cannot change your own role.</p>
                    )}
                  </AdminSettingsPanel>
                </div>

                <AdminSettingsPanel
                  title="Account status"
                  description="Control whether this user can sign in"
                  icon={Ban}
                  className={form.suspended ? 'border-yellow-500/25 bg-yellow-500/[0.03]' : ''}
                >
                  <Checkbox
                    label="Suspend account"
                    description="Suspended users cannot log in and will see a suspension message when they try"
                    checked={form.suspended ?? false}
                    onChange={(suspended) => setForm({ ...form, suspended })}
                    disabled={isSelf}
                  />
                  {isSelf && (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">You cannot suspend your own account.</p>
                  )}
                  {(form.suspended ?? false) && !isSelf && (
                    <p className="mt-2 text-[11px] text-yellow-400/90">
                      This user will be blocked from logging in until unsuspended.
                    </p>
                  )}
                </AdminSettingsPanel>

                {!isSelf && (
                  <AdminSettingsPanel title="Danger zone" description="Permanently remove this account — this cannot be undone" icon={Trash2} tone="danger">
                    {!confirmDelete ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-relaxed text-[var(--muted)]">
                          {detail.serverCount > 0
                            ? `Delete ${detail.serverCount} owned server(s) before removing this user.`
                            : (
                              <>
                                Delete <strong className="text-[var(--text)]">@{detail.username}</strong> and revoke all access immediately.
                              </>
                            )}
                        </p>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={detail.serverCount > 0}
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete user
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                        <p className="text-xs text-red-300">
                          Permanently delete <strong>{detail.username}</strong>?
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="danger" disabled={saving} onClick={deleteUser}>Yes, delete permanently</Button>
                          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        </div>
                        {error && !hasChanges && (
                          <div className="mt-3">
                            <AdminFormStatus error={error} />
                          </div>
                        )}
                      </div>
                    )}
                  </AdminSettingsPanel>
                )}
              </AdminDetailManageLayout>

              <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
            </form>
          )}

          {tab === 'servers' && (
            <div className="space-y-6">
              <AdminSection title={`Owned servers (${detail.servers.length})`} icon={Server}>
                {detail.servers.length === 0 ? (
                  <EmptyState title="No servers" description="This user does not own any servers yet." />
                ) : (
                  <AdminRelatedTable
                    columns={['Server', 'Egg', 'Node', 'Connection', 'Status']}
                    rows={detail.servers.map((s) => ({
                      key: s.id,
                      href: `/admin/servers/${s.id}`,
                      cells: [
                        <div className="min-w-[140px]">
                          <p className="truncate text-sm font-medium group-hover:accent-text">{s.name}</p>
                        </div>,
                        <p className="min-w-[100px] truncate text-[11px] text-[var(--muted)]">{s.egg}</p>,
                        <p className="min-w-[80px] truncate text-[11px] text-[var(--muted)]">{s.node}</p>,
                        <p className="min-w-[120px] truncate font-mono text-[11px] text-[var(--muted)]">{s.address}</p>,
                        <AdminServerStatusBadge
                          status={s.status}
                          suspended={s.suspended}
                          installStatus={s.installStatus}
                          containerState={s.containerState}
                          compact
                        />,
                      ],
                    }))}
                  />
                )}
              </AdminSection>

              {detail.subuserAccess.length > 0 && (
                <AdminSection title={`Shared access (${detail.subuserAccess.length})`} icon={Users}>
                  <AdminRelatedTable
                    columns={['Server', 'Owner']}
                    rows={detail.subuserAccess.map((su) => ({
                      key: su.id,
                      href: `/admin/servers/${su.serverId}`,
                      cells: [
                        <div className="min-w-[140px]">
                          <p className="truncate text-sm font-medium group-hover:accent-text">{su.serverName}</p>
                        </div>,
                        <p className="min-w-[100px] truncate text-[11px] text-[var(--muted)]">{su.owner}</p>,
                      ],
                    }))}
                  />
                </AdminSection>
              )}
            </div>
          )}

          {tab === 'keys' && (
            <ApiKeysPanel
              title={`API keys for @${detail.username}`}
              description={
                targetIsAdmin
                  ? 'Manage account and application API keys for this admin user.'
                  : 'Manage account API keys for this user.'
              }
              apiBase={targetIsAdmin ? '/api/client or /api/application' : '/api/client'}
              keys={userKeys}
              loading={keysLoading}
              creating={creatingKey}
              onRefresh={async () => {
                await loadKeys();
                await load();
              }}
              allowApplicationKeys={targetIsAdmin}
              onCreate={async ({ memo, keyType }) => {
                setCreatingKey(true);
                try {
                  return await api.admin.createUserApiKey(userId, { memo, keyType });
                } finally {
                  setCreatingKey(false);
                }
              }}
              onDelete={async (keyId) => {
                await api.admin.deleteUserApiKey(userId, keyId);
              }}
            />
          )}

          {tab === 'activity' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
              <AdminSection title="Recent activity" icon={Activity}>
                {detail.recentActivity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Actions from this user will appear here." />
                ) : (
                  <AdminActivityTimeline
                    entries={detail.recentActivity as ActivityEntry[]}
                    renderMeta={(entry) => (
                      <>
                        {entry.server?.name && `${entry.server.name} · `}
                        {formatActivityTime(entry.timestamp)}
                      </>
                    )}
                  />
                )}
              </AdminSection>

              <AdminSidebarCard title="Summary">
                <dl className="space-y-3">
                  <AdminMetaRow label="Total events" value={String(detail.recentActivity.length)} />
                  <AdminMetaRow label="Member since" value={joined} />
                  <AdminMetaRow
                    label="Panel ID"
                    value={detail.id}
                    mono
                    copy={() => copyText(detail.id, 'id')}
                    copied={copied === 'id'}
                  />
                </dl>
              </AdminSidebarCard>
            </div>
          )}
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
