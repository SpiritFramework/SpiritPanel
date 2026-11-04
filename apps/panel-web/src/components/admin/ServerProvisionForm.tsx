import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { Input, Select } from '../Layout';
import { formatLocationLabel } from '../LocationFlag';
import { Spinner } from '../ui';
import { AdminChoiceGroup, AdminSection } from './primitives';
import { AdminFormStatus } from '../AdminDetailLayout';

export const SERVER_PROVISION_FORM_ID = 'admin-server-provision';

type AllocationRow = {
  id: string;
  ip: string;
  port: number;
  alias?: string | null;
  assigned: boolean;
};

export type ServerProvisionProgressInfo = {
  form: ServerProvisionFormState;
  autoAssign: boolean;
  freeAllocations: number;
  eggName: string | null;
  nodeName: string | null;
  ownerName: string | null;
  allocationPreview: string | null;
  saving: boolean;
  error: string;
  canSubmit: boolean;
};

export function ServerProvisionForm({
  onCreated,
  onProgressChange,
}: {
  onCreated: (serverId: string) => void;
  onProgressChange?: (info: ServerProvisionProgressInfo) => void;
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

  const patch = (partial: Partial<ServerProvisionFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const selectedNode = nodes.find((n) => n.id === form.nodeId);
  const selectedOwner = users.find((u) => u.id === form.ownerId);
  const freeAllocations = useMemo(
    () => allocations.filter((a) => !a.assigned).sort((a, b) => a.port - b.port),
    [allocations],
  );

  function formatAllocLabel(alloc: AllocationRow) {
    const fqdn = selectedNode?.fqdn ?? alloc.ip;
    return formatAllocationAddress(alloc, { fqdn });
  }

  const allocationPreview = useMemo(() => {
    if (!form.nodeId) return null;
    if (autoAssign) {
      return freeAllocations[0] ? formatAllocLabel(freeAllocations[0]) : null;
    }
    const selected = freeAllocations.find((a) => a.id === form.allocationId);
    return selected ? formatAllocLabel(selected) : null;
  }, [form.nodeId, form.allocationId, autoAssign, freeAllocations, selectedNode?.fqdn]);

  const canSubmit = Boolean(
    form.ownerId &&
      form.name.trim() &&
      form.eggId &&
      form.nodeId &&
      (autoAssign ? freeAllocations.length > 0 : form.allocationId),
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
        setVariableValues(
          Object.fromEntries(egg.variables.map((v) => [v.envVariable, v.defaultValue])),
        );
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
      ownerName: selectedOwner?.username ?? null,
      allocationPreview,
      saving,
      error,
      canSubmit,
    });
  }, [
    form,
    autoAssign,
    freeAllocations.length,
    selectedEgg?.name,
    selectedNode?.name,
    selectedOwner?.username,
    allocationPreview,
    saving,
    error,
    canSubmit,
    onProgressChange,
  ]);

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.admin.createServer(
        serverProvisionPayload(form, variableValues, autoAssign),
      );
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create server');
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <div className="ds-nd-create-loading">
        <Spinner className="h-7 w-7" />
        <p>Loading provisioning options…</p>
      </div>
    );
  }

  return (
    <form id={SERVER_PROVISION_FORM_ID} onSubmit={submit} className="ds-nd-create-form">
      <AdminSection
        tone="identity"
        icon={Server}
        eyebrow="Server profile"
        title="Identity"
        description="Display name and account that owns this server"
      >
        <div className="ds-nd-st-fields">
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
      </AdminSection>

      <AdminSection
        tone="wings"
        icon={Egg}
        eyebrow="Template"
        title="Software"
        description="Egg template determines install script, startup command, and environment"
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

        {loadingEgg ? (
          <div className="ds-nd-create-inline-loading">
            <Spinner className="h-3.5 w-3.5" />
            Loading egg details…
          </div>
        ) : null}

        {selectedEgg && !loadingEgg ? (
          <div className="ds-srv-create-egg-preview">
            <div className="ds-srv-create-egg-preview-head">
              <span className="ds-srv-create-egg-preview-icon" aria-hidden>
                <Egg className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="ds-srv-create-egg-preview-name">{selectedEgg.name}</p>
                <p className="ds-srv-create-egg-preview-nest">{selectedEgg.nest.name}</p>
                {selectedEgg.description ? (
                  <p className="ds-srv-create-egg-preview-desc">{selectedEgg.description}</p>
                ) : null}
              </div>
            </div>

            <div className="ds-srv-create-egg-preview-block">
              <p className="ds-srv-create-egg-preview-label">Startup command</p>
              <pre className="ds-srv-create-egg-preview-code">{selectedEgg.startup}</pre>
            </div>

            {selectedEgg.variables.length > 0 ? (
              <div className="ds-srv-create-egg-preview-block">
                <p className="ds-srv-create-egg-preview-label">Environment variables</p>
                <div className="ds-nd-st-fields">
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
                      {variable.description ? (
                        <p className="ds-nd-st-choice-hint">{variable.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="ds-nd-st-choice-hint">This egg has no environment variables.</p>
            )}
          </div>
        ) : null}
      </AdminSection>

      <AdminSection
        tone="connection"
        icon={Gauge}
        eyebrow="Placement"
        title="Infrastructure"
        description="Node, primary port, and feature limits for this server"
      >
        <div className="ds-nd-st-fields">
          <Select
            label="Node"
            value={form.nodeId}
            onChange={(e) => patch({ nodeId: e.target.value, allocationId: '' })}
            required
          >
            <option value="">Select node</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({formatLocationLabel(n.location)})
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

        <div className="ds-nd-st-fieldset mt-4">
          <p className="ds-nd-st-fieldset-label">Primary port</p>
          <AdminChoiceGroup
            label="Allocation"
            value={autoAssign ? 'auto' : 'manual'}
            onChange={(value) => setAutoAssign(value === 'auto')}
            options={[
              { value: 'auto', label: 'Auto-assign' },
              { value: 'manual', label: 'Pick port' },
            ]}
            hint="Auto-assign uses the lowest free allocation on the node"
          />
          {!autoAssign ? (
            <Select
              label="Primary allocation"
              value={form.allocationId}
              onChange={(e) => patch({ allocationId: e.target.value })}
              required
              hint={
                form.nodeId
                  ? `${freeAllocations.length} available on this node`
                  : 'Select a node first'
              }
            >
              <option value="">Select port</option>
              {freeAllocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAllocLabel(a)} (bind {a.ip}:{a.port})
                </option>
              ))}
            </Select>
          ) : null}
          {autoAssign && form.nodeId ? (
            <p className="ds-nd-st-choice-hint">
              {freeAllocations.length > 0
                ? `Will use ${formatAllocLabel(freeAllocations[0]!)}`
                : 'No free allocations on this node — create a port range on the node first.'}
            </p>
          ) : null}
        </div>
      </AdminSection>

      <AdminSection
        tone="capacity"
        icon={Zap}
        eyebrow="Limits"
        title="Resources"
        description="Memory, disk, and CPU limits enforced by Wings — 0 = unlimited"
        badge={
          <span className="ds-nd-st-capacity-badge">
            {Number(form.memory) || 0} MB / {Number(form.disk) || 0} MB / {Number(form.cpu) || 0}%
          </span>
        }
      >
        <div className="ds-nd-st-fields ds-srv-create-resources">
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
      </AdminSection>

      <AdminFormStatus error={error || undefined} />
    </form>
  );
}
