import { Cpu, Gauge, Network, Server } from 'lucide-react';
import type { AdminLocationSummary } from '../../lib/api';
import type { NodeFormState } from '../../lib/node-admin';
import { Input, Select } from '../Layout';
import { Checkbox } from '../Checkbox';
import { AdminSettingsPanel } from '../AdminDetailLayout';

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

  return (
    <div className="space-y-5">
      <AdminSettingsPanel
        title="Node identity"
        description="Where this daemon lives and how it appears in the panel"
        icon={Server}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Display name"
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
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.short} — {l.long}
              </option>
            ))}
          </Select>
          <Input
            label="FQDN"
            value={form.fqdn}
            onChange={(e) => patch({ fqdn: e.target.value })}
            required
            placeholder="node.example.com"
            hint="Hostname Wings listens on — use a domain unless you are not using SSL"
          />
          <Select label="Connection scheme" value={form.scheme} onChange={(e) => patch({ scheme: e.target.value })}>
            <option value="http">HTTP (typical for Wings)</option>
            <option value="https">HTTPS</option>
          </Select>
          <div className="sm:col-span-2">
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Optional notes for your team"
            />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <Checkbox
              label="Behind panel reverse proxy"
              description="Enable when nginx on the panel proxies /wings/ to this daemon (required for browser console over HTTPS when Wings listens on HTTP)"
              checked={form.behindProxy}
              onChange={(behindProxy) => patch({ behindProxy })}
            />
            <Checkbox
              label="Maintenance mode"
              description="Prevent new servers from being deployed to this node"
              checked={form.maintenanceMode}
              onChange={(maintenanceMode) => patch({ maintenanceMode })}
            />
          </div>
        </div>
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Resource capacity"
        description="Limits for RAM and disk assigned to servers on this node — 0 means unlimited"
        icon={Gauge}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Total memory (MB)"
            type="number"
            min={0}
            value={form.memory}
            onChange={(e) => patch({ memory: e.target.value })}
            hint="0 = unlimited"
          />
          <Input
            label="Memory overallocate (%)"
            type="number"
            min={0}
            value={form.memoryOverallocate}
            onChange={(e) => patch({ memoryOverallocate: e.target.value })}
            hint="Extra % beyond total RAM"
          />
          <Input
            label="Total disk (MB)"
            type="number"
            min={0}
            value={form.disk}
            onChange={(e) => patch({ disk: e.target.value })}
            hint="0 = unlimited"
          />
          <Input
            label="Disk overallocate (%)"
            type="number"
            min={0}
            value={form.diskOverallocate}
            onChange={(e) => patch({ diskOverallocate: e.target.value })}
          />
        </div>
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Daemon settings"
        description="Ports and paths FeatherWings uses on the host machine"
        icon={Cpu}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Daemon API port"
            type="number"
            value={form.daemonListen}
            onChange={(e) => patch({ daemonListen: e.target.value })}
            hint="Panel → Wings communication"
          />
          <Input
            label="SFTP port"
            type="number"
            value={form.daemonSftp}
            onChange={(e) => patch({ daemonSftp: e.target.value })}
            hint="File uploads from users"
          />
          <Input
            label="Max upload (MB)"
            type="number"
            min={1}
            value={form.uploadSize}
            onChange={(e) => patch({ uploadSize: e.target.value })}
          />
          <Input
            label="Data directory"
            value={form.daemonBase}
            onChange={(e) => patch({ daemonBase: e.target.value })}
            className="font-mono text-xs xl:col-span-2"
            hint="Host path for server volumes"
          />
        </div>
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Network preview"
        description="How clients and the panel will reach this node after creation"
        icon={Network}
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <PreviewRow label="Panel API target" value={`${form.scheme}://${form.fqdn || '…'}:${form.daemonListen || '8080'}`} />
          <PreviewRow label="SFTP endpoint" value={`${form.fqdn || '…'}:${form.daemonSftp || '2022'}`} />
          <PreviewRow label="Proxy mode" value={form.behindProxy ? 'Behind reverse proxy' : 'Direct connection'} />
          <PreviewRow label="Deploy status" value={form.maintenanceMode ? 'Maintenance — no new servers' : 'Accepting deployments'} />
        </dl>
      </AdminSettingsPanel>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 truncate font-mono text-xs">{value}</dd>
    </div>
  );
}
