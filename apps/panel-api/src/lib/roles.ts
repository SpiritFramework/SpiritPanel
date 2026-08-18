/** Panel elevated roles that may enter the admin UI. */
export function isFullPanelAdmin(user: { role: string; rootAdmin?: boolean } | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || Boolean(user.rootAdmin);
}

export function isStaffOrPanelAdmin(user: { role: string; rootAdmin?: boolean } | null | undefined): boolean {
  if (!user) return false;
  return isFullPanelAdmin(user) || user.role === 'staff';
}

export type PanelStaffCapability =
  | 'admin.access'
  | 'tickets.manage'
  | 'activity.read'
  | 'servers.read'
  | 'servers.suspend'
  | 'users.read'
  | 'nodes.read'
  | 'locations.read'
  | 'nests.read'
  | 'domains.read'
  | 'announce.read'
  | 'settings.read'
  | 'settings.write'
  | 'nodes.write'
  | 'nodes.secrets'
  | 'servers.write'
  | 'servers.delete'
  | 'servers.manage'
  | 'users.write'
  | 'users.delete'
  | 'api_keys.application'
  | 'domains.write'
  | 'nests.write'
  | 'announce.write'
  | 'databases.hosts'
  | 'marketplace.write';

const STAFF_ALLOWED = new Set<PanelStaffCapability>([
  'admin.access',
  'tickets.manage',
  'activity.read',
  'servers.read',
  'servers.suspend',
  'users.read',
  'nodes.read',
  'locations.read',
  'nests.read',
  'domains.read',
  'announce.read',
  'settings.read',
]);

export function panelRoleCan(
  user: { role: string; rootAdmin?: boolean } | null | undefined,
  capability: PanelStaffCapability,
): boolean {
  if (isFullPanelAdmin(user)) return true;
  if (user?.role === 'staff') return STAFF_ALLOWED.has(capability);
  return false;
}
