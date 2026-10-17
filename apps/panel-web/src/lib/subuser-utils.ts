export interface SubuserSummary {
  id: string;
  permissions: string[];
  user: { email: string; username: string; avatarUrl?: string | null };
}

/**
 * Must stay in sync with panel-api `SUBUSER_GRANTABLE_PERMISSIONS`
 * (WINGS_CLIENT_PERMISSIONS minus admin.*). Subuser management stays owner-only —
 * there are no user.* grants.
 */
export const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ key: string; label: string; desc?: string }>;
}> = [
  {
    title: 'Server control',
    items: [
      { key: 'control.console', label: 'Console', desc: 'View console & send commands' },
      { key: 'websocket.connect', label: 'Live console', desc: 'Connect to the server websocket (needed for console)' },
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
    title: 'Startup',
    items: [
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

const KNOWN = new Set(ALL_PERMISSION_KEYS);

/** Defaults for a new invite — console + live websocket + read files. */
export const DEFAULT_INVITE_PERMISSIONS = ['control.console', 'websocket.connect', 'file.read'];

/** Keep console usable: live websocket is required for the console page. */
export function withImpliedPermissions(list: string[]): string[] {
  const next = [...new Set(list.filter((p) => KNOWN.has(p)))];
  if (next.includes('control.console') && !next.includes('websocket.connect')) {
    next.push('websocket.connect');
  }
  return next;
}

export function sanitizePermissions(list: string[]): string[] {
  return withImpliedPermissions(list);
}

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
  if (!KNOWN.has(key)) return list;
  const next = checked
    ? list.includes(key)
      ? list
      : [...list, key]
    : list.filter((p) => p !== key);
  // Unticking live console also drops websocket unless still needed — keep them paired.
  if (key === 'control.console' && !checked) {
    return next.filter((p) => p !== 'websocket.connect');
  }
  return withImpliedPermissions(next);
}

export function setGroupPermissions(list: string[], groupKeys: string[], enabled: boolean): string[] {
  let next = list.filter((p) => !groupKeys.includes(p));
  if (enabled) next = [...next, ...groupKeys];
  return withImpliedPermissions(next);
}

export function setAllPermissions(enabled: boolean): string[] {
  return enabled ? withImpliedPermissions([...ALL_PERMISSION_KEYS]) : [];
}

export function groupSelectionState(list: string[], groupKeys: string[]): 'all' | 'some' | 'none' {
  const count = groupKeys.filter((k) => list.includes(k)).length;
  if (count === 0) return 'none';
  if (count === groupKeys.length) return 'all';
  return 'some';
}
