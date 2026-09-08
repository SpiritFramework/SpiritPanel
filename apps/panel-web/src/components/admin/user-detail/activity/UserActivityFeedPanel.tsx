import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, ScrollText, Search } from 'lucide-react';
import {
  ACTIVITY_FILTER_OPTIONS,
  getActivityFilterCategory,
  getActivityFilterMeta,
  groupActivityByDate,
  matchesActivityFilter,
  type ActivityEntry,
  type ActivityFilterCategory,
  type ActivityPageResult,
} from '../../../../lib/activity';
import { UserActivityEventRow } from './UserActivityEventRow';

const PAGE_SIZE = 20;

function matchesSearch(entry: ActivityEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entry.description,
    entry.event,
    entry.server?.name,
    entry.ip,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function UserActivityFeedPanel({
  fetchPage,
  refreshKey,
  onTotalsChange,
  onLoadedEntriesChange,
}: {
  fetchPage: (cursor: string | null, limit: number) => Promise<ActivityPageResult>;
  refreshKey: string;
  onTotalsChange: (info: {
    total: number;
    loaded: number;
    filtered: number;
    hasActiveFilters: boolean;
  }) => void;
  onLoadedEntriesChange?: (entries: ActivityEntry[]) => void;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<ActivityFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await fetchPage(null, PAGE_SIZE);
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
  }, [fetchPage]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial, refreshKey]);

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPage(cursor, PAGE_SIZE);
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
    let list = entries.filter((e) => matchesActivityFilter(e.event, filter));
    if (searchQuery.trim()) {
      list = list.filter((e) => matchesSearch(e, searchQuery));
    }
    return list;
  }, [entries, filter, searchQuery]);

  const hasActiveFilters = filter !== 'all' || Boolean(searchQuery.trim());
  const activeFilterMeta = getActivityFilterMeta(filter);
  const groups = useMemo(() => groupActivityByDate(filtered), [filtered]);

  useEffect(() => {
    onTotalsChange({
      total,
      loaded: entries.length,
      filtered: filtered.length,
      hasActiveFilters,
    });
    onLoadedEntriesChange?.(entries);
  }, [total, entries, filtered.length, hasActiveFilters, onTotalsChange, onLoadedEntriesChange]);

  if (loading) {
    return (
      <div className="ds-ud-act-feed ds-ud-act-feed--loading">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-hover)]" aria-hidden />
        <p>Loading activity…</p>
      </div>
    );
  }

  return (
    <section className="ds-ud-act-feed">
      <div className="ds-ud-act-feed-toolbar">
        <div className="ds-ud-act-search">
          <Search className="ds-ud-act-search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, servers, IP…"
            className="ds-ud-act-search-input"
            aria-label="Search activity"
          />
        </div>

        <div className="ds-ud-act-filters" role="tablist" aria-label="Activity categories">
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
                className={`ds-ud-act-filter ds-ud-act-filter--${option.id}${active ? ' ds-ud-act-filter--active' : ''}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <div className="ds-ud-act-notice ds-ud-act-notice--danger" role="alert">
          {loadError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="ds-ud-act-empty">
          <ScrollText className="h-6 w-6 opacity-40" aria-hidden />
          <p className="ds-ud-act-empty-title">
            {loadError
              ? 'Could not load activity'
              : hasActiveFilters
                ? 'No matching events'
                : 'No activity yet'}
          </p>
          <p className="ds-ud-act-empty-desc">
            {loadError
              ? 'Try refreshing the page.'
              : hasActiveFilters
                ? 'Try a different search or filter, or load more events.'
                : 'Actions from this user will appear here as they happen.'}
          </p>
        </div>
      ) : (
        <div className="ds-ud-act-timeline">
          {groups.map((group) => (
            <section key={group.label} className="ds-ud-act-day">
              <header className="ds-ud-act-day-head">
                <span className="ds-ud-act-day-label">{group.label}</span>
                <span className="ds-ud-act-day-count">{group.entries.length}</span>
              </header>
              <ul className="ds-ud-act-day-list">
                {group.entries.map((entry) => (
                  <UserActivityEventRow
                    key={entry.id}
                    entry={entry}
                    category={getActivityFilterCategory(entry.event)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="ds-ud-act-load-more">
          <button
            type="button"
            className="ds-ud-act-load-btn"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                Load more
                {total > entries.length ? (
                  <span className="ds-ud-act-load-remaining">({total - entries.length} remaining)</span>
                ) : null}
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
