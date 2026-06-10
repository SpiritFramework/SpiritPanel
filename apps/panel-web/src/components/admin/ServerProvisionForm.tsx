import { useEffect, useMemo, useState } from 'react';
import { Egg, Gauge, Server, Zap } from 'lucide-react';
import {
  api,
  type AdminEggDetail,
  type AdminEggSummary,
  type AdminNodeSummary,
  type AdminUserSummary,
} from '../../lib/api';
import { formatAllocationAddress } from '../../lib/allocation';
import {
  DEFAULT_SERVER_PROVISION_FORM,
  serverProvisionPayload,
  type ServerProvisionFormState,
} from '../../lib/server-provision';
import { AdminSettingsPanel } from '../AdminDetailLayout';
import { Button, Input, Select } from '../Layout';
import { Checkbox } from '../Checkbox';
import { Spinner } from '../ui';

type AllocationRow = {
  id: string;
  ip: string;
  port: number;
  alias?: string | null;
  assigned: boolean;
};

export function ServerProvisionForm({
  onCreated,
  onProgressChange,
}: {
  onCreated: (serverId: string) => void;
  onProgressChange?: (info: {
    form: ServerProvisionFormState;
    autoAssign: boolean;
    freeAllocations: number;
    eggName: string | null;
    nodeName: string | null;
  }) => void;
}) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [nodes, setNodes] = useState<AdminNodeSummary[]>([]);
  const [eggs, setEggs] = useState<AdminEggSummary[]>([]);
  const [selectedEgg, setSelectedEgg] = useState<AdminEggDetail | null>(null);
  const [loadingEgg, setLoadingEgg] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [autoAssign, setAutoAssign] = useState(true);
  const [form, setForm] = useState<ServerProvisionFormState>(DEFAULT_SERVER_PROVISION_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (partial: Partial<ServerProvisionFormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const selectedNode = nodes.find((n) => n.id === form.nodeId);
  const freeAllocations = useMemo(
    () => allocations.filter((a) => !a.assigned).sort((a, b) => a.port - b.port),
    [allocations],
  );

  useEffect(() => {
    Promise.all([api.admin.users(), api.admin.nodes(), api.admin.eggs()])
      .then(([userRows, nodeRows, eggRows]) => {
        setUsers(userRows);
        setNodes(nodeRows);
        setEggs(eggRows);
        if (userRows.length === 1) patch({ ownerId: userRows[0]!.id });
        if (nodeRows.length === 1) patch({ nodeId: nodeRows[0]!.id });
      })
      .catch(() => setError('Failed to load provisioning options'))
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (form.nodeId) {
      api.admin
        .allocations(form.nodeId)
        .then((rows) => setAllocations(rows as AllocationRow[]))
        .catch(() => setAllocations([]));
    } else {
      setAllocations([]);
    }
  }, [form.nodeId]);

  useEffect(() => {
    if (!autoAssign || freeAllocations.length === 0) return;
    const first = freeAllocations[0];
    if (first && form.allocationId !== first.id) {
      patch({ allocationId: first.id });
    }
  }, [autoAssign, freeAllocations, form.allocationId]);

  useEffect(() => {
    if (!form.eggId) {
      setSelectedEgg(null);
      setVariableValues({});
      return;
    }

    setLoadingEgg(true);
    api.admin
      .egg(form.eggId)
      .then((egg) => {
        setSelectedEgg(egg);
        setVariableValues(Object.fromEntries(egg.variables.map((v) => [v.envVariable, v.defaultValue])));
      })
      .catch(() => {
        setSelectedEgg(null);
        setVariableValues({});
      })
      .finally(() => setLoadingEgg(false));
  }, [form.eggId]);

  useEffect(() => {
    onProgressChange?.({
      form,
      autoAssign,
      freeAllocations: freeAllocations.length,
      eggName: selectedEgg?.name ?? null,
      nodeName: selectedNode?.name ?? null,
    });
  }, [form, autoAssign, freeAllocations.length, selectedEgg?.name, selectedNode?.name, onProgressChange]);

  const eggsByNest = useMemo(() => {
    const map = new Map<string, AdminEggSummary[]>();
    for (const egg of eggs.filter((e) => e.enabled)) {
      const list = map.get(egg.nest.name) ?? [];
      list.push(egg);
      map.set(egg.nest.name, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [eggs]);

  const disabledEggCount = eggs.filter((e) => !e.enabled).length;

  function formatAllocLabel(alloc: AllocationRow) {
    const fqdn = selectedNode?.fqdn ?? alloc.ip;
    return formatAllocationAddress(alloc, { fqdn });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.admin.createServer(serverProvisionPayload(form, variableValues, autoAssign));
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create server');
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const canSubmit = Boolean(
    form.ownerId &&
      form.name.trim() &&
      form.eggId &&
      form.nodeId &&
      (autoAssign ? freeAllocations.length > 0 : form.allocationId),
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <AdminSettingsPanel
        title="Server details"
        description="Display name and account that owns this server"
        icon={Server}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Server name"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            required
            placeholder="My Minecraft Server"
          />
          <Select
            label="Owner"
            value={form.ownerId}
            onChange={(e) => patch({ ownerId: e.target.value })}
            required
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.email})
              </option>
            ))}
          </Select>
        </div>
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Software"
        description="Egg template determines install script, startup command, and environment"
        icon={Egg}
      >
        <Select
          label="Egg"
          value={form.eggId}
          onChange={(e) => patch({ eggId: e.target.value })}
          required
          hint={
            disabledEggCount > 0
              ? `${disabledEggCount} disabled egg${disabledEggCount === 1 ? '' : 's'} hidden`
              : 'Choose the service template to install'
          }
        >
          <option value="">Select egg</option>
          {eggsByNest.map(([nestName, nestEggs]) => (
            <optgroup key={nestName} label={nestName}>
              {nestEggs.map((egg) => (
                <option key={egg.id} value={egg.id}>
                  {egg.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        {loadingEgg && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
            <Spinner className="h-3.5 w-3.5" />
            Loading egg details…
          </div>
        )}

        {selectedEgg && !loadingEgg && (
          <div className="mt-4 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <Egg className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{selectedEgg.name}</p>
                <p className="text-xs text-[var(--muted)]">{selectedEgg.nest.name}</p>
                {selectedEgg.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{selectedEgg.description}</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Startup command
              </p>
              <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[10px] leading-relaxed text-[var(--muted)]">
                {selectedEgg.startup}
              </pre>
            </div>

            {selectedEgg.variables.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Environment variables
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedEgg.variables.map((variable) => (
                    <div key={variable.id}>
                      <Input
                        label={`${variable.name} (${variable.envVariable})`}
                        value={variableValues[variable.envVariable] ?? ''}
                        onChange={(e) =>
                          setVariableValues((prev) => ({
                            ...prev,
                            [variable.envVariable]: e.target.value,
                          }))
                        }
                      />
                      {variable.description && (
                        <p className="mt-1 text-[10px] text-[var(--muted)]">{variable.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">This egg has no environment variables.</p>
            )}
          </div>
        )}
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Infrastructure"
        description="Node, primary port, and feature limits for this server"
        icon={Gauge}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Node"
            value={form.nodeId}
            onChange={(e) => patch({ nodeId: e.target.value, allocationId: '' })}
            required
          >
            <option value="">Select node</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.location.short})
                {n.maintenanceMode ? ' · maintenance' : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Allocation limit"
            type="number"
            min={0}
            value={form.allocationLimit}
            onChange={(e) => patch({ allocationLimit: e.target.value })}
            hint="Extra ports (0 = disabled, not unlimited)"
          />
          <Input
            label="Backup limit"
            type="number"
            min={0}
            value={form.backupLimit}
            onChange={(e) => patch({ backupLimit: e.target.value })}
            hint="Max backups (0 = disabled)"
          />
          <Input
            label="Database limit"
            type="number"
            min={0}
            value={form.databaseLimit}
            onChange={(e) => patch({ databaseLimit: e.target.value })}
            hint="Max MySQL databases (0 = disabled)"
          />
        </div>

        <div className="mt-4 space-y-3">
          <Checkbox
            checked={autoAssign}
            onChange={setAutoAssign}
            label="Auto-assign first available port"
            description="Recommended — picks the lowest free allocation on the node"
          />
          {!autoAssign && (
            <Select
              label="Primary allocation"
              value={form.allocationId}
              onChange={(e) => patch({ allocationId: e.target.value })}
              required
              hint={form.nodeId ? `${freeAllocations.length} available on this node` : 'Select a node first'}
            >
              <option value="">Select port</option>
              {freeAllocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAllocLabel(a)} (bind {a.ip}:{a.port})
                </option>
              ))}
            </Select>
          )}
          {autoAssign && form.nodeId && (
            <p className="text-xs text-[var(--muted)]">
              {freeAllocations.length > 0
                ? `Will use ${formatAllocLabel(freeAllocations[0]!)}`
                : 'No free allocations on this node — create a port range on the node first.'}
            </p>
          )}
        </div>
      </AdminSettingsPanel>

      <AdminSettingsPanel
        title="Resources"
        description="Memory, disk, and CPU limits enforced by Wings — 0 = unlimited"
        icon={Zap}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Memory (MB)"
            type="number"
            min={0}
            value={form.memory}
            onChange={(e) => patch({ memory: e.target.value })}
            hint="0 = unlimited"
          />
          <Input
            label="Disk (MB)"
            type="number"
            min={0}
            value={form.disk}
            onChange={(e) => patch({ disk: e.target.value })}
            hint="0 = unlimited"
          />
          <Input
            label="CPU limit (%)"
            type="number"
            min={0}
            value={form.cpu}
            onChange={(e) => patch({ cpu: e.target.value })}
            hint="0 = unlimited"
          />
        </div>
      </AdminSettingsPanel>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !canSubmit}>
          <Server className="h-3.5 w-3.5" />
          {saving ? 'Provisioning…' : 'Create & install'}
        </Button>
        {!canSubmit && !saving && (
          <p className="text-xs text-[var(--muted)]">Complete owner, egg, node, and resources to continue.</p>
        )}
      </div>
    </form>
  );
}
