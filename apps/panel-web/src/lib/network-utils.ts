import type { ServerAllocationEntry } from './api';

export type AllocationFilter = 'all' | 'primary' | 'additional';

export function matchesAllocationSearch(alloc: ServerAllocationEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    alloc.address,
    alloc.displayHost,
    alloc.bindAddress,
    String(alloc.port),
    alloc.alias,
    alloc.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesAllocationFilter(alloc: ServerAllocationEntry, filter: AllocationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'primary') return alloc.isDefault;
  return !alloc.isDefault;
}
