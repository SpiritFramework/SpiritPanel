import type { AdminNodeDetail, UpdateAdminNodeInput } from '../../../lib/api';

export type NodeDetailTab =
  | 'overview'
  | 'settings'
  | 'analytics'
  | 'allocations'
  | 'servers'
  | 'databases'
  | 'diagnostics'
  | 'activity';

export const NODE_DETAIL_TABS: NodeDetailTab[] = [
  'overview',
  'settings',
  'analytics',
  'allocations',
  'servers',
  'databases',
  'diagnostics',
  'activity',
];

const LEGACY_TAB_MAP: Record<string, NodeDetailTab> = {
  basic: 'settings',
  network: 'settings',
  configuration: 'settings',
  advanced: 'settings',
};

export function readNodeDetailTab(value: string | null): NodeDetailTab {
  if (value && LEGACY_TAB_MAP[value]) return LEGACY_TAB_MAP[value];
  if (value && NODE_DETAIL_TABS.includes(value as NodeDetailTab)) return value as NodeDetailTab;
  return 'overview';
}

export function formFromDetail(node: AdminNodeDetail): UpdateAdminNodeInput {
  return {
    name: node.name,
    description: node.description,
    locationId: node.location.id,
    fqdn: node.fqdn,
    scheme: node.scheme as 'http' | 'https',
    behindProxy: node.behindProxy,
    maintenanceMode: node.maintenanceMode,
    memory: node.memory,
    memoryOverallocate: node.memoryOverallocate,
    disk: node.disk,
    diskOverallocate: node.diskOverallocate,
    daemonListen: node.daemonListen,
    daemonSftp: node.daemonSftp,
    daemonBase: node.daemonBase,
    uploadSize: node.uploadSize,
    publicIp: node.publicIp ?? '',
    domainBase: node.domainBase ?? '',
    cloudflareZoneId: node.cloudflareZoneId ?? '',
  };
}

export function nodeFormHasChanges(detail: AdminNodeDetail, form: UpdateAdminNodeInput): boolean {
  return (
    form.name !== detail.name ||
    (form.description ?? '') !== (detail.description ?? '') ||
    form.locationId !== detail.location.id ||
    form.fqdn !== detail.fqdn ||
    form.scheme !== detail.scheme ||
    (form.behindProxy ?? false) !== detail.behindProxy ||
    (form.maintenanceMode ?? false) !== detail.maintenanceMode ||
    form.memory !== detail.memory ||
    form.memoryOverallocate !== detail.memoryOverallocate ||
    form.disk !== detail.disk ||
    form.diskOverallocate !== detail.diskOverallocate ||
    form.daemonListen !== detail.daemonListen ||
    form.daemonSftp !== detail.daemonSftp ||
    (form.daemonBase ?? '') !== detail.daemonBase ||
    form.uploadSize !== detail.uploadSize ||
    (form.publicIp ?? '') !== (detail.publicIp ?? '') ||
    (form.domainBase ?? '') !== (detail.domainBase ?? '') ||
    (form.cloudflareZoneId ?? '') !== (detail.cloudflareZoneId ?? '')
  );
}
