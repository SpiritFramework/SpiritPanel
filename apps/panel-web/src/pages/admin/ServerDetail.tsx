import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  FolderOpen,
  HardDrive,
  History,
  MapPin,
  Network,
  Play,
  RefreshCw,
  Server,
  Settings,
  Settings2,
  Square,
  Terminal,
  Store,
  Package,
  Trash2,
  User,
  Users,
  Zap,
} from 'lucide-react';
import {
  api,
  type AdminServerDetail,
  type AdminUserSummary,
  type UpdateAdminServerInput,
} from '../../lib/api';
import { UserAvatar } from '../../components/UserAvatar';
import { formatAllocationAddress } from '../../lib/allocation';
import { formatActivityTime } from '../../lib/activity';
import { isServerInstalling } from '../../lib/server-runtime';
import { formatCpuLimit, formatResource, getServerTheme } from '../../lib/server-theme';
import { ServerEggIcon } from '../../components/ServerEggIcon';
import {
  AdminActivityTimeline,
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailLoading,
  AdminDetailManageLayout,
  AdminDetailNotFound,
  AdminDetailPage,
  AdminDetailTabs,
  AdminFormStatus,
  AdminInfoRow,
  AdminMetaRow,
  AdminSaveBar,
  AdminSection,
  AdminSettingsPanel,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { AdminLayout, Button, Input, Select, Textarea } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/ui';
import { AdminServerStatusBadge } from '../../components/admin/AdminServerStatus';
import { AdminServerNetwork } from '../../components/admin/AdminServerNetwork';
import { formatRuntimeStateLabel } from '../../lib/server-runtime';
import { useAuth } from '../../context/AuthContext';
import { isFullPanelAdmin } from '../../lib/roles';

type Tab = 'manage' | 'network' | 'activity';

export function AdminServerDetail() {
  const { serverId = '' } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const fullAdmin = isFullPanelAdmin(currentUser);

  const [detail, setDetail] = useState<AdminServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('manage');
  const [form, setForm] = useState<UpdateAdminServerInput>({});
  const [saving, setSaving] = useState(false);
  const [powering, setPowering] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [wipeFiles, setWipeFiles] = useState(true);
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError('');
    try {
      const s = await api.admin.server(serverId);
      setDetail(s);
      if (!silent) {
        setForm({
          ownerId: s.owner.id,
          name: s.name,
          description: s.description ?? '',
          memory: s.memory,
          swap: s.swap,
          disk: s.disk,
          io: s.io,
          cpu: s.cpu,
          allocationLimit: s.allocationLimit ?? 0,
          backupLimit: s.backupLimit ?? 0,
          databaseLimit: s.databaseLimit ?? 0,
          suspended: s.suspended,
        });
      }
    } catch {
      if (!silent) {
        setDetail(null);
        setError('Failed to load server');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), 15_000);
    return () => window.clearInterval(timer);
  }, [serverId]);

  useEffect(() => {
    let active = true;
    api.admin
      .users()
      .then((rows) => {
        if (active) setUsers(rows);
      })
      .catch(() => {
        if (active) setUsersError('Could not load users. Refresh before transferring ownership.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    if (!fullAdmin) {
      return (form.suspended ?? false) !== detail.suspended;
    }
    return (
      form.ownerId !== detail.owner.id ||
      form.name !== detail.name ||
      (form.description ?? '') !== (detail.description ?? '') ||
      form.memory !== detail.memory ||
      form.swap !== detail.swap ||
      form.disk !== detail.disk ||
      form.io !== detail.io ||
      form.cpu !== detail.cpu ||
      (form.allocationLimit ?? 0) !== (detail.allocationLimit ?? 0) ||
      (form.backupLimit ?? 0) !== (detail.backupLimit ?? 0) ||
      (form.databaseLimit ?? 0) !== (detail.databaseLimit ?? 0) ||
      (form.suspended ?? false) !== detail.suspended
    );
  }, [detail, form, fullAdmin]);

  function resetForm() {
    if (!detail) return;
    setForm({
      ownerId: detail.owner.id,
      name: detail.name,
      description: detail.description ?? '',
      memory: detail.memory,
      swap: detail.swap,
      disk: detail.disk,
      io: detail.io,
      cpu: detail.cpu,
      allocationLimit: detail.allocationLimit ?? 0,
      backupLimit: detail.backupLimit ?? 0,
      databaseLimit: detail.databaseLimit ?? 0,
      suspended: detail.suspended,
    });
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
      const payload = fullAdmin ? form : { suspended: form.suspended };
      await api.admin.updateServer(serverId, payload);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update server');
    } finally {
      setSaving(false);
    }
  }

  async function power(action: string) {
    setPowering(action);
    setError('');
    if (action === 'start' && detail && isServerInstalling(detail)) {
      setError('This server is still installing. Open the console to watch progress, or wait for installation to finish.');
      setPowering(null);
      return;
    }
    try {
      await api.admin.serverPower(serverId, action);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setPowering(null);
    }
  }

  async function clearStuckPower() {
    setPowering('clear');
    setError('');
    try {
      await api.admin.clearServerPowerState(serverId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear stuck power state');
    } finally {
      setPowering(null);
    }
  }

  async function reinstall() {
    setSaving(true);
    setError('');
    try {
      await api.admin.reinstallServer(serverId, wipeFiles);
      setConfirmReinstall(false);
      await load();
      navigate(`/admin/servers/${serverId}/manage/console`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reinstall');
    } finally {
      setSaving(false);
    }
  }

  async function deleteServer() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteServer(serverId);
      navigate('/admin/servers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyAddress() {
    if (!detail) return;
    const addr = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <AdminDetailNotFound message={error || 'Server not found'} backTo="/admin/servers" backLabel="Back to servers" />
      </AdminLayout>
    );
  }

  const theme = getServerTheme(detail.egg.name);
  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });
  const installing = isServerInstalling(detail);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'manage', label: 'Manage' },
    { id: 'network', label: 'Network' },
    { id: 'activity', label: 'Activity', count: detail.recentActivity.length },
  ];

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Servers', to: '/admin/servers' }, { label: detail.name }]}>
        <AdminDetailHero
          gradient={theme.gradient}
          iconContent={
            <ServerEggIcon eggName={detail.egg.name} logoUrl={detail.egg.logoUrl} className="h-5 w-5" />
          }
          title={detail.name}
          subtitle={
            <>
              {detail.egg.nest.name} · {detail.egg.name}
            </>
          }
          meta={<span className="font-mono">{address}</span>}
          badges={
            <AdminServerStatusBadge
              status={detail.status}
              suspended={detail.suspended}
              installStatus={detail.installStatus}
              containerState={detail.containerState}
              compact
              onDark
            />
          }
          actions={
            fullAdmin ? (
            <Link
              to={`/admin/servers/${detail.id}/manage`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/25 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 transition hover:bg-black/35"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Manage server
            </Link>
            ) : undefined
          }
          stats={[
            { icon: HardDrive, label: 'Memory', value: formatResource(detail.memory, 'MiB') },
            { icon: HardDrive, label: 'Disk', value: formatResource(detail.disk, 'MiB') },
            { icon: Cpu, label: 'CPU', value: formatCpuLimit(detail.cpu) },
            { icon: User, label: 'Owner', value: detail.owner.username },
          ]}
        />

        <AdminDetailTabs tabs={tabs} active={tab} onChange={setTab} />

        <AdminDetailBody>
          {tab === 'manage' && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <AdminDetailManageLayout
                sidebar={
                  <>
                    <AdminSidebarCard title="Server">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10"
                          style={{ background: theme.gradient }}
                        >
                          <ServerEggIcon eggName={detail.egg.name} logoUrl={detail.egg.logoUrl} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{detail.name}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{detail.egg.name}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <AdminServerStatusBadge
                          status={detail.status}
                          suspended={detail.suspended}
                          installStatus={detail.installStatus}
                          containerState={detail.containerState}
                          compact
                        />
                      </div>
                      {detail.containerState && (
                        <p className="mt-2 text-[11px] text-[var(--muted)]">
                          Container: {formatRuntimeStateLabel(detail.containerState)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="mt-3 flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                      >
                        <span>
                          <span className="block text-[10px] text-[var(--muted)]">Address</span>
                          <span className="font-mono text-xs">{address}</span>
                        </span>
                        <span className={`text-xs ${copied ? 'text-green-400' : 'text-[var(--muted)]'}`}>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Owner">
                      <Link
                        to={`/admin/users/${detail.owner.id}`}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-[var(--surface-hover)]"
                      >
                        <UserAvatar user={detail.owner} size="sm" ring />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{detail.owner.username}</span>
                          <span className="block truncate text-[10px] text-[var(--muted)]">{detail.owner.email}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                      </Link>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Support tools">
                      <p className="mb-2 text-[11px] leading-snug text-[var(--muted)]">
                        Full client-style access for troubleshooting this owner&apos;s server.
                      </p>
                      <div className="grid gap-1">
                        {[
                          { to: 'console', label: 'Console', icon: Terminal },
                          { to: 'files', label: 'Files', icon: FolderOpen },
                          { to: 'analytics', label: 'Analytics', icon: BarChart3 },
                          { to: 'startup', label: 'Startup', icon: Settings2 },
                          { to: 'settings', label: 'Settings', icon: Settings },
                          { to: 'backups', label: 'Backups', icon: Archive },
                          { to: 'databases', label: 'Databases', icon: Database },
                          { to: 'schedules', label: 'Schedules', icon: CalendarClock },
                          { to: 'network', label: 'Network', icon: Network },
                          { to: 'users', label: 'Subusers', icon: Users },
                          { to: 'activity', label: 'Activity', icon: History },
                          ...(detail.egg.name.toLowerCase().includes('fivem')
                            ? [{ to: 'marketplace', label: 'Marketplace', icon: Store }]
                            : []),
                          ...(/\b(minecraft|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|velocity|bungee)\b/i.test(
                            detail.egg.name,
                          )
                            ? [{ to: 'plugins', label: 'Plugins', icon: Package }]
                            : []),
                        ].map(({ to, label, icon: Icon }) => (
                          <Link
                            key={to}
                            to={`/admin/servers/${detail.id}/manage/${to}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--surface-hover)]"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                            <span className="font-medium">{label}</span>
                            <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted)]/60" />
                          </Link>
                        ))}
                      </div>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Infrastructure">
                      <dl className="space-y-2.5 text-xs">
                        <AdminInfoRow icon={MapPin} label="Node" value={detail.node.name} />
                        <AdminInfoRow icon={Server} label="Nest" value={detail.egg.nest.name} />
                        <AdminInfoRow icon={Server} label="Egg" value={detail.egg.name} />
                        <AdminInfoRow label="Install" value={detail.installStatus} />
                        <AdminInfoRow label="Subusers" value={String(detail.subuserCount)} />
                      </dl>
                    </AdminSidebarCard>

                    <AdminSidebarCard title="Identifiers">
                      <dl className="space-y-3">
                        <AdminMetaRow label="Server ID" value={detail.id} mono copy={() => navigator.clipboard.writeText(detail.id)} />
                        <AdminMetaRow label="UUID" value={detail.uuid} mono truncate copy={() => navigator.clipboard.writeText(detail.uuid)} />
                      </dl>
                    </AdminSidebarCard>
                  </>
                }
              >
                {fullAdmin && (
                <AdminSettingsPanel
                  title="Ownership"
                  description="Transfer this server and all owner permissions to another account"
                  icon={User}
                  className={form.ownerId !== detail.owner.id ? 'border-yellow-500/25 bg-yellow-500/[0.03]' : ''}
                >
                  <Select
                    label="Server owner"
                    value={form.ownerId ?? detail.owner.id}
                    onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                    disabled={usersLoading || Boolean(usersError)}
                    required
                    hint={usersLoading ? 'Loading users…' : usersError || 'The previous owner immediately loses owner access after saving.'}
                  >
                    {!users.some((user) => user.id === detail.owner.id) && (
                      <option value={detail.owner.id}>
                        {detail.owner.username} ({detail.owner.email})
                      </option>
                    )}
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email}){user.suspended ? ' · suspended' : ''}
                      </option>
                    ))}
                  </Select>
                  {form.ownerId !== detail.owner.id && (
                    <p className="mt-2 rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                      Saving will transfer ownership away from <strong>{detail.owner.username}</strong>. The new owner
                      receives full access immediately.
                    </p>
                  )}
                </AdminSettingsPanel>
                )}

                {fullAdmin && (
                <AdminSettingsPanel title="Server details" description="Name and description shown to the owner" icon={Server}>
                  <div className="grid gap-3">
                    <Input
                      label="Server name"
                      value={form.name ?? ''}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <Textarea
                      label="Description"
                      value={form.description ?? ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="Optional notes about this server"
                    />
                  </div>
                </AdminSettingsPanel>
                )}

                {fullAdmin && (
                <AdminSettingsPanel title="Resource limits" description="Memory, disk, and CPU — set to 0 for unlimited. Feature limits below use 0 to disable." icon={HardDrive}>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Memory (MB)"
                      type="number"
                      min={0}
                      value={String(form.memory ?? '')}
                      onChange={(e) => setForm({ ...form, memory: Number(e.target.value) })}
                      hint="0 = unlimited"
                    />
                    <Input
                      label="Disk (MB)"
                      type="number"
                      min={0}
                      value={String(form.disk ?? '')}
                      onChange={(e) => setForm({ ...form, disk: Number(e.target.value) })}
                      hint="0 = unlimited"
                    />
                    <Input
                      label="CPU (%)"
                      type="number"
                      min={0}
                      value={String(form.cpu ?? '')}
                      onChange={(e) => setForm({ ...form, cpu: Number(e.target.value) })}
                      hint="0 = unlimited"
                    />
                    <Input
                      label="Swap (MB)"
                      type="number"
                      min={0}
                      value={String(form.swap ?? '')}
                      onChange={(e) => setForm({ ...form, swap: Number(e.target.value) })}
                      hint="0 = unlimited"
                    />
                    <Input
                      label="Block IO"
                      type="number"
                      min={0}
                      value={String(form.io ?? '')}
                      onChange={(e) => setForm({ ...form, io: Number(e.target.value) })}
                      hint="0 = unlimited"
                    />
                    <Input
                      label="Allocation limit"
                      type="number"
                      min={0}
                      value={String(form.allocationLimit ?? 0)}
                      onChange={(e) => setForm({ ...form, allocationLimit: Number(e.target.value) })}
                      hint="Extra ports (0 = disabled)"
                    />
                    <Input
                      label="Backup limit"
                      type="number"
                      min={0}
                      value={String(form.backupLimit ?? 0)}
                      onChange={(e) => setForm({ ...form, backupLimit: Number(e.target.value) })}
                      hint="Max backups (0 = disabled)"
                    />
                    <Input
                      label="Database limit"
                      type="number"
                      min={0}
                      value={String(form.databaseLimit ?? 0)}
                      onChange={(e) => setForm({ ...form, databaseLimit: Number(e.target.value) })}
                      hint="Max MySQL databases (0 = disabled)"
                    />
                  </div>
                </AdminSettingsPanel>
                )}

                <AdminSettingsPanel
                  title="Account status"
                  description="Suspended servers cannot be started by the owner"
                  icon={Ban}
                  className={form.suspended ? 'border-yellow-500/25 bg-yellow-500/[0.03]' : ''}
                >
                  <Checkbox
                    label="Suspend server"
                    description="Prevents the owner from starting or managing this server"
                    checked={form.suspended ?? false}
                    onChange={(suspended) => setForm({ ...form, suspended })}
                  />
                  {(form.suspended ?? false) && (
                    <p className="mt-2 text-[11px] text-yellow-400/90">
                      This server is suspended and will show as suspended to the owner.
                    </p>
                  )}
                </AdminSettingsPanel>

                {fullAdmin && (
                <AdminSettingsPanel title="Power controls" description="Send power actions to the node daemon" icon={Zap}>
                  {installing && (
                    <p className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                      Server is installing — Start is unavailable until the egg script finishes.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <PowerButton
                      icon={Play}
                      label="Start"
                      loading={powering === 'start'}
                      disabled={installing}
                      onClick={() => power('start')}
                    />
                    <PowerButton icon={RefreshCw} label="Restart" loading={powering === 'restart'} onClick={() => power('restart')} />
                    <PowerButton icon={Square} label="Stop" loading={powering === 'stop'} onClick={() => power('stop')} />
                    <PowerButton icon={AlertTriangle} label="Kill" loading={powering === 'kill'} onClick={() => power('kill')} variant="danger" />
                  </div>
                  {(detail.containerState === 'stopping' || detail.containerState === 'starting') && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-3"
                      disabled={powering !== null}
                      onClick={() => void clearStuckPower()}
                    >
                      {powering === 'clear' ? 'Clearing…' : 'Clear stuck Stopping status'}
                    </Button>
                  )}
                </AdminSettingsPanel>
                )}

                {fullAdmin && (
                <AdminSettingsPanel
                  title="Reinstall server"
                  description="Re-run the egg install script for this user's server"
                  icon={RefreshCw}
                >
                  <p className="mb-3 text-xs text-[var(--muted)]">
                    Owner: <strong className="text-[var(--text)]">{detail.owner.username}</strong>
                    {installing && (
                      <span className="mt-1 block text-cyan-300">Installation already in progress.</span>
                    )}
                  </p>
                  {!confirmReinstall ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={installing || detail.suspended}
                      onClick={() => setConfirmReinstall(true)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reinstall server
                    </Button>
                  ) : (
                    <div className="max-w-xl space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <p className="text-xs text-yellow-200">
                        Reinstall <strong>{detail.name}</strong> for {detail.owner.username}?
                      </p>
                      <Checkbox
                        label="Wipe all files first"
                        description="Deletes everything in the server directory before reinstalling"
                        checked={wipeFiles}
                        onChange={setWipeFiles}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" disabled={saving} onClick={reinstall}>
                          {saving ? 'Reinstalling…' : wipeFiles ? 'Wipe & reinstall' : 'Reinstall'}
                        </Button>
                        <Button type="button" variant="ghost" disabled={saving} onClick={() => setConfirmReinstall(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </AdminSettingsPanel>
                )}

                {fullAdmin && (
                <AdminSettingsPanel title="Danger zone" description="Permanently remove this server" icon={AlertTriangle} tone="danger">
                  {!confirmDelete ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-300">Delete server</p>
                        <p className="text-[11px] text-[var(--muted)]">Permanently removes the server and all data</p>
                      </div>
                      <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                      <p className="text-xs text-red-300">
                        Permanently delete <strong>{detail.name}</strong>?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="danger" disabled={saving} onClick={deleteServer}>Yes, delete permanently</Button>
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

              {(fullAdmin || hasChanges) && (
                <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
              )}
            </form>
          )}

          {tab === 'network' && (
            <AdminServerNetwork serverId={detail.id} nodeId={detail.node.id} fqdn={detail.node.fqdn} />
          )}

          {tab === 'activity' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start">
              <AdminSection title="Recent activity" icon={Activity}>
                {detail.recentActivity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Server events will appear here." />
                ) : (
                  <AdminActivityTimeline
                    entries={detail.recentActivity}
                    renderMeta={(entry) => (
                      <>
                        {entry.actor?.username && `${entry.actor.username} · `}
                        {formatActivityTime(entry.timestamp)}
                      </>
                    )}
                  />
                )}
              </AdminSection>

              <AdminSidebarCard title="Summary">
                <dl className="space-y-3">
                  <AdminMetaRow label="Events" value={String(detail.recentActivity.length)} />
                  <AdminMetaRow label="Status" value={detail.suspended ? 'Suspended' : detail.status} />
                  <AdminMetaRow label="Node" value={detail.node.name} />
                </dl>
              </AdminSidebarCard>
            </div>
          )}
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}

function PowerButton({
  icon: Icon,
  label,
  loading,
  disabled,
  onClick,
  variant = 'default',
}: {
  icon: typeof Play;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      title={disabled ? 'Unavailable while server is installing' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
        variant === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/35 hover:bg-[var(--surface-hover)]'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? '…' : label}
    </button>
  );
}
