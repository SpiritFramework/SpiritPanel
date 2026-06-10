export type ServerProvisionFormState = {
  ownerId: string;
  nodeId: string;
  eggId: string;
  allocationId: string;
  name: string;
  memory: string;
  disk: string;
  cpu: string;
  allocationLimit: string;
  backupLimit: string;
  databaseLimit: string;
};

export const DEFAULT_SERVER_PROVISION_FORM: ServerProvisionFormState = {
  ownerId: '',
  nodeId: '',
  eggId: '',
  allocationId: '',
  name: '',
  memory: '2048',
  disk: '10240',
  cpu: '100',
  allocationLimit: '0',
  backupLimit: '0',
  databaseLimit: '0',
};

export const SERVER_PROVISION_GRADIENT =
  'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 55%, #312e81) 48%, #0f172a 100%)';

export function serverProvisionProgress(
  form: ServerProvisionFormState,
  options: { autoAssign: boolean; hasFreeAllocation: boolean },
) {
  const steps = [
    { id: 'owner', label: 'Owner & name', done: Boolean(form.ownerId && form.name.trim()) },
    { id: 'egg', label: 'Software (egg)', done: Boolean(form.eggId) },
    {
      id: 'node',
      label: 'Node & port',
      done: Boolean(
        form.nodeId && (options.autoAssign ? options.hasFreeAllocation : form.allocationId),
      ),
    },
    { id: 'resources', label: 'Resources', done: Number(form.memory) >= 0 && Number(form.disk) >= 0 },
  ];

  const ready =
    Boolean(form.ownerId && form.name.trim() && form.eggId && form.nodeId) &&
    Number(form.memory) >= 0 &&
    Number(form.disk) >= 0 &&
    (options.autoAssign ? options.hasFreeAllocation : Boolean(form.allocationId));

  return { steps, ready, done: steps.filter((s) => s.done).length, total: steps.length };
}

export function serverProvisionPayload(
  form: ServerProvisionFormState,
  variableValues: Record<string, string>,
  autoAssign: boolean,
) {
  const payload: Record<string, unknown> = {
    ownerId: form.ownerId,
    nodeId: form.nodeId,
    eggId: form.eggId,
    name: form.name.trim(),
    memory: Number(form.memory),
    disk: Number(form.disk),
    cpu: Number(form.cpu),
    allocationLimit: Number(form.allocationLimit),
    backupLimit: Number(form.backupLimit),
    databaseLimit: Number(form.databaseLimit),
    environment: variableValues,
  };

  if (!autoAssign && form.allocationId) {
    payload.allocationId = form.allocationId;
  } else if (!autoAssign && !form.allocationId) {
    throw new Error('Select an allocation or enable auto-assign');
  }

  return payload;
}
