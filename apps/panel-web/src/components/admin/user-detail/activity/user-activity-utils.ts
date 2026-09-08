import {
  ACTIVITY_FILTER_OPTIONS,
  getActivityFilterCategory,
  type ActivityEntry,
  type ActivityFilterCategory,
} from '../../../../lib/activity';

export interface UserActivityCategoryRow {
  id: ActivityFilterCategory;
  label: string;
  count: number;
}

export function groupUserActivityByCategory(entries: ActivityEntry[]): UserActivityCategoryRow[] {
  const counts = new Map<ActivityFilterCategory, number>();

  for (const entry of entries) {
    const category = getActivityFilterCategory(entry.event);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return ACTIVITY_FILTER_OPTIONS.filter((option) => option.id !== 'all' && (counts.get(option.id) ?? 0) > 0).map(
    (option) => ({
      id: option.id,
      label: option.shortLabel,
      count: counts.get(option.id) ?? 0,
    }),
  );
}

export function countDistinctActivityServers(entries: ActivityEntry[]): number {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.server?.id) ids.add(entry.server.id);
  }
  return ids.size;
}

export function formatLastActivity(timestamp: string | null | undefined): string {
  if (!timestamp) return 'No events yet';
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
