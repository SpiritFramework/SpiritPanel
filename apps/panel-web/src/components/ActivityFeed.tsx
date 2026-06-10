import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import {
  ACTIVITY_FILTER_OPTIONS,
  getActivityCategory,
  getActivityFilterMeta,
  matchesActivityFilter,
  type ActivityEntry,
  type ActivityFilterCategory,
} from '../lib/activity';
import { ActivityTimeline } from './ActivityTimeline';
import { Button, FilterSelect } from './Layout';
import { EmptyState } from './ui';

const DEFAULT_PAGE_SIZE = 20;

export interface ActivityPageResult {
  items: ActivityEntry[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

type AdminCategoryFilter = 'all' | 'auth' | 'admin' | 'server';

const ADMIN_CATEGORY_OPTIONS: Array<{ id: AdminCategoryFilter; label: string }> = [
  { id: 'all', label: 'All types' },
  { id: 'auth', label: 'Auth' },
  { id: 'admin', label: 'Admin' },
  { id: 'server', label: 'Server' },
];

interface ActivityFeedProps {
  fetchPage: (cursor: string | null, limit: number) => Promise<ActivityPageResult>;
  pageSize?: number;
  filters?: boolean;
  adminCategories?: boolean;
  search?: boolean;
  showEventKey?: boolean;
  showCategoryBadge?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  renderMeta?: (entry: ActivityEntry) => ReactNode;
  compact?: boolean;
  layout?: 'compact' | 'full' | 'server';
  refreshKey?: string;
  onTotalsChange?: (info: { total: number; loaded: number; filtered: number }) => void;
}

function matchesSearch(entry: ActivityEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entry.description,
    entry.event,
    entry.actor?.username,
    entry.actor?.email,
    entry.server?.name,
    entry.ip,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesAdminCategory(entry: ActivityEntry, filter: AdminCategoryFilter) {
  if (filter === 'all') return true;
  return getActivityCategory(entry.event) === filter;
}

export function ActivityFeed({
  fetchPage,
  pageSize = DEFAULT_PAGE_SIZE,
  filters = false,
  adminCategories = false,
  search = false,
  showEventKey,
  showCategoryBadge = false,
  emptyTitle = 'No activity yet',
  emptyDescription = 'Events will appear here as actions are performed.',
  renderMeta,
  compact = true,
  layout,
  refreshKey,
  onTotalsChange,
}: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<ActivityFilterCategory>('all');
  const [adminFilter, setAdminFilter] = useState<AdminCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await fetchPage(null, pageSize);
      setEntries(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    } catch (err) {
      setEntries([]);
      setTotal(0);
      setHasMore(false);
      setCursor(null);
      setLoadError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial, refreshKey]);

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPage(cursor, pageSize);
      setEntries((prev) => [...prev, ...result.items]);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    } catch {
      /* keep current list */
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(() => {
    let list = entries;
    if (filters) {
      list = list.filter((e) => matchesActivityFilter(e.event, filter));
    }
    if (adminCategories) {
      list = list.filter((e) => matchesAdminCategory(e, adminFilter));
    }
    if (search && searchQuery.trim()) {
      list = list.filter((e) => matchesSearch(e, searchQuery));
    }
    return list;
  }, [entries, filter, filters, adminCategories, adminFilter, search, searchQuery]);

  useEffect(() => {
    onTotalsChange?.({ total, loaded: entries.length, filtered: filtered.length });
  }, [total, entries.length, filtered.length, onTotalsChange]);

  const resolvedLayout = layout ?? (compact ? 'compact' : 'full');
  const showToolbar = filters || adminCategories || search || total > 0;
  const activeFilterMeta = getActivityFilterMeta(filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {loadError}
        </div>
      )}

      {showToolbar && (
        <div className="activity-toolbar">
          <div className="activity-toolbar-main">
            {search && (
              <div className="activity-search">
                <Search className="activity-search-icon" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, users, IP…"
                  className="activity-search-input"
                />
              </div>
            )}

            {filters && (
              <div className="activity-filter-scroll" role="tablist" aria-label="Activity categories">
                {ACTIVITY_FILTER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={option.label}
                      onClick={() => setFilter(option.id)}
                      className={`activity-filter-chip ${option.chipClass}${active ? ' is-active' : ''}`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="activity-filter-chip-label">{option.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {adminCategories && (
              <FilterSelect
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value as AdminCategoryFilter)}
                className="min-w-[8.5rem]"
              >
                {ADMIN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            )}
          </div>

          {total > 0 && (
            <p className="activity-toolbar-meta">
              {searchQuery.trim() || filter !== 'all' || adminFilter !== 'all' ? (
                <>
                  <span className="font-medium text-[var(--text)]">{filtered.length}</span> matching
                  {filter !== 'all' && (
                    <>
                      {' '}
                      in <span className="font-medium text-[var(--text)]">{activeFilterMeta.label}</span>
                    </>
                  )}
                  <span className="opacity-60"> · {entries.length} loaded</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-[var(--text)]">{entries.length}</span> of{' '}
                  <span className="font-medium text-[var(--text)]">{total}</span> events
                </>
              )}
            </p>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            loadError
              ? 'Could not load activity'
              : searchQuery.trim() || filter !== 'all' || adminFilter !== 'all'
                ? 'No matching events'
                : emptyTitle
          }
          description={
            loadError
              ? 'Try refreshing the page.'
              : searchQuery.trim() || filter !== 'all' || adminFilter !== 'all'
                ? 'Try a different search or filter, or load more events.'
                : emptyDescription
          }
        />
      ) : (
        <ActivityTimeline
          entries={filtered}
          layout={resolvedLayout}
          showEventKey={showEventKey}
          showCategoryBadge={showCategoryBadge || filters}
          renderMeta={renderMeta}
        />
      )}

      {hasMore && (
        <div className="flex justify-center border-t border-[var(--border)]/50 pt-4">
          <Button type="button" variant="ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Load more
                {total > entries.length && (
                  <span className="text-[var(--muted)]">({total - entries.length} remaining)</span>
                )}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
