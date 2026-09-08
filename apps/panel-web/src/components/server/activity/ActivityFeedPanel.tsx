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
} from '../../../lib/activity';
import { ActivityEventRow } from './ActivityEventRow';

const PAGE_SIZE = 20;

function matchesSearch(entry: ActivityEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [entry.description, entry.event, entry.actor?.username, entry.actor?.email, entry.ip]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function ActivityFeedPanel({
  fetchPage,
  refreshKey,
  onTotalsChange,
}: {
  fetchPage: (cursor: string | null, limit: number) => Promise<ActivityPageResult>;
  refreshKey: string;
  onTotalsChange: (info: { total: number; loaded: number; filtered: number; hasActiveFilters: boolean }) => void;
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
    loadInitial();
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
      hasActiveFilters: hasActiveFilters,
    });
  }, [total, entries.length, filtered.length, hasActiveFilters, onTotalsChange]);

  if (loading) {
    return (
      <div className="ds-srv-act-feed ds-srv-act-feed--loading">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-hover)]" aria-hidden />
        <p>Loading activity…</p>
      </div>
    );
  }

  return (
    <section className="ds-srv-act-feed">
      <div className="ds-srv-act-feed-toolbar">
        <div className="ds-srv-act-search">
          <Search className="ds-srv-act-search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, users, IP…"
            className="ds-srv-act-search-input"
          />
        </div>

        <div className="ds-srv-act-filters" role="tablist" aria-label="Activity categories">
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
                className={`ds-srv-act-filter ds-srv-act-filter--${option.id}${active ? ' ds-srv-act-filter--active' : ''}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {total > 0 ? (
          <p className="ds-srv-act-feed-meta">
            {hasActiveFilters ? (
              <>
                <strong>{filtered.length}</strong> matching
                {filter !== 'all' ? <> in <strong>{activeFilterMeta.label}</strong></> : null}
                <span className="opacity-60"> · {entries.length} loaded</span>
              </>
            ) : (
              <>
                <strong>{entries.length}</strong> of <strong>{total}</strong> events
              </>
            )}
          </p>
        ) : null}
      </div>

      {loadError ? (
        <div className="ds-srv-act-notice ds-srv-act-notice--danger" role="alert">
          {loadError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="ds-srv-act-empty">
          <ScrollText className="h-6 w-6 opacity-40" aria-hidden />
          <p className="ds-srv-act-empty-title">
            {loadError
              ? 'Could not load activity'
              : hasActiveFilters
                ? 'No matching events'
                : 'No activity yet'}
          </p>
          <p className="ds-srv-act-empty-desc">
            {loadError
              ? 'Try refreshing the page.'
              : hasActiveFilters
                ? 'Try a different search or filter, or load more events.'
                : 'Power commands, file edits, and settings changes will show up here.'}
          </p>
        </div>
      ) : (
        <div className="ds-srv-act-timeline">
          {groups.map((group) => (
            <section key={group.label} className="ds-srv-act-day">
              <header className="ds-srv-act-day-head">
                <span className="ds-srv-act-day-label">{group.label}</span>
                <span className="ds-srv-act-day-count">{group.entries.length}</span>
              </header>
              <ul className="ds-srv-act-day-list">
                {group.entries.map((entry) => (
                  <ActivityEventRow key={entry.id} entry={entry} category={getActivityFilterCategory(entry.event)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="ds-srv-act-load-more">
          <button type="button" className="ds-srv-act-load-btn" onClick={() => void loadMore()} disabled={loadingMore}>
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
                  <span className="ds-srv-act-load-remaining">({total - entries.length} remaining)</span>
                ) : null}
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
