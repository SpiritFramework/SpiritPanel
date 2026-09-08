import type { Prisma } from '@prisma/client';

/** Panel events shown on the node Activity tab (not server runtime events). */
export const NODE_PANEL_ACTIVITY_EVENTS = [
  'admin.node.created',
  'admin.node.updated',
  'admin.node.deleted',
  'admin.node.token_rotated',
  'admin.node.config_downloaded',
  'admin.allocation.created',
  'admin.allocation.updated',
  'admin.allocation.deleted',
  'admin.allocation.bulk_deleted',
] as const;

export type NodePanelActivityEvent = (typeof NODE_PANEL_ACTIVITY_EVENTS)[number];

export function isNodePanelActivityEvent(event: string): event is NodePanelActivityEvent {
  return (NODE_PANEL_ACTIVITY_EVENTS as readonly string[]).includes(event);
}

export function nodePanelActivityWhere(nodeId: string): Prisma.ActivityLogWhereInput {
  return {
    nodeId,
    event: { in: [...NODE_PANEL_ACTIVITY_EVENTS] },
  };
}

const NODE_SETTING_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  locationId: 'Location',
  fqdn: 'FQDN',
  scheme: 'Scheme',
  behindProxy: 'Behind proxy',
  maintenanceMode: 'Maintenance mode',
  memory: 'Memory limit',
  memoryOverallocate: 'Memory overallocate',
  disk: 'Disk limit',
  diskOverallocate: 'Disk overallocate',
  daemonListen: 'Daemon port',
  daemonSftp: 'SFTP port',
  daemonBase: 'Data directory',
  uploadSize: 'Upload limit',
  publicIp: 'Public IP',
  domainBase: 'Domain base',
  cloudflareZoneId: 'Cloudflare zone',
};

const NODE_SETTING_KEYS = new Set(Object.keys(NODE_SETTING_LABELS));

export function describeNodeSettingChanges(changes: Record<string, unknown>): string {
  const keys = Object.keys(changes).filter((k) => NODE_SETTING_KEYS.has(k));
  if (keys.length === 0) return 'Updated node settings';
  if (keys.length === 1) {
    const label = NODE_SETTING_LABELS[keys[0]] ?? keys[0];
    return `Updated ${label}`;
  }
  const preview = keys
    .slice(0, 3)
    .map((k) => NODE_SETTING_LABELS[k] ?? k)
    .join(', ');
  return `Updated ${keys.length} settings (${preview}${keys.length > 3 ? '…' : ''})`;
}

export function sanitizeNodeActivityProperties(
  event: string,
  properties: unknown,
): Record<string, unknown> | null {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return null;
  const raw = properties as Record<string, unknown>;

  if (event === 'admin.node.updated') {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (NODE_SETTING_KEYS.has(key)) filtered[key] = value;
    }
    return Object.keys(filtered).length > 0 ? filtered : null;
  }

  if (event === 'admin.allocation.created' || event === 'admin.allocation.bulk_deleted') {
    const out: Record<string, unknown> = {};
    if (typeof raw.ip === 'string') out.ip = raw.ip;
    if (Array.isArray(raw.ports)) out.ports = raw.ports;
    if (typeof raw.deleted === 'number') out.deleted = raw.deleted;
    if (typeof raw.skippedAssigned === 'number') out.skippedAssigned = raw.skippedAssigned;
    return Object.keys(out).length > 0 ? out : null;
  }

  if (event === 'admin.allocation.updated') {
    const out: Record<string, unknown> = {};
    if (raw.alias !== undefined) out.alias = raw.alias;
    if (raw.notes !== undefined) out.notes = raw.notes;
    return Object.keys(out).length > 0 ? out : null;
  }

  if (event === 'admin.node.created' && typeof raw.fqdn === 'string') {
    return { fqdn: raw.fqdn };
  }

  return null;
}
