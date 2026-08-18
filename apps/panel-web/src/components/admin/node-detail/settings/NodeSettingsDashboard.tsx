import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Download,
  Globe,
  HardDrive,
  KeyRound,
  MapPin,
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
import { Button, Input, Select, Textarea } from '../../../Layout';
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

  const showSaveDock = hasChanges || saved || !!error;

  return (
    <div className="ds-nd-st">
      <header className="ds-nd-st-header">
        <div>
          <p className="ds-nd-st-eyebrow">Configuration</p>
          <h2 className="ds-nd-st-title">Node settings</h2>
          <p className="ds-nd-st-desc">
            Identity, networking, resource limits, and FeatherWings credentials for{' '}
            <strong>{detail.name}</strong>
          </p>
        </div>
        <div className="ds-nd-st-header-meta">
          <span className="ds-nd-st-meta-chip">
            <MapPin className="ds-icon ds-icon--sm" aria-hidden />
            {detail.location.short}
          </span>
          <span className="ds-nd-st-meta-chip font-mono">{detail.uuid.slice(0, 8)}…</span>
        </div>
      </header>

      {showSaveDock ? (
        <div className={`ds-nd-st-save-dock${hasChanges ? ' ds-nd-st-save-dock--dirty' : ''}`}>
          <div className="ds-nd-st-save-status">
            {error ? (
              <span className="ds-nd-st-save-msg ds-nd-st-save-msg--error">{error}</span>
            ) : saved ? (
              <span className="ds-nd-st-save-msg ds-nd-st-save-msg--success">Changes saved</span>
            ) : hasChanges ? (
              <span className="ds-nd-st-save-msg">
                <span className="ds-nd-st-save-dot" aria-hidden />
                Unsaved changes
              </span>
            ) : null}
          </div>
          <div className="ds-nd-st-save-actions">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={!hasChanges || saving}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button type="submit" size="sm" disabled={saving || !hasChanges}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="ds-nd-st-layout">
        <div className="ds-nd-st-main">
          <SettingsSection
            id="identity"
            icon={Server}
            title="Identity"
            description="How this node appears in the panel and which region it belongs to"
          >
            <div className="ds-nd-st-form-grid">
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
              <div className="ds-nd-st-span-2">
                <Textarea
                  label="Description"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Optional notes for your team"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="network"
            icon={Globe}
            title="Network & connectivity"
            description="FQDN, TLS, proxy settings, and daemon ports"
          >
            <div className="ds-nd-st-form-grid">
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
          </SettingsSection>

          <SettingsSection
            id="resources"
            icon={SlidersHorizontal}
            title="Resource limits"
            description="Memory, disk, upload size, and data directory on the host"
          >
            {detail.capacity ? (
              <NodeSettingsUsageSnapshot capacity={detail.capacity} liveUsage={detail.liveUsage} />
            ) : null}

            <div className="ds-nd-st-limit-cards">
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

            <div className="ds-nd-st-form-grid">
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
              <div className="ds-nd-st-span-2">
                <Input
                  label="Data directory"
                  value={form.daemonBase ?? ''}
                  onChange={(e) => setForm({ ...form, daemonBase: e.target.value })}
                  className="font-mono"
                  hint="Path on the host where server data is stored"
                />
              </div>
            </div>
          </SettingsSection>
        </div>

        <aside className="ds-nd-st-aside">
          <button
            type="button"
            className={`ds-nd-st-maint-card${maintenanceMode ? ' ds-nd-st-maint-card--on' : ''}`}
            onClick={() => setForm({ ...form, maintenanceMode: !maintenanceMode })}
          >
            <span className="ds-nd-st-maint-icon" aria-hidden>
              <Wrench className="ds-icon" />
            </span>
            <span className="ds-nd-st-maint-body">
              <span className="ds-nd-st-maint-label">Maintenance mode</span>
              <span className="ds-nd-st-maint-hint">
                {maintenanceMode
                  ? 'New deployments blocked — click to disable'
                  : 'Click to block new server deployments'}
              </span>
            </span>
            <span className={`ds-nd-st-toggle${maintenanceMode ? ' ds-nd-st-toggle--on' : ''}`} aria-hidden>
              <span className="ds-nd-st-toggle-knob" />
            </span>
          </button>

          <div className="ds-nd-st-preview-card">
            <p className="ds-nd-st-section-label">Connection preview</p>
            <PreviewRow label="Panel API" value={`${scheme}://${fqdn}:${apiPort}`} />
            <PreviewRow label="SFTP" value={`${fqdn}:${sftpPort}`} />
            <div className="ds-nd-st-preview-tags">
              {behindProxy ? <span className="ds-nd-tag">Behind proxy</span> : null}
              <span className="ds-nd-tag">{scheme.toUpperCase()}</span>
            </div>
          </div>

          <SettingsSection
            icon={KeyRound}
            title="FeatherWings"
            description="Daemon credentials and config"
            compact
          >
            <div className="ds-nd-st-wings-meta">
              <PreviewRow label="Wings version" value={wingsVersion ?? (detail.online ? 'Connected' : '—')} />
              <PreviewRow label="Token ID" value={detail.daemonTokenId} mono truncate />
            </div>
            <div className="ds-nd-st-action-stack">
              <Button type="button" variant="ghost" size="sm" className="ds-nd-st-action-btn" onClick={downloadConfig}>
                <Download className="h-3.5 w-3.5" />
                Download config
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ds-nd-st-action-btn"
                onClick={() => void copyText(detail.daemonTokenId)}
              >
                <Shield className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy token ID'}
              </Button>
              {!confirmRotate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ds-nd-st-action-btn"
                  onClick={() => setConfirmRotate(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rotate token
                </Button>
              ) : (
                <div className="ds-nd-st-confirm-box ds-nd-st-confirm-box--warn">
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
          </SettingsSection>
        </aside>
      </div>

      <section className="ds-nd-st-danger" aria-labelledby="node-danger-heading">
        <div className="ds-nd-st-danger-head">
          <Trash2 className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <h3 id="node-danger-heading" className="ds-nd-st-danger-title">
              Danger zone
            </h3>
            <p className="ds-nd-st-danger-desc">Permanently remove this node from the panel</p>
          </div>
        </div>
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
                disabled={detail.serverCount > 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete node
              </Button>
            </>
          ) : (
            <div className="ds-nd-st-confirm-box ds-nd-st-confirm-box--danger">
              <p>Delete <strong>{detail.name}</strong> permanently?</p>
              <div className="ds-nd-st-confirm-actions">
                <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteNode()}>
                  Yes, delete
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  compact,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`ds-nd-st-section${compact ? ' ds-nd-st-section--compact' : ''}`}
    >
      <header className="ds-nd-st-section-head">
        <span className="ds-nd-st-section-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div>
          <h3 className="ds-nd-st-section-title">{title}</h3>
          <p className="ds-nd-st-section-desc">{description}</p>
        </div>
      </header>
      <div className="ds-nd-st-section-body">{children}</div>
    </section>
  );
}

function PreviewRow({ label, value, mono, truncate }: { label: string; value: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div className="ds-nd-st-preview-row">
      <span className="ds-nd-st-preview-label">{label}</span>
      <span className={`ds-nd-st-preview-value${mono ? ' font-mono' : ''}${truncate ? ' truncate' : ''}`}>
        {value}
      </span>
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
    <div className="ds-nd-st-limit-card">
      <span className="ds-nd-st-limit-icon" aria-hidden>
        <Icon className="ds-icon ds-icon--sm" />
      </span>
      <div className="min-w-0">
        <p className="ds-nd-st-limit-label">{label}</p>
        <p className="ds-nd-st-limit-value">
          {effective > 0 ? formatResource(effective, 'MiB') : 'Unlimited'}
        </p>
        {overallocate > 0 && value > 0 ? (
          <p className="ds-nd-st-limit-hint">+{overallocate}% overallocate</p>
        ) : null}
      </div>
    </div>
  );
}
