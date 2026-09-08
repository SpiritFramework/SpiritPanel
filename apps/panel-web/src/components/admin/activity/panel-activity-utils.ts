import { getActivityCategory, type ActivityEntry } from '../../../lib/activity';

export type PanelActivityCategory = 'auth' | 'admin' | 'server';

export interface PanelCategoryRow {
  id: PanelActivityCategory;
  label: string;
  count: number;
}

export function groupPanelActivityByCategory(entries: ActivityEntry[]): PanelCategoryRow[] {
  const counts: Record<PanelActivityCategory, number> = { auth: 0, admin: 0, server: 0 };
  for (const entry of entries) {
    counts[getActivityCategory(entry.event)] += 1;
  }
  const rows: PanelCategoryRow[] = [
    { id: 'auth', label: 'Auth', count: counts.auth },
    { id: 'admin', label: 'Admin', count: counts.admin },
    { id: 'server', label: 'Server', count: counts.server },
  ];
  return rows.filter((row) => row.count > 0);
}
