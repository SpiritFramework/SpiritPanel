import {
  Download,
  Globe,
  Info,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { AdminEditNotice } from '../../../components/admin/AdminEditLayout';
import { NodeCapacityOverview } from '../../../components/admin/NodeCapacityOverview';
import {
  AdminCopyButton,
  AdminFormStatus,
  AdminInfoRow,
  AdminSaveBar,
  AdminSettingsPanel,
} from '../../../components/AdminDetailLayout';
import { Button, Input, Select, Textarea } from '../../../components/Layout';
import { Checkbox } from '../../../components/Checkbox';
import type { NodeDetailController } from './useNodeDetail';

export function NodeDetailSettingsTab({ ctrl }: { ctrl: NodeDetailController }) {
  const {
    detail,
    form,
    setForm,
    locations,
    saving,
    error,
    saved,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    confirmRotate,
    setConfirmRotate,
    copied,
    resetForm,
    downloadConfig,
    rotateToken,
    deleteNode,
    copyText,
  } = ctrl;

  if (!detail) return null;

  const panelUsesSsl = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wingsVersion =
    detail.system && typeof detail.system.version === 'string' ? detail.system.version : null;

  return (
    <div className="node-edit-settings">
      <AdminFormStatus error={error || undefined} saved={saved} />

      <div className="node-edit-settings-sections">
        <AdminSettingsPanel title="Identity" description="Display name, region, and maintenance state" icon={Info}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Node name"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Select
              label="Location"
              value={form.locationId ?? detail.location.id}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              {locations.length === 0 && (
                <option value={detail.location.id}>
                  {detail.location.short} — {detail.location.long}
                </option>
              )}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.short} — {location.long}
                </option>
              ))}
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Optional notes for your team"
              />
            </div>
            <div className="sm:col-span-2">
              <Checkbox
                label="Maintenance mode"
                description="Prevent new servers from being deployed to this node"
                checked={form.maintenanceMode ?? false}
                onChange={(maintenanceMode) => setForm({ ...form, maintenanceMode })}
              />
            </div>
          </div>
        </AdminSettingsPanel>

        <AdminSettingsPanel title="Network" description="FQDN, SSL, proxy, and daemon ports" icon={Globe}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="FQDN"
              value={form.fqdn ?? ''}
              onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
              required
              hint="Domain name for the daemon (e.g. node.example.com). Use an IP only without SSL."
            />
            <div className="space-y-4">
              <Select
                label="Communicate over SSL"
                value={form.scheme ?? 'https'}
                onChange={(e) => setForm({ ...form, scheme: e.target.value as 'http' | 'https' })}
              >
                <option value="https">Use SSL connection</option>
                <option value="http">Use HTTP connection</option>
              </Select>
              <Select
                label="Behind proxy"
                value={form.behindProxy ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, behindProxy: e.target.value === 'yes' })}
                hint="Enable when Cloudflare or nginx terminates TLS in front of Wings."
              >
                <option value="no">Not behind proxy</option>
                <option value="yes">Behind proxy</option>
              </Select>
            </div>
            <Input
              label="Daemon API port"
              type="number"
              value={String(form.daemonListen ?? '')}
              onChange={(e) => setForm({ ...form, daemonListen: Number(e.target.value) })}
              hint="Port the panel uses to communicate with FeatherWings."
            />
            <Input
              label="SFTP port"
              type="number"
              value={String(form.daemonSftp ?? '')}
              onChange={(e) => setForm({ ...form, daemonSftp: Number(e.target.value) })}
              hint="Port FeatherWings listens on for SFTP file uploads."
            />
          </div>

          {panelUsesSsl && form.scheme === 'http' && (
            <div className="mt-4">
              <AdminEditNotice>
                Your panel uses HTTPS. Browsers need the node on SSL, or console traffic proxied via{' '}
                <code className="text-yellow-100">/wings/</code>.
              </AdminEditNotice>
            </div>
          )}

          {panelUsesSsl && form.behindProxy && (
            <div className="mt-3">
              <AdminEditNotice tone="info">
                Console WebSocket traffic can route through the panel nginx proxy at <code>/wings/</code> when
                behind proxy is enabled.
              </AdminEditNotice>
            </div>
          )}
        </AdminSettingsPanel>

        <AdminSettingsPanel title="Resource limits" description="Memory, disk, and upload settings" icon={SlidersHorizontal}>
          {detail.capacity && (
            <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/30 p-4">
              <NodeCapacityOverview
                capacity={detail.capacity}
                serverCount={detail.serverCount}
                assignedAllocations={detail.assignedAllocations}
                allocationCount={detail.allocationCount}
                compact
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Total memory (MB)"
              type="number"
              value={String(form.memory ?? '')}
              onChange={(e) => setForm({ ...form, memory: Number(e.target.value) })}
              hint="0 = unlimited"
            />
            <Input
              label="Memory overallocate (%)"
              type="number"
              value={String(form.memoryOverallocate ?? '')}
              onChange={(e) => setForm({ ...form, memoryOverallocate: Number(e.target.value) })}
            />
            <Input
              label="Total disk (MB)"
              type="number"
              value={String(form.disk ?? '')}
              onChange={(e) => setForm({ ...form, disk: Number(e.target.value) })}
              hint="0 = unlimited"
            />
            <Input
              label="Disk overallocate (%)"
              type="number"
              value={String(form.diskOverallocate ?? '')}
              onChange={(e) => setForm({ ...form, diskOverallocate: Number(e.target.value) })}
            />
            <Input
              label="Upload size (MB)"
              type="number"
              value={String(form.uploadSize ?? '')}
              onChange={(e) => setForm({ ...form, uploadSize: Number(e.target.value) })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Data directory"
                value={form.daemonBase ?? ''}
                onChange={(e) => setForm({ ...form, daemonBase: e.target.value })}
                className="font-mono"
                hint="Host path where server volumes are stored."
              />
            </div>
          </div>
        </AdminSettingsPanel>

        <AdminSettingsPanel title="FeatherWings credentials" description="Config download and daemon token" icon={Download}>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInfoRow label="Wings version" value={wingsVersion ?? (detail.online ? 'Connected' : '—')} />
            <AdminInfoRow label="Token ID" value={detail.daemonTokenId} mono truncate />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={downloadConfig}>
              <Download className="h-3.5 w-3.5" />
              Download config
            </Button>
            <AdminCopyButton
              label={copied ? 'Copied' : 'Copy token ID'}
              active={copied}
              onClick={() => void copyText(detail.daemonTokenId)}
            />
            {!confirmRotate ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmRotate(true)}>
                <RefreshCw className="h-3.5 w-3.5" />
                Rotate token
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                <span className="text-xs text-yellow-200">Rotate daemon token?</span>
                <Button type="button" disabled={saving} onClick={() => void rotateToken()}>
                  Confirm
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmRotate(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </AdminSettingsPanel>

        <AdminSettingsPanel title="Danger zone" description="Permanently remove this node" icon={Trash2} tone="danger">
          {!confirmDelete ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--muted)]">
                {detail.serverCount > 0
                  ? `Remove all ${detail.serverCount} server(s) before deleting this node.`
                  : `Permanently delete ${detail.name}. This cannot be undone.`}
              </p>
              <Button
                type="button"
                variant="danger"
                disabled={detail.serverCount > 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete node
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs text-red-300">Delete {detail.name} permanently?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteNode()}>
                  Yes, delete
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </AdminSettingsPanel>
      </div>

      <div className="node-edit-settings-save">
        <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
      </div>
    </div>
  );
}
