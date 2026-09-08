import {
  AlertTriangle,
  Ban,
  HardDrive,
  Play,
  RefreshCw,
  Server,
  Square,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { isServerInstalling } from '../../../lib/server-runtime';
import { Button, Input, Select, Textarea } from '../../Layout';
import { Checkbox } from '../../Checkbox';
import { ServerDetailPanel } from './ServerDetailShell';
import type { ServerDetailController } from '../../../pages/admin/server-detail/useServerDetail';

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
      className={`ds-asd-power-btn${variant === 'danger' ? ' ds-asd-power-btn--danger' : ''}`}
    >
      <Icon className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} aria-hidden />
      {loading ? '…' : label}
    </button>
  );
}

export function ServerManageDashboard({
  ctrl,
  fullAdmin,
}: {
  ctrl: ServerDetailController;
  fullAdmin: boolean;
}) {
  const {
    detail,
    form,
    setForm,
    saving,
    powering,
    confirmDelete,
    setConfirmDelete,
    confirmReinstall,
    setConfirmReinstall,
    wipeFiles,
    setWipeFiles,
    users,
    usersLoading,
    usersError,
    power,
    clearStuckPower,
    reinstall,
    deleteServer,
    hasChanges,
    error,
  } = ctrl;

  if (!detail) return null;

  const installing = isServerInstalling(detail);
  const ownerChanged = form.ownerId !== detail.owner.id;

  return (
    <div className="ds-asd-manage">
      {fullAdmin ? (
        <ServerDetailPanel
          icon={User}
          title="Ownership"
          description="Transfer this server and all owner permissions to another account"
          tone={ownerChanged ? 'warning' : undefined}
        >
          <Select
            label="Server owner"
            value={form.ownerId ?? detail.owner.id}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            disabled={usersLoading || Boolean(usersError)}
            required
            hint={
              usersLoading
                ? 'Loading users…'
                : usersError || 'The previous owner immediately loses owner access after saving.'
            }
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
          {ownerChanged ? (
            <p className="ds-asd-callout ds-asd-callout--warning">
              Saving will transfer ownership away from <strong>{detail.owner.username}</strong>. The new
              owner receives full access immediately.
            </p>
          ) : null}
        </ServerDetailPanel>
      ) : null}

      {fullAdmin ? (
        <ServerDetailPanel
          icon={Server}
          title="Server details"
          description="Name and description shown to the owner"
        >
          <div className="ds-asd-form-grid">
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
        </ServerDetailPanel>
      ) : null}

      {fullAdmin ? (
        <ServerDetailPanel
          icon={HardDrive}
          title="Resource limits"
          description="Memory, disk, and CPU — set to 0 for unlimited. Feature limits use 0 to disable."
        >
          <div className="ds-asd-form-grid ds-asd-form-grid--3">
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
        </ServerDetailPanel>
      ) : null}

      <ServerDetailPanel
        icon={Ban}
        title="Account status"
        description="Suspended servers cannot be started by the owner"
        tone={form.suspended ? 'warning' : undefined}
      >
        <Checkbox
          label="Suspend server"
          description="Prevents the owner from starting or managing this server"
          checked={form.suspended ?? false}
          onChange={(suspended) => setForm({ ...form, suspended })}
        />
        {form.suspended ? (
          <p className="ds-asd-callout ds-asd-callout--warning">
            This server is suspended and will show as suspended to the owner.
          </p>
        ) : null}
      </ServerDetailPanel>

      {fullAdmin ? (
        <ServerDetailPanel
          icon={Zap}
          title="Power controls"
          description="Send power actions to the node daemon"
        >
          {installing ? (
            <p className="ds-asd-callout ds-asd-callout--info">
              Server is installing — Start is unavailable until the egg script finishes.
            </p>
          ) : null}
          <div className="ds-asd-power-row">
            <PowerButton
              icon={Play}
              label="Start"
              loading={powering === 'start'}
              disabled={installing}
              onClick={() => void power('start')}
            />
            <PowerButton
              icon={RefreshCw}
              label="Restart"
              loading={powering === 'restart'}
              onClick={() => void power('restart')}
            />
            <PowerButton
              icon={Square}
              label="Stop"
              loading={powering === 'stop'}
              onClick={() => void power('stop')}
            />
            <PowerButton
              icon={AlertTriangle}
              label="Kill"
              loading={powering === 'kill'}
              onClick={() => void power('kill')}
              variant="danger"
            />
          </div>
          {detail.containerState === 'stopping' || detail.containerState === 'starting' ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-3"
              disabled={powering !== null}
              onClick={() => void clearStuckPower()}
            >
              {powering === 'clear' ? 'Clearing…' : 'Clear stuck Stopping status'}
            </Button>
          ) : null}
        </ServerDetailPanel>
      ) : null}

      {fullAdmin ? (
        <ServerDetailPanel
          icon={RefreshCw}
          title="Reinstall server"
          description="Re-run the egg install script for this user's server"
        >
          <p className="ds-asd-muted-line">
            Owner: <strong>{detail.owner.username}</strong>
            {installing ? (
              <span className="ds-asd-muted-line-accent">Installation already in progress.</span>
            ) : null}
          </p>
          {!confirmReinstall ? (
            <Button
              type="button"
              variant="ghost"
              disabled={installing || detail.suspended}
              onClick={() => setConfirmReinstall(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Reinstall server
            </Button>
          ) : (
            <div className="ds-asd-confirm-box ds-asd-confirm-box--warning">
              <p>
                Reinstall <strong>{detail.name}</strong> for {detail.owner.username}?
              </p>
              <Checkbox
                label="Wipe all files first"
                description="Deletes everything in the server directory before reinstalling"
                checked={wipeFiles}
                onChange={setWipeFiles}
              />
              <div className="ds-asd-confirm-actions">
                <Button type="button" disabled={saving} onClick={() => void reinstall()}>
                  {saving ? 'Reinstalling…' : wipeFiles ? 'Wipe & reinstall' : 'Reinstall'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setConfirmReinstall(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </ServerDetailPanel>
      ) : null}

      {fullAdmin ? (
        <ServerDetailPanel
          icon={AlertTriangle}
          title="Danger zone"
          description="Permanently remove this server"
          tone="danger"
        >
          {!confirmDelete ? (
            <div className="ds-asd-danger-row">
              <div>
                <p className="ds-asd-danger-title">Delete server</p>
                <p className="ds-asd-danger-desc">Permanently removes the server and all data</p>
              </div>
              <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </Button>
            </div>
          ) : (
            <div className="ds-asd-confirm-box ds-asd-confirm-box--danger">
              <p>
                Permanently delete <strong>{detail.name}</strong>?
              </p>
              <div className="ds-asd-confirm-actions">
                <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteServer()}>
                  Yes, delete permanently
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
              {error && !hasChanges ? <p className="ds-asd-form-error">{error}</p> : null}
            </div>
          )}
        </ServerDetailPanel>
      ) : null}
    </div>
  );
}
