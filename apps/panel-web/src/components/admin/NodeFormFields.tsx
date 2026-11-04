import {
  AlertTriangle,
  FolderOpen,
  Gauge,
  Globe,
  HardDrive,
  MemoryStick,
  Server,
  Wrench,
} from 'lucide-react';
import type { AdminLocationSummary } from '../../lib/api';
import { formatLocationLabel } from '../LocationFlag';
import type { NodeFormState } from '../../lib/node-admin';
import { formatResource } from '../../lib/server-theme';
import { Input, Select, Textarea } from '../Layout';
import { AdminChoiceGroup, AdminSection } from './primitives';

export function NodeFormFields({
  form,
  setForm,
  locations,
}: {
  form: NodeFormState;
  setForm: (next: NodeFormState) => void;
  locations: AdminLocationSummary[];
}) {
  const patch = (partial: Partial<NodeFormState>) => setForm({ ...form, ...partial });
  const panelUsesSsl = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const memory = Number(form.memory) || 0;
  const memoryOverallocate = Number(form.memoryOverallocate) || 0;
  const disk = Number(form.disk) || 0;
  const diskOverallocate = Number(form.diskOverallocate) || 0;
  const effectiveMemory = memory > 0 ? memory + Math.floor((memory * memoryOverallocate) / 100) : 0;
  const effectiveDisk = disk > 0 ? disk + Math.floor((disk * diskOverallocate) / 100) : 0;

  return (
    <div className="ds-nd-create-form">
      <AdminSection
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
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              required
              placeholder="US East 1"
            />
            <Select
              label="Location"
              value={form.locationId}
              onChange={(e) => patch({ locationId: e.target.value })}
              required
            >
              <option value="">Select a region</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {formatLocationLabel(location)}
                </option>
              ))}
            </Select>
            <button
              type="button"
              className={`ds-nd-st-maint${form.maintenanceMode ? ' ds-nd-st-maint--on' : ''}`}
              onClick={() => patch({ maintenanceMode: !form.maintenanceMode })}
            >
              <span className="ds-nd-st-maint-icon" aria-hidden>
                <Wrench className="ds-icon ds-icon--sm" />
              </span>
              <span className="ds-nd-st-maint-copy">
                <span className="ds-nd-st-maint-label">Maintenance</span>
                <span className="ds-nd-st-maint-hint">
                  {form.maintenanceMode ? 'Deployments paused' : 'Block new deployments'}
                </span>
              </span>
              <span
                className={`ds-nd-st-toggle${form.maintenanceMode ? ' ds-nd-st-toggle--on' : ''}`}
                aria-hidden
              >
                <span className="ds-nd-st-toggle-knob" />
              </span>
            </button>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={2}
            placeholder="Optional notes for your team"
          />
        </div>
      </AdminSection>

      <AdminSection
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
                  value={form.fqdn}
                  onChange={(e) => patch({ fqdn: e.target.value })}
                  required
                  placeholder="node.example.com"
                  hint="Domain or IP for the daemon"
                />
              </div>
            </div>

            <div className="ds-nd-st-fieldset">
              <p className="ds-nd-st-fieldset-label">TLS & proxy</p>
              <div className="ds-nd-st-choice-grid">
                <AdminChoiceGroup
                  label="Communicate over SSL"
                  value={form.scheme}
                  onChange={(value) => patch({ scheme: value })}
                  options={[
                    { value: 'https', label: 'SSL' },
                    { value: 'http', label: 'HTTP' },
                  ]}
                />
                <AdminChoiceGroup
                  label="Behind proxy"
                  value={form.behindProxy ? 'yes' : 'no'}
                  onChange={(value) => patch({ behindProxy: value === 'yes' })}
                  options={[
                    { value: 'no', label: 'Direct' },
                    { value: 'yes', label: 'Proxied' },
                  ]}
                  hint="Cloudflare or nginx terminating TLS"
                />
              </div>
              {panelUsesSsl && form.scheme === 'http' ? (
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
                  value={form.daemonListen}
                  onChange={(e) => patch({ daemonListen: e.target.value })}
                  hint="Panel → Wings"
                />
                <Input
                  label="SFTP port"
                  type="number"
                  value={form.daemonSftp}
                  onChange={(e) => patch({ daemonSftp: e.target.value })}
                  hint="File uploads"
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
                  {form.scheme}://{form.fqdn || '…'}:{form.daemonListen || '8080'}
                </code>
              </div>
              <div className="ds-nd-st-connection-preview-row">
                <span>SFTP</span>
                <code>
                  {form.fqdn || '…'}:{form.daemonSftp || '2022'}
                </code>
              </div>
            </div>
            <div className="ds-nd-st-dock-tags">
              <span className="ds-nd-tag">{form.scheme.toUpperCase()}</span>
              <span className="ds-nd-tag">{form.behindProxy ? 'Proxied' : 'Direct'}</span>
              <span className="ds-nd-tag">
                {form.maintenanceMode ? 'Maintenance' : 'Deployable'}
              </span>
            </div>
          </aside>
        </div>
      </AdminSection>

      <AdminSection
        tone="capacity"
        icon={Gauge}
        eyebrow="Resources"
        title="Capacity"
        description="Node limits, overallocate, and host data path"
        badge={
          <span className="ds-nd-st-capacity-badge">
            {effectiveMemory > 0 ? formatResource(effectiveMemory, 'MiB') : '∞'} /{' '}
            {effectiveDisk > 0 ? formatResource(effectiveDisk, 'MiB') : '∞'}
          </span>
        }
      >
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
                min={0}
                value={form.memory}
                onChange={(e) => patch({ memory: e.target.value })}
                hint="0 = unlimited"
              />
              <Input
                label="Overallocate (%)"
                type="number"
                min={0}
                value={form.memoryOverallocate}
                onChange={(e) => patch({ memoryOverallocate: e.target.value })}
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
                min={0}
                value={form.disk}
                onChange={(e) => patch({ disk: e.target.value })}
                hint="0 = unlimited"
              />
              <Input
                label="Overallocate (%)"
                type="number"
                min={0}
                value={form.diskOverallocate}
                onChange={(e) => patch({ diskOverallocate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="ds-nd-create-path-row">
          <Input
            label="Data directory"
            value={form.daemonBase}
            onChange={(e) => patch({ daemonBase: e.target.value })}
            className="font-mono text-xs"
            hint="Host path for server volumes"
          />
          <Input
            label="Max upload (MB)"
            type="number"
            min={1}
            value={form.uploadSize}
            onChange={(e) => patch({ uploadSize: e.target.value })}
          />
        </div>
        <p className="ds-nd-create-path-hint">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Defaults match FeatherWings. Change only if your host uses a custom volume path.
        </p>
      </AdminSection>
    </div>
  );
}
