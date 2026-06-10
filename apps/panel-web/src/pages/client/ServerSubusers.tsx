import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { Checkbox } from '../../components/Checkbox';
import { UserAvatar } from '../../components/UserAvatar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Button, Input } from '../../components/Layout';
import {
  ServerErrorBanner,
  ServerListCard,
  ServerLoadingBlock,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
} from '../../components/server/ServerPage';

interface Subuser {
  id: string;
  permissions: string[];
  user: { email: string; username: string; avatarUrl?: string | null };
}

const PERMISSION_GROUPS: Array<{ title: string; items: Array<{ key: string; label: string; desc?: string }> }> = [
  {
    title: 'Server control',
    items: [
      { key: 'control.console', label: 'Console', desc: 'View console & send commands' },
      { key: 'control.start', label: 'Start', desc: 'Start the server' },
      { key: 'control.stop', label: 'Stop', desc: 'Stop the server' },
      { key: 'control.restart', label: 'Restart', desc: 'Restart the server' },
    ],
  },
  {
    title: 'Files',
    items: [
      { key: 'file.read', label: 'Read files', desc: 'View and download files' },
      { key: 'file.create', label: 'Create files', desc: 'Upload and create files' },
      { key: 'file.update', label: 'Edit files', desc: 'Modify existing files' },
      { key: 'file.delete', label: 'Delete files', desc: 'Remove files and folders' },
      { key: 'file.archive', label: 'Archives', desc: 'Create and extract archives' },
      { key: 'file.sftp', label: 'SFTP', desc: 'Connect via SFTP' },
      { key: 'marketplace.install', label: 'Marketplace', desc: 'Install FiveM resources from catalog' },
    ],
  },
  {
    title: 'Network',
    items: [
      { key: 'allocation.read', label: 'View allocations', desc: 'See assigned ports' },
      { key: 'allocation.create', label: 'Auto-assign ports', desc: 'Claim free allocations' },
      { key: 'allocation.update', label: 'Set primary', desc: 'Change the main connection port' },
      { key: 'allocation.delete', label: 'Remove ports', desc: 'Unassign secondary allocations' },
    ],
  },
  {
    title: 'Users & startup',
    items: [
      { key: 'user.read', label: 'View subusers', desc: 'See who has access' },
      { key: 'user.create', label: 'Add subusers', desc: 'Invite new subusers' },
      { key: 'user.update', label: 'Edit subusers', desc: 'Change permissions' },
      { key: 'user.delete', label: 'Remove subusers', desc: 'Revoke access' },
      { key: 'startup.read', label: 'View startup', desc: 'See startup variables' },
      { key: 'startup.update', label: 'Edit startup', desc: 'Change startup variables' },
    ],
  },
  {
    title: 'Databases',
    items: [
      { key: 'database.read', label: 'View databases', desc: 'See database list and connection info' },
      { key: 'database.create', label: 'Create databases', desc: 'Provision new MySQL databases' },
      { key: 'database.delete', label: 'Delete databases', desc: 'Remove databases' },
      { key: 'database.view_password', label: 'View passwords', desc: 'Reveal database passwords' },
    ],
  },
  {
    title: 'Backups & schedules',
    items: [
      { key: 'backup.read', label: 'View backups', desc: 'See backup list' },
      { key: 'backup.create', label: 'Create backups', desc: 'Start new backups' },
      { key: 'backup.delete', label: 'Delete backups', desc: 'Remove backup records' },
      { key: 'schedule.read', label: 'View schedules', desc: 'See automated tasks' },
      { key: 'schedule.create', label: 'Create schedules', desc: 'Add new schedules' },
      { key: 'schedule.update', label: 'Edit schedules', desc: 'Pause or modify schedules' },
      { key: 'schedule.delete', label: 'Delete schedules', desc: 'Remove schedules' },
    ],
  },
];

export function ServerSubusersPage() {
  const id = useServerRouteId();
  const [subusers, setSubusers] = useState<Subuser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['control.console', 'file.read']);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Subuser | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    loadSubusers();
  }, [id]);

  async function loadSubusers() {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await api.client.subusers(id);
      setSubusers(list as unknown as Subuser[]);
    } catch (err) {
      setSubusers([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load subusers');
    } finally {
      setLoading(false);
    }
  }

  async function addSubuser(e: FormEvent) {
    e.preventDefault();
    if (!id || !email) return;
    setAdding(true);
    setError('');
    try {
      await api.client.addSubuser(id, email, permissions);
      setEmail('');
      await loadSubusers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subuser');
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemoveSubuser() {
    if (!id || !removeTarget) return;
    setRemoveLoading(true);
    setError('');
    try {
      await api.client.removeSubuser(id, removeTarget.id);
      if (editingId === removeTarget.id) setEditingId(null);
      setRemoveTarget(null);
      await loadSubusers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove subuser');
    } finally {
      setRemoveLoading(false);
    }
  }

  function startEdit(subuser: Subuser) {
    setEditingId(subuser.id);
    setEditPermissions([...subuser.permissions]);
  }

  async function saveEdit(subuserId: string) {
    if (!id) return;
    setSavingEdit(true);
    setError('');
    try {
      await api.client.updateSubuser(id, subuserId, editPermissions);
      setEditingId(null);
      await loadSubusers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subuser');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <ServerPage>
      <ServerPageHeader title="Subusers" description="Grant other users access to this server with specific permissions" />
      <ServerErrorBanner message={loadError || error} />

      <ServerPanel icon={Users} title="People with access" description={loading ? 'Loading…' : `${subusers.length} subuser${subusers.length === 1 ? '' : 's'}`} noPadding>
        {loading ? (
          <ServerLoadingBlock />
        ) : subusers.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">No subusers have access to this server yet.</p>
        ) : (
          <div className="space-y-3 p-4">
            {subusers.map((s) => (
              <ServerListCard key={s.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={s.user} size="md" ring />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.user.username}</div>
                      <div className="truncate text-sm text-[var(--muted)]">{s.user.email}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{s.permissions.length} permission{s.permissions.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" onClick={() => (editingId === s.id ? setEditingId(null) : startEdit(s))}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <button type="button" onClick={() => setRemoveTarget(s)} className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-2 text-red-400 hover:bg-red-500/15">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {editingId === s.id && (
                  <div className="mt-4 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 p-4">
                    <PermissionGrid permissions={editPermissions} onToggle={(key, checked) => setEditPermissions((prev) => (checked ? [...prev, key] : prev.filter((p) => p !== key)))} />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button disabled={savingEdit} onClick={() => saveEdit(s.id)}>{savingEdit ? 'Saving…' : 'Save permissions'}</Button>
                    </div>
                  </div>
                )}
              </ServerListCard>
            ))}
          </div>
        )}
      </ServerPanel>

      <ServerPanel icon={UserPlus} iconTone="green" title="Invite subuser" description="User must already have a panel account">
        <form onSubmit={addSubuser} className="space-y-5">
          <Input label="User email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
          <PermissionGrid permissions={permissions} onToggle={(key, checked) => setPermissions((prev) => (checked ? [...prev, key] : prev.filter((p) => p !== key)))} />
          <Button type="submit" disabled={adding}>
            <UserPlus className="h-3.5 w-3.5" />
            {adding ? 'Adding…' : 'Add subuser'}
          </Button>
        </form>
      </ServerPanel>

      <ConfirmModal
        open={removeTarget !== null}
        title="Remove this subuser?"
        detail={removeTarget?.user.email}
        description={`${removeTarget?.user.username ?? 'This user'} will lose all access to this server immediately.`}
        confirmLabel="Remove subuser"
        tone="danger"
        loading={removeLoading}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemoveSubuser}
      />
    </ServerPage>
  );
}

function PermissionGrid({ permissions, onToggle }: { permissions: string[]; onToggle: (key: string, checked: boolean) => void }) {
  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.title}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{group.title}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <Checkbox key={item.key} label={item.label} description={item.desc} checked={permissions.includes(item.key)} onChange={(checked) => onToggle(item.key, checked)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
