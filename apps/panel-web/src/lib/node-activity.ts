import type { ActivityLogEntry } from './api';

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

function formatSettingValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'cleared';
  if (typeof value === 'boolean') return value ? 'enabled' : 'disabled';
  if (key === 'memory' || key === 'disk' || key === 'memoryOverallocate' || key === 'diskOverallocate') {
    return `${value} MiB`;
  }
  if (key === 'uploadSize') return `${value} MB`;
  return String(value);
}

export function getNodeActivityChangeTags(
  entry: ActivityLogEntry & { properties?: Record<string, unknown> | null },
): string[] {
  const props = entry.properties;
  if (!props) return [];

  if (entry.event === 'admin.node.updated') {
    return Object.entries(props).map(([key, value]) => {
      const label = NODE_SETTING_LABELS[key] ?? key;
      return `${label}: ${formatSettingValue(key, value)}`;
    });
  }

  if (entry.event === 'admin.allocation.created' && Array.isArray(props.ports)) {
    const ip = typeof props.ip === 'string' ? props.ip : '0.0.0.0';
    const ports = props.ports as unknown[];
    if (ports.length <= 4) {
      return ports.map((p) => `${ip}:${p}`);
    }
    return [`${ip} · ${ports.length} ports`];
  }

  if (entry.event === 'admin.allocation.updated') {
    const tags: string[] = [];
    if (props.alias !== undefined) {
      tags.push(`Alias: ${props.alias === null || props.alias === '' ? 'cleared' : String(props.alias)}`);
    }
    if (props.notes !== undefined) {
      tags.push(`Notes: ${props.notes === null || props.notes === '' ? 'cleared' : String(props.notes)}`);
    }
    return tags;
  }

  if (entry.event === 'admin.allocation.bulk_deleted' && typeof props.deleted === 'number') {
    return [`${props.deleted} port(s) removed`];
  }

  if (entry.event === 'admin.node.created' && typeof props.fqdn === 'string') {
    return [props.fqdn];
  }

  return [];
}

export type NodeActivityCategory = 'settings' | 'config' | 'network' | 'lifecycle';

export function getNodeActivityCategory(event: string): NodeActivityCategory {
  if (event === 'admin.node.config_downloaded' || event === 'admin.node.token_rotated') return 'config';
  if (event.startsWith('admin.allocation.')) return 'network';
  if (event === 'admin.node.created' || event === 'admin.node.deleted') return 'lifecycle';
  return 'settings';
}

const CATEGORY_LABELS: Record<NodeActivityCategory, string> = {
  settings: 'Settings',
  config: 'FeatherWings',
  network: 'Allocations',
  lifecycle: 'Lifecycle',
};

export function getNodeActivityCategoryLabel(category: NodeActivityCategory): string {
  return CATEGORY_LABELS[category];
}
