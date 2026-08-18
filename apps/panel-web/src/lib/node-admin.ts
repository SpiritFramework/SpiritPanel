import type { AdminNodeDetail } from './api';

export type NodeFormState = {
  locationId: string;
  name: string;
  description: string;
  fqdn: string;
  scheme: string;
  behindProxy: boolean;
  maintenanceMode: boolean;
  memory: string;
  memoryOverallocate: string;
  disk: string;
  diskOverallocate: string;
  daemonListen: string;
  daemonSftp: string;
  daemonBase: string;
  uploadSize: string;
};

export const DEFAULT_NODE_FORM: NodeFormState = {
  locationId: '',
  name: '',
  description: '',
  fqdn: '',
  scheme: 'https',
  behindProxy: false,
  maintenanceMode: false,
  memory: '0',
  memoryOverallocate: '0',
  disk: '0',
  diskOverallocate: '0',
  daemonListen: '8080',
  daemonSftp: '2022',
  daemonBase: '/var/lib/pterodactyl/volumes',
  uploadSize: '100',
};

export function nodeFormToPayload(form: NodeFormState) {
  return {
    locationId: form.locationId,
    name: form.name.trim(),
    description: form.description.trim(),
    fqdn: form.fqdn.trim(),
    scheme: form.scheme,
    behindProxy: form.behindProxy,
    maintenanceMode: form.maintenanceMode,
    memory: Number(form.memory) || 0,
    memoryOverallocate: Number(form.memoryOverallocate) || 0,
    disk: Number(form.disk) || 0,
    diskOverallocate: Number(form.diskOverallocate) || 0,
    daemonListen: Number(form.daemonListen) || 8080,
    daemonSftp: Number(form.daemonSftp) || 2022,
    daemonBase: form.daemonBase.trim(),
    uploadSize: Number(form.uploadSize) || 100,
  };
}

export function nodeHeroGradient(detail: Pick<AdminNodeDetail, 'online' | 'maintenanceMode'>): string {
  if (detail.maintenanceMode) {
    return 'linear-gradient(135deg, #d97706 0%, #92400e 42%, #1c1917 100%)';
  }
  if (detail.online) {
    return 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 40%, #0c4a6e 100%)';
  }
  return 'linear-gradient(135deg, #64748b 0%, #475569 42%, #0f172a 100%)';
}

export const NODE_CREATE_GRADIENT =
  'linear-gradient(135deg, #2563eb 0%, #4f46e5 48%, #1e1b4b 100%)';

export function parseWingsSystem(system: Record<string, unknown> | null) {
  if (!system) return null;
  const read = (key: string) => {
    const v = system[key];
    return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
  };
  const docker = system.docker;
  const dockerVersion =
    docker && typeof docker === 'object' && docker !== null && 'version' in docker
      ? String((docker as { version?: unknown }).version ?? '')
      : null;

  return {
    version: read('version'),
    architecture: read('architecture'),
    cpuCount: read('cpu_count'),
    kernel: read('kernel_version'),
    os: read('os'),
    dockerVersion,
  };
}

export function nodeSetupProgress(form: NodeFormState) {
  const steps = [
    { id: 'location', label: 'Location', done: Boolean(form.locationId) },
    { id: 'identity', label: 'Name & FQDN', done: Boolean(form.name.trim() && form.fqdn.trim()) },
    { id: 'network', label: 'Network', done: Boolean(form.scheme) },
    { id: 'capacity', label: 'Capacity', done: true },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, ready: form.locationId && form.name.trim() && form.fqdn.trim() };
}
