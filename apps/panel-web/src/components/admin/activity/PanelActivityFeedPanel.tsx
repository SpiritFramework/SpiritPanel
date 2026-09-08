import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, ScrollText, Search } from 'lucide-react';
import { groupActivityByDate, type ActivityEntry, type ActivityPageResult } from '../../../lib/activity';
import { PanelActivityEventRow } from './PanelActivityEventRow';

const PAGE_SIZE = 20;

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

export function PanelActivityFeedPanel({
  fetchPage,
  refreshKey,
  onTotalsChange,
  onLoadedEntriesChange,
  emptyTitle = 'No panel activity yet',
  emptyDescription = 'Logins, registrations, and admin actions will appear here.',
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
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
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
    if (!searchQuery.trim()) return entries;
    return entries.filter((e) => matchesSearch(e, searchQuery));
  }, [entries, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery.trim());
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
      <div className="ds-ad-act-feed ds-ad-act-feed--loading">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-hover)]" aria-hidden />
        <p>Loading activity…</p>
      </div>
    );
  }

  return (
    <section className="ds-ad-act-feed">
      <div className="ds-ad-act-feed-toolbar">
        <div className="ds-ad-act-search">
          <Search className="ds-ad-act-search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, users, IP…"
            className="ds-ad-act-search-input"
            aria-label="Search activity"
          />
        </div>

        {total > 0 ? (
          <p className="ds-ad-act-feed-meta">
            {hasActiveFilters ? (
              <>
                <strong>{filtered.length}</strong> matching
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
        <div className="ds-ad-act-notice ds-ad-act-notice--danger" role="alert">
          {loadError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="ds-ad-act-empty">
          <ScrollText className="h-6 w-6 opacity-40" aria-hidden />
          <p className="ds-ad-act-empty-title">
            {loadError
              ? 'Could not load activity'
              : hasActiveFilters
                ? 'No matching events'
                : emptyTitle}
          </p>
          <p className="ds-ad-act-empty-desc">
            {loadError
              ? 'Try refreshing the page.'
              : hasActiveFilters
                ? 'Try a different search, or load more events.'
                : emptyDescription}
          </p>
        </div>
      ) : (
        <div className="ds-ad-act-timeline">
          {groups.map((group) => (
            <section key={group.label} className="ds-ad-act-day">
              <header className="ds-ad-act-day-head">
                <span className="ds-ad-act-day-label">{group.label}</span>
                <span className="ds-ad-act-day-count">{group.entries.length}</span>
              </header>
              <ul className="ds-ad-act-day-list">
                {group.entries.map((entry) => (
                  <PanelActivityEventRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="ds-ad-act-load-more">
          <button
            type="button"
            className="ds-ad-act-load-btn"
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
                  <span className="ds-ad-act-load-remaining">({total - entries.length} remaining)</span>
                ) : null}
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
