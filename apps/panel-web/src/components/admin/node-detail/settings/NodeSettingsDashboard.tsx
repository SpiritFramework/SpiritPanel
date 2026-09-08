import type { Dispatch, SetStateAction } from 'react';
import {
  AlertTriangle,
  Download,
  Globe,
  HardDrive,
  KeyRound,
  MemoryStick,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Shield,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { AdminLocationSummary, AdminNodeDetail, UpdateAdminNodeInput } from '../../../../lib/api';
import { formatLocationLabel } from '../../../LocationFlag';
import { Button, Input, Select, Textarea } from '../../../Layout';
import { NodeOverviewEndpoint, NodeOverviewSection } from '../NodeDetailShell';
import { NodeSettingsUsageSnapshot } from './NodeSettingsUsageSnapshot';
import { formatResource } from '../../../../lib/server-theme';

export type NodeSettingsController = {
  detail: AdminNodeDetail;
  form: UpdateAdminNodeInput;
  setForm: Dispatch<SetStateAction<UpdateAdminNodeInput>>;
  locations: AdminLocationSummary[];
  saving: boolean;
  error: string;
  saved: boolean;
  hasChanges: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
  confirmRotate: boolean;
  setConfirmRotate: (value: boolean) => void;
  copied: boolean;
  resetForm: () => void;
  downloadConfig: () => void;
  rotateToken: () => Promise<void>;
  deleteNode: () => Promise<void>;
  copyText: (text: string) => Promise<void>;
};

export function NodeSettingsDashboard({ ctrl }: { ctrl: NodeSettingsController }) {
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

  const panelUsesSsl = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wingsVersion =
    detail.system && typeof detail.system.version === 'string' ? detail.system.version : null;
  const scheme = form.scheme ?? detail.scheme;
  const fqdn = form.fqdn ?? detail.fqdn;
  const apiPort = form.daemonListen ?? detail.daemonListen;
  const sftpPort = form.daemonSftp ?? detail.daemonSftp;
  const behindProxy = form.behindProxy ?? detail.behindProxy;
  const maintenanceMode = form.maintenanceMode ?? detail.maintenanceMode;

  return (
    <div className="ds-nd-st">
      <div className="ds-nd-st-grid">
        <div className="ds-nd-st-main">
          <NodeOverviewSection
            icon={Server}
            title="Identity"
            description="Display name, region, and internal notes"
          >
            <div className="ds-nd-st-fields">
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
                    {formatLocationLabel(detail.location)}
                  </option>
                )}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {formatLocationLabel(location)}
                  </option>
                ))}
              </Select>
              <div className="ds-nd-st-fields-span">
                <Textarea
                  label="Description"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Optional notes for your team"
                />
              </div>
            </div>
          </NodeOverviewSection>

          <NodeOverviewSection
            icon={Globe}
            title="Network & connectivity"
            description="FQDN, TLS, proxy settings, and daemon ports"
          >
            <div className="ds-nd-st-fields">
              <Input
                label="FQDN"
                value={form.fqdn ?? ''}
                onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                required
                hint="Domain name for the daemon (e.g. node.example.com)"
              />
              <Input
                label="Public IP"
                value={form.publicIp ?? ''}
                onChange={(e) => setForm({ ...form, publicIp: e.target.value })}
                placeholder="203.0.113.10"
                hint="Used for Cloudflare A/AAAA records when allocations bind 0.0.0.0"
              />
              <Select
                label="Communicate over SSL"
                value={scheme}
                onChange={(e) => setForm({ ...form, scheme: e.target.value as 'http' | 'https' })}
              >
                <option value="https">Use SSL connection</option>
                <option value="http">Use HTTP connection</option>
              </Select>
              <Select
                label="Behind proxy"
                value={behindProxy ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, behindProxy: e.target.value === 'yes' })}
                hint="Enable when Cloudflare or nginx terminates TLS in front of Wings."
              >
                <option value="no">Not behind proxy</option>
                <option value="yes">Behind proxy</option>
              </Select>
              <Input
                label="Subdomain base override"
                value={form.domainBase ?? ''}
                onChange={(e) => setForm({ ...form, domainBase: e.target.value })}
                placeholder="Leave blank to use global setting"
                hint="e.g. spirithost.co.uk — users create slug.this-domain"
              />
              <Input
                label="Cloudflare zone ID override"
                value={form.cloudflareZoneId ?? ''}
                onChange={(e) => setForm({ ...form, cloudflareZoneId: e.target.value })}
                placeholder="Leave blank to use global zone"
                hint="Only needed when this node's base domain is in a different Cloudflare zone"
              />
              <Input
                label="Daemon API port"
                type="number"
                value={String(apiPort)}
                onChange={(e) => setForm({ ...form, daemonListen: Number(e.target.value) })}
              />
              <Input
                label="SFTP port"
                type="number"
                value={String(sftpPort)}
                onChange={(e) => setForm({ ...form, daemonSftp: Number(e.target.value) })}
              />
            </div>

            {panelUsesSsl && scheme === 'http' ? (
              <div className="ds-nd-st-notice ds-nd-st-notice--warn">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Your panel uses HTTPS. Browsers need the node on SSL, or console traffic proxied via{' '}
                  <code>/wings/</code>.
                </p>
              </div>
            ) : null}
          </NodeOverviewSection>

          <NodeOverviewSection
            icon={SlidersHorizontal}
            title="Resource limits"
            description="Memory, disk, upload size, and data directory on the host"
          >
            {detail.capacity ? (
              <div className="ds-nd-st-usage-wrap">
                <NodeSettingsUsageSnapshot capacity={detail.capacity} />
              </div>
            ) : null}

            <div className="ds-nd-st-limit-row">
              <LimitPreviewCard
                label="RAM limit"
                value={form.memory ?? detail.memory}
                overallocate={form.memoryOverallocate ?? detail.memoryOverallocate}
              />
              <LimitPreviewCard
                label="Disk limit"
                value={form.disk ?? detail.disk}
                overallocate={form.diskOverallocate ?? detail.diskOverallocate}
              />
            </div>

            <div className="ds-nd-st-fields">
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
              <div className="ds-nd-st-fields-span">
                <Input
                  label="Data directory"
                  value={form.daemonBase ?? ''}
                  onChange={(e) => setForm({ ...form, daemonBase: e.target.value })}
                  className="font-mono"
                  hint="Path on the host where server data is stored"
                />
              </div>
            </div>
          </NodeOverviewSection>
        </div>

        <aside className="ds-nd-st-rail">
          <button
            type="button"
            className={`ds-nd-st-maint${maintenanceMode ? ' ds-nd-st-maint--on' : ''}`}
            onClick={() => setForm({ ...form, maintenanceMode: !maintenanceMode })}
          >
            <span className="ds-nd-st-maint-icon" aria-hidden>
              <Wrench className="ds-icon ds-icon--sm" />
            </span>
            <span className="ds-nd-st-maint-copy">
              <span className="ds-nd-st-maint-label">Maintenance mode</span>
              <span className="ds-nd-st-maint-hint">
                {maintenanceMode ? 'Deployments paused — click to disable' : 'Block new server deployments'}
              </span>
            </span>
            <span className={`ds-nd-st-toggle${maintenanceMode ? ' ds-nd-st-toggle--on' : ''}`} aria-hidden>
              <span className="ds-nd-st-toggle-knob" />
            </span>
          </button>

          <NodeOverviewSection icon={Globe} title="Live preview" description="Updates as you edit network fields">
            <div className="ds-nd-ov-endpoint-grid">
              <NodeOverviewEndpoint label="Panel API" value={`${scheme}://${fqdn}:${apiPort}`} mono />
              <NodeOverviewEndpoint label="SFTP" value={`${fqdn}:${sftpPort}`} mono />
            </div>
            <div className="ds-nd-ov-tags">
              {behindProxy ? <span className="ds-nd-tag">Behind proxy</span> : null}
              <span className="ds-nd-tag">{scheme.toUpperCase()}</span>
            </div>
          </NodeOverviewSection>

          <NodeOverviewSection
            icon={KeyRound}
            title="FeatherWings"
            description="Daemon credentials and config"
          >
            <div className="ds-nd-ov-endpoint-grid">
              <NodeOverviewEndpoint
                label="Wings version"
                value={wingsVersion ?? (detail.online ? 'Connected' : '—')}
              />
              <NodeOverviewEndpoint label="Token ID" value={detail.daemonTokenId} mono />
            </div>
            <div className="ds-nd-st-wings-actions">
              <Button type="button" variant="secondary" size="sm" onClick={downloadConfig}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download config
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyText(detail.daemonTokenId)}>
                <Shield className="h-3.5 w-3.5" aria-hidden />
                {copied ? 'Copied' : 'Copy token ID'}
              </Button>
              {!confirmRotate ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRotate(true)}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Rotate token
                </Button>
              ) : (
                <div className="ds-nd-st-confirm ds-nd-st-confirm--warn">
                  <p>Rotate daemon token? Wings will need the new config.</p>
                  <div className="ds-nd-st-confirm-actions">
                    <Button type="button" size="sm" disabled={saving} onClick={() => void rotateToken()}>
                      Confirm
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRotate(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </NodeOverviewSection>
        </aside>
      </div>

      <section className="ds-nd-st-danger" aria-labelledby="node-danger-heading">
        <header className="ds-nd-st-danger-head">
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <h3 id="node-danger-heading" className="ds-nd-st-danger-title">
              Danger zone
            </h3>
            <p className="ds-nd-st-danger-desc">Permanently remove this node from the panel</p>
          </div>
        </header>
        <div className="ds-nd-st-danger-body">
          {!confirmDelete ? (
            <>
              <p className="ds-nd-st-danger-text">
                {detail.serverCount > 0
                  ? `Remove all ${detail.serverCount} server(s) before deleting this node.`
                  : `Permanently delete ${detail.name}. This cannot be undone.`}
              </p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={detail.serverCount > 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete node
              </Button>
            </>
          ) : (
            <div className="ds-nd-st-confirm ds-nd-st-confirm--danger">
              <p>
                Delete <strong>{detail.name}</strong> permanently?
              </p>
              <div className="ds-nd-st-confirm-actions">
                <Button type="button" variant="danger" size="sm" disabled={saving} onClick={() => void deleteNode()}>
                  Yes, delete
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <div
        className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : ''}${saved ? ' ds-nd-st-savebar--saved' : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="ds-nd-st-savebar-status">
          {error ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
          ) : saved ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Changes saved</span>
          ) : hasChanges ? (
            <span className="ds-nd-st-savebar-msg">
              <span className="ds-nd-st-savebar-dot" aria-hidden />
              Unsaved changes
            </span>
          ) : (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">All changes saved</span>
          )}
        </div>
        <div className="ds-nd-st-savebar-actions">
          <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={!hasChanges || saving}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={saving || !hasChanges}>
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LimitPreviewCard({
  label,
  value,
  overallocate,
}: {
  label: string;
  value: number;
  overallocate: number;
}) {
  const effective = value > 0 ? value + Math.floor((value * overallocate) / 100) : 0;
  const Icon = label.includes('Disk') ? HardDrive : MemoryStick;

  return (
    <div className="ds-nd-st-limit">
      <span className="ds-nd-st-limit-icon" aria-hidden>
        <Icon className="ds-icon ds-icon--sm" />
      </span>
      <div className="min-w-0">
        <p className="ds-nd-st-limit-label">{label}</p>
        <p className="ds-nd-st-limit-value">{effective > 0 ? formatResource(effective, 'MiB') : 'Unlimited'}</p>
        {overallocate > 0 && value > 0 ? (
          <p className="ds-nd-st-limit-hint">+{overallocate}% overallocate</p>
        ) : null}
      </div>
    </div>
  );
}
