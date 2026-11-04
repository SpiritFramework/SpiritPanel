import type { ActivityEntry } from '../../../lib/activity';

export type PanelActivityCategory =
  | 'auth'
  | 'users'
  | 'servers'
  | 'nodes'
  | 'settings'
  | 'admin';

export interface PanelCategoryRow {
  id: PanelActivityCategory;
  label: string;
  count: number;
}

export const PANEL_CATEGORY_META: Record<
  PanelActivityCategory,
  { label: string; shortLabel: string }
> = {
  auth: { label: 'Auth', shortLabel: 'Auth' },
  users: { label: 'Users', shortLabel: 'Users' },
  servers: { label: 'Servers', shortLabel: 'Servers' },
  nodes: { label: 'Nodes', shortLabel: 'Nodes' },
  settings: { label: 'Config', shortLabel: 'Config' },
  admin: { label: 'Admin', shortLabel: 'Admin' },
};

export function getPanelActivityCategory(event: string): PanelActivityCategory {
  if (event.startsWith('auth.')) return 'auth';
  if (event.startsWith('admin.user.')) return 'users';
  if (event.startsWith('admin.server.')) return 'servers';
  if (
    event.startsWith('admin.node.') ||
    event.startsWith('admin.allocation.') ||
    event.startsWith('admin.location.')
  ) {
    return 'nodes';
  }
  if (
    event.startsWith('admin.settings.') ||
    event.startsWith('admin.nest.') ||
    event.startsWith('admin.egg.') ||
    event.startsWith('admin.activity.') ||
    event.startsWith('admin.plugin.')
  ) {
    return 'settings';
  }
  if (event.startsWith('admin.')) return 'admin';
  return 'admin';
}

export function groupPanelActivityByCategory(entries: ActivityEntry[]): PanelCategoryRow[] {
  const counts: Record<PanelActivityCategory, number> = {
    auth: 0,
    users: 0,
    servers: 0,
    nodes: 0,
    settings: 0,
    admin: 0,
  };
  for (const entry of entries) {
    counts[getPanelActivityCategory(entry.event)] += 1;
  }
  const order: PanelActivityCategory[] = [
    'auth',
    'users',
    'servers',
    'nodes',
    'settings',
    'admin',
  ];
  return order
    .map((id) => ({
      id,
      label: PANEL_CATEGORY_META[id].label,
      count: counts[id],
    }))
    .filter((row) => row.count > 0);
}
