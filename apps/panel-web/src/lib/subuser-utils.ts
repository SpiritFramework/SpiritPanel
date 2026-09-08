export interface SubuserSummary {
  id: string;
  permissions: string[];
  user: { email: string; username: string; avatarUrl?: string | null };
}

export const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ key: string; label: string; desc?: string }>;
}> = [
  {
    title: 'Server control',
    items: [
      { key: 'control.console', label: 'Console', desc: 'View console & send commands' },
      { key: 'control.start', label: 'Start', desc: 'Start the server' },
      { key: 'control.stop', label: 'Stop', desc: 'Stop the server' },
      { key: 'control.restart', label: 'Restart', desc: 'Restart the server' },
    ],
  },
  {
    title: 'Files',
    items: [
      { key: 'file.read', label: 'Read files', desc: 'View and download files' },
      { key: 'file.create', label: 'Create files', desc: 'Upload and create files' },
      { key: 'file.update', label: 'Edit files', desc: 'Rename, move, and modify existing files' },
      { key: 'file.delete', label: 'Delete files', desc: 'Remove files and folders' },
      { key: 'file.archive', label: 'Archives', desc: 'Create and extract archives' },
      { key: 'file.sftp', label: 'SFTP', desc: 'Connect via SFTP' },
      {
        key: 'marketplace.install',
        label: 'Marketplace / Plugins',
        desc: 'Install FiveM resources or Minecraft plugins from the store',
      },
    ],
  },
  {
    title: 'Network',
    items: [
      { key: 'allocation.read', label: 'View allocations', desc: 'See assigned ports' },
      { key: 'allocation.create', label: 'Auto-assign ports', desc: 'Claim free allocations' },
      { key: 'allocation.update', label: 'Set primary', desc: 'Change the main connection port' },
      { key: 'allocation.delete', label: 'Remove ports', desc: 'Unassign secondary allocations' },
    ],
  },
  {
    title: 'Users & startup',
    items: [
      { key: 'user.read', label: 'View subusers', desc: 'See who has access' },
      { key: 'user.create', label: 'Add subusers', desc: 'Invite new subusers' },
      { key: 'user.update', label: 'Edit subusers', desc: 'Change permissions' },
      { key: 'user.delete', label: 'Remove subusers', desc: 'Revoke access' },
      { key: 'startup.read', label: 'View startup', desc: 'See startup variables' },
      { key: 'startup.update', label: 'Edit startup', desc: 'Change startup variables' },
    ],
  },
  {
    title: 'Databases',
    items: [
      {
        key: 'database.read',
        label: 'View databases',
        desc: 'See database list, credentials, and open the built-in browser (read-only)',
      },
      { key: 'database.create', label: 'Create databases', desc: 'Provision new MySQL databases' },
      {
        key: 'database.update',
        label: 'Edit database data',
        desc: 'Run INSERT / UPDATE / DELETE in the built-in Database Manager (when the plugin allows writes)',
      },
      { key: 'database.delete', label: 'Delete databases', desc: 'Remove databases' },
      { key: 'database.view_password', label: 'View passwords', desc: 'Reveal database passwords' },
    ],
  },
  {
    title: 'Backups & schedules',
    items: [
      { key: 'backup.read', label: 'View backups', desc: 'See backup list' },
      { key: 'backup.create', label: 'Create backups', desc: 'Start new backups' },
      { key: 'backup.delete', label: 'Delete backups', desc: 'Remove backup records' },
      { key: 'schedule.read', label: 'View schedules', desc: 'See automated tasks' },
      { key: 'schedule.create', label: 'Create schedules', desc: 'Add new schedules' },
      { key: 'schedule.update', label: 'Edit schedules', desc: 'Pause or modify schedules' },
      { key: 'schedule.delete', label: 'Delete schedules', desc: 'Remove schedules' },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const DEFAULT_INVITE_PERMISSIONS = ['control.console', 'file.read'];

export function matchesSubuserSearch(subuser: SubuserSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [subuser.user.username, subuser.user.email, ...subuser.permissions].join(' ').toLowerCase();
  return haystack.includes(q);
}

export function permissionLabel(key: string): string {
  for (const group of PERMISSION_GROUPS) {
    const item = group.items.find((i) => i.key === key);
    if (item) return item.label;
  }
  return key;
}

export function togglePermission(list: string[], key: string, checked: boolean): string[] {
  if (checked) return list.includes(key) ? list : [...list, key];
  return list.filter((p) => p !== key);
}
