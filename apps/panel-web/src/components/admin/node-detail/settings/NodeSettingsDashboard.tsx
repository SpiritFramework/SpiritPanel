import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ClipboardCopy,
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
import { NodeSettingsUsageSnapshot } from './NodeSettingsUsageSnapshot';
import { formatResource } from '../../../../lib/server-theme';
import { AdminSection } from '../../primitives';

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
  copyJoinData: () => Promise<void>;
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
    copyJoinData,
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

  const memory = form.memory ?? detail.memory;
  const memoryOverallocate = form.memoryOverallocate ?? detail.memoryOverallocate;
  const disk = form.disk ?? detail.disk;
  const diskOverallocate = form.diskOverallocate ?? detail.diskOverallocate;
  const effectiveMemory = memory > 0 ? memory + Math.floor((memory * memoryOverallocate) / 100) : 0;
  const effectiveDisk = disk > 0 ? disk + Math.floor((disk * diskOverallocate) / 100) : 0;

  return (
    <div className="ds-nd-st">
      {/* Identity */}
      <SettingsBlock
        tone="identity"
        icon={Server}
        eyebrow="Node profile"
        title="Identity"
        description="Display name, region, and deployment availability"
      >
        <div className="ds-nd-st-identity">
          <div className="ds-nd-st-identity-top">
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
                <option value={detail.location.id}>{formatLocationLabel(detail.location)}</option>
              )}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {formatLocationLabel(location)}
                </option>
              ))}
            </Select>
            <button
              type="button"
              className={`ds-nd-st-maint${maintenanceMode ? ' ds-nd-st-maint--on' : ''}`}
              onClick={() => setForm({ ...form, maintenanceMode: !maintenanceMode })}
            >
              <span className="ds-nd-st-maint-icon" aria-hidden>
                <Wrench className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-nd-st-maint-copy">
                <span className="ds-nd-st-maint-label">Maintenance</span>
                <span className="ds-nd-st-maint-hint">
                  {maintenanceMode ? 'Deployments paused' : 'Block new deployments'}
                </span>
              </span>
              <span className={`ds-nd-st-toggle${maintenanceMode ? ' ds-nd-st-toggle--on' : ''}`} aria-hidden>
                <span className="ds-nd-st-toggle-knob" />
              </span>
            </button>
          </div>
          <Textarea
            label="Description"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Optional notes for your team"
          />
        </div>
      </SettingsBlock>

      {/* Connection */}
      <SettingsBlock
        tone="connection"
        icon={Globe}
        eyebrow="Reachability"
        title="Connection"
        description="How the panel reaches Wings on this host"
      >
        <div className="ds-nd-st-connection">
          <div className="ds-nd-st-connection-form">
            <div className="ds-nd-st-fieldset">
              <p className="ds-nd-st-fieldset-label">Host</p>
              <div className="ds-nd-st-fields">
                <Input
                  label="FQDN"
                  value={form.fqdn ?? ''}
                  onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                  required
                  hint="Domain or IP for the daemon"
                />
                <Input
                  label="Public IP"
                  value={form.publicIp ?? ''}
                  onChange={(e) => setForm({ ...form, publicIp: e.target.value })}
                  placeholder="203.0.113.10"
                  hint="For Cloudflare A/AAAA when allocations bind 0.0.0.0"
                />
              </div>
            </div>

            <div className="ds-nd-st-fieldset">
              <p className="ds-nd-st-fieldset-label">TLS & proxy</p>
              <div className="ds-nd-st-choice-grid">
                <ChoiceGroup
                  label="Communicate over SSL"
                  value={scheme}
                  onChange={(value) => setForm({ ...form, scheme: value as 'http' | 'https' })}
                  options={[
                    { value: 'https', label: 'SSL' },
                    { value: 'http', label: 'HTTP' },
                  ]}
                />
                <ChoiceGroup
                  label="Behind proxy"
                  value={behindProxy ? 'yes' : 'no'}
                  onChange={(value) => setForm({ ...form, behindProxy: value === 'yes' })}
                  options={[
                    { value: 'no', label: 'Direct' },
                    { value: 'yes', label: 'Proxied' },
                  ]}
                  hint="Cloudflare or nginx terminating TLS"
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
            </div>

            <div className="ds-nd-st-fieldset">
              <p className="ds-nd-st-fieldset-label">Daemon ports</p>
              <div className="ds-nd-st-fields">
                <Input
                  label="API port"
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
            </div>

            <div className="ds-nd-st-fieldset">
              <p className="ds-nd-st-fieldset-label">Domains (optional)</p>
              <div className="ds-nd-st-fields">
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
                  hint="Only when this node’s base domain is in a different zone"
                />
              </div>
            </div>
          </div>

          <aside className="ds-nd-st-connection-preview" aria-label="Live connection preview">
            <p className="ds-nd-st-connection-preview-eyebrow">Live preview</p>
            <p className="ds-nd-st-connection-preview-title">Endpoints</p>
            <div className="ds-nd-st-connection-preview-rows">
              <div className="ds-nd-st-connection-preview-row">
                <span>Panel API</span>
                <code>
                  {scheme}://{fqdn}:{apiPort}
                </code>
              </div>
              <div className="ds-nd-st-connection-preview-row">
                <span>SFTP</span>
                <code>
                  {fqdn}:{sftpPort}
                </code>
              </div>
            </div>
            <div className="ds-nd-st-dock-tags">
              <span className="ds-nd-tag">{scheme.toUpperCase()}</span>
              {behindProxy ? <span className="ds-nd-tag">Proxied</span> : <span className="ds-nd-tag">Direct</span>}
            </div>
          </aside>
        </div>
      </SettingsBlock>

      {/* Capacity */}
      <SettingsBlock
        tone="capacity"
        icon={SlidersHorizontal}
        eyebrow="Resources"
        title="Capacity"
        description="Assigned usage, node limits, and host data path"
        badge={
          <span className="ds-nd-st-capacity-badge">
            {effectiveMemory > 0 ? formatResource(effectiveMemory, 'MiB') : '∞'} /{' '}
            {effectiveDisk > 0 ? formatResource(effectiveDisk, 'MiB') : '∞'}
          </span>
        }
      >
        {detail.capacity ? (
          <div className="ds-nd-st-usage-wrap">
            <NodeSettingsUsageSnapshot capacity={detail.capacity} liveUsage={detail.liveUsage} />
          </div>
        ) : null}

        <div className="ds-nd-st-capacity-grid">
          <div className="ds-nd-st-capacity-card">
            <div className="ds-nd-st-capacity-card-head">
              <span className="ds-nd-st-capacity-card-icon" aria-hidden>
                <MemoryStick className="h-3.5 w-3.5" />
              </span>
              <p className="ds-nd-st-capacity-card-title">Memory</p>
              <span className="ds-nd-st-capacity-card-eff">
                {effectiveMemory > 0 ? formatResource(effectiveMemory, 'MiB') : 'Unlimited'}
              </span>
            </div>
            <div className="ds-nd-st-fields">
              <Input
                label="Total (MB)"
                type="number"
                value={String(form.memory ?? '')}
                onChange={(e) => setForm({ ...form, memory: Number(e.target.value) })}
                hint="0 = unlimited"
              />
              <Input
                label="Overallocate (%)"
                type="number"
                value={String(form.memoryOverallocate ?? '')}
                onChange={(e) => setForm({ ...form, memoryOverallocate: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="ds-nd-st-capacity-card">
            <div className="ds-nd-st-capacity-card-head">
              <span className="ds-nd-st-capacity-card-icon" aria-hidden>
                <HardDrive className="h-3.5 w-3.5" />
              </span>
              <p className="ds-nd-st-capacity-card-title">Disk</p>
              <span className="ds-nd-st-capacity-card-eff">
                {effectiveDisk > 0 ? formatResource(effectiveDisk, 'MiB') : 'Unlimited'}
              </span>
            </div>
            <div className="ds-nd-st-fields">
              <Input
                label="Total (MB)"
                type="number"
                value={String(form.disk ?? '')}
                onChange={(e) => setForm({ ...form, disk: Number(e.target.value) })}
                hint="0 = unlimited"
              />
              <Input
                label="Overallocate (%)"
                type="number"
                value={String(form.diskOverallocate ?? '')}
                onChange={(e) => setForm({ ...form, diskOverallocate: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="ds-nd-st-fieldset">
          <p className="ds-nd-st-fieldset-label">Host path & uploads</p>
          <div className="ds-nd-st-fields">
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
        </div>
      </SettingsBlock>

      {/* Wings */}
      <SettingsBlock
        tone="wings"
        icon={Shield}
        eyebrow="Daemon"
        title="Wings"
        description="Daemon credentials and config.yml behavior"
        actions={
          <div className="ds-nd-toolstrip ds-nd-toolstrip--compact" role="group" aria-label="Daemon tools">
            <button type="button" className="ds-nd-tool-btn" onClick={() => void copyJoinData()}>
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              {copied ? 'Copied' : 'Join-data'}
            </button>
            <button type="button" className="ds-nd-tool-btn" onClick={downloadConfig}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Config
            </button>
            <button type="button" className="ds-nd-tool-btn" onClick={() => void copyText(detail.daemonTokenId)}>
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
              Token
            </button>
            {!confirmRotate ? (
              <button type="button" className="ds-nd-tool-btn" onClick={() => setConfirmRotate(true)}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Rotate
              </button>
            ) : null}
          </div>
        }
      >
        <div className="ds-nd-st-wings">
          <div className="ds-nd-st-wings-meta">
            <div className="ds-nd-st-wings-meta-item">
              <span>Installed</span>
              <strong>{wingsVersion ?? (detail.online ? 'Connected' : 'Offline')}</strong>
            </div>
            <div className="ds-nd-st-wings-meta-item ds-nd-st-wings-meta-item--wide">
              <span>Token ID</span>
              <code title={detail.daemonTokenId}>{detail.daemonTokenId || '—'}</code>
            </div>
          </div>

          {confirmRotate ? (
            <div className="ds-nd-st-confirm ds-nd-st-confirm--warn">
              <p>Rotate daemon token? Wings will need the new config.</p>
              <div className="ds-nd-st-confirm-actions">
                <Button type="button" size="sm" disabled={saving} onClick={() => void rotateToken()}>
                  Confirm rotate
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRotate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <div className="ds-nd-st-wings-options">
            <ChoiceGroup
              label="Crash detection"
              value={(form.crashDetectionEnabled ?? true) ? 'yes' : 'no'}
              onChange={(value) => setForm({ ...form, crashDetectionEnabled: value === 'yes' })}
              options={[
                { value: 'yes', label: 'Restart crashed' },
                { value: 'no', label: 'Leave stopped' },
              ]}
              hint="Node-wide. Servers can still disable their own restart."
            />
            <ChoiceGroup
              label="Install exit code"
              value={(form.checkInstallExitCode ?? false) ? 'yes' : 'no'}
              onChange={(value) => setForm({ ...form, checkInstallExitCode: value === 'yes' })}
              options={[
                { value: 'no', label: 'Ignore non-zero' },
                { value: 'yes', label: 'Fail on non-zero' },
              ]}
              hint="Off keeps finished installs marked successful."
            />
            <Input
              label="Docker CPU shares"
              type="number"
              value={String(form.cpuShares ?? 1024)}
              onChange={(e) => setForm({ ...form, cpuShares: Number(e.target.value) })}
              hint="1024 default · 0 = engine default"
            />
          </div>

          <p className="ds-nd-st-wings-footnote">
            Written into <code>config.yml</code> — replace the node config and restart FeatherWings to apply.
          </p>
        </div>
      </SettingsBlock>

      {/* Danger */}
      <section className="ds-nd-st-danger" aria-labelledby="node-danger-heading">
        <div className="ds-nd-st-danger-inner">
          <header className="ds-nd-st-danger-head">
            <span className="ds-nd-st-danger-icon" aria-hidden>
              <Trash2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="ds-nd-st-danger-eyebrow">Irreversible</p>
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
          <button type="button" className="ds-nd-tool-btn" onClick={resetForm} disabled={!hasChanges || saving}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
          <Button type="submit" size="sm" disabled={saving || !hasChanges}>
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsBlock({
  tone,
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
}: {
  tone: 'identity' | 'connection' | 'capacity' | 'wings';
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminSection
      tone={tone}
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={badge}
      actions={actions}
      className="ds-nd-st-block"
    >
      {children}
    </AdminSection>
  );
}

function ChoiceGroup({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="ds-nd-st-choice">
      <span className="ds-nd-st-choice-label">{label}</span>
      <div className="ds-nd-st-choice-options" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`ds-nd-st-choice-opt${value === option.value ? ' ds-nd-st-choice-opt--on' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className="ds-nd-st-choice-hint">{hint}</p> : null}
    </div>
  );
}
