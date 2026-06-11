import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  Ban,
  LayoutGrid,
  List,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Server,
  X,
} from 'lucide-react';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { api, type ServerSummary, type User } from '../../lib/api';
import { formatAllocationAddress } from '../../lib/allocation';
import { ServerCard } from '../../components/ServerCard';
import { ServerListTable } from '../../components/ServerListRow';
import { Button, ClientLayout, Page, SelectControl } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { normalizeAppearance } from '../../lib/branding-appearance';
import {
  matchesServerStatusFilter,
  isServerEffectivelyRunning,
  isServerEffectivelyInstalling,
} from '../../lib/server-runtime';
import { AlertBanner, DsIcon, EmptyState, ListPageSkeleton } from '../../components/ui';

type StatusFilter = 'all' | 'running' | 'suspended' | 'installing';
type SortKey = 'name' | 'status' | 'node';
type ViewMode = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'spirit_servers_view';

function readStoredView(fallback: ViewMode): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {
    /* ignore */
  }
  return fallback;
}

function serverMatchesFilter(server: ServerSummary, filter: StatusFilter) {
  return matchesServerStatusFilter(server, filter);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function displayName(user: User): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.username;
}

function sortLabel(key: SortKey): string {
  if (key === 'name') return 'name';
  if (key === 'node') return 'node';
  return 'status';
}

export function ServerListPage() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const defaultView = normalizeAppearance(branding).serverListDefaultView;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>(() => readStoredView(defaultView));

  const fetchServers = useCallback(() => api.client.servers(), []);
  const { data: servers, loading, validating, error, refetch } = useAsyncData(
    'client-servers',
    fetchServers,
  );
  const list = servers ?? [];
  const refreshing = validating && list.length > 0;

  useEffect(() => {
    const timer = window.setInterval(() => void refetch(), 15_000);
    return () => window.clearInterval(timer);
  }, [refetch]);

  function setViewMode(mode: ViewMode) {
    setView(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  const stats = useMemo(
    () => ({
      total: list.length,
      running: list.filter(isServerEffectivelyRunning).length,
      suspended: list.filter((s) => s.suspended).length,
      installing: list.filter(isServerEffectivelyInstalling).length,
      offline: list.filter(
        (s) =>
          !s.suspended &&
          !isServerEffectivelyRunning(s) &&
          !isServerEffectivelyInstalling(s),
      ).length,
    }),
    [list],
  );

  const hasActiveFilters = statusFilter !== 'all' || search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = list.filter((s) => serverMatchesFilter(s, statusFilter));

    if (q) {
      filtered = filtered.filter((s) => {
        const address = formatAllocationAddress(s.defaultAllocation, {
          fqdn: s.node.fqdn ?? s.defaultAllocation.ip,
        });
        return (
          s.name.toLowerCase().includes(q) ||
          s.egg.name.toLowerCase().includes(q) ||
          s.node.name.toLowerCase().includes(q) ||
          address.toLowerCase().includes(q)
        );
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'node') return a.node.name.localeCompare(b.node.name);
      const rank = (s: ServerSummary) => {
        if (s.suspended) return 3;
        if (isServerEffectivelyInstalling(s)) return 1;
        if (isServerEffectivelyRunning(s)) return 0;
        return 2;
      };
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  }, [list, search, statusFilter, sortKey]);

  const filterPills: { id: StatusFilter; label: string; count: number; icon: typeof Server }[] = [
    { id: 'all', label: 'All', count: stats.total, icon: Server },
    { id: 'running', label: 'Running', count: stats.running, icon: Play },
    { id: 'installing', label: 'Installing', count: stats.installing, icon: Loader2 },
    { id: 'suspended', label: 'Suspended', count: stats.suspended, icon: Ban },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'name', label: 'Sort by name' },
    { value: 'status', label: 'Sort by status' },
    { value: 'node', label: 'Sort by node' },
  ];

  return (
    <ClientLayout>
      <Page>
      <div className="mb-4">
        <PanelAnnouncementBanner location="servers" />
      </div>

      <section className="ds-card mb-4 overflow-hidden">
        {normalizeAppearance(branding).showHeroStripe && <div className="ds-hero-stripe" />}
        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {sanitizeImageSrc(branding.logoUrl) ? (
                <img
                  src={sanitizeImageSrc(branding.logoUrl)!}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] object-contain p-1.5"
                />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
                  style={panelNameGradientStyle()}
                >
                  {panelNameInitial(branding.panelName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[var(--muted)]">
                  {getGreeting()}
                  {user ? `, ${displayName(user)}` : ''}
                </p>
                <h1 className="text-lg font-bold tracking-tight sm:text-xl">My servers</h1>
                <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-[11px]">
                  <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
                  {branding.tagline ? <span className="truncate text-[var(--muted)]">{branding.tagline}</span> : null}
                </p>
              </div>
            </div>

            {!loading && stats.total > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <HeaderStat label="Online" value={stats.running} tone="success" />
                <HeaderStat label="Total" value={stats.total} />
                {stats.installing > 0 && <HeaderStat label="Installing" value={stats.installing} tone="info" />}
                {stats.suspended > 0 && <HeaderStat label="Suspended" value={stats.suspended} tone="warn" />}
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={refreshing}
                  title="Refresh servers"
                  className="ds-icon-btn ds-icon-btn--bordered h-9 w-9"
                >
                  <RefreshCw className={`ds-icon ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Loading your servers…
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              {stats.total === 0
                ? 'No servers on your account yet — contact your host to get started.'
                : stats.running > 0
                  ? `${stats.running} of ${stats.total} online`
                  : `${stats.total} server${stats.total === 1 ? '' : 's'} — none running right now`}
            </p>
          )}
        </div>
      </section>

      {!loading && stats.total > 0 && (
        <section className="ds-card mb-4">
          <div className="ds-card-body ds-card-body--compact">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {filterPills.map((pill) => {
                const Icon = pill.icon;
                const isActive = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`ds-filter-pill ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon
                      className={`ds-icon ${pill.id === 'installing' && isActive ? 'animate-spin' : ''}`}
                    />
                    {pill.label}
                    <span className="ds-filter-pill-count">{pill.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 w-full flex-1 sm:min-w-[12rem] lg:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search servers…"
                  className="ds-field py-2 pl-8 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <SelectControl
                controlSize="sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="min-w-0 shrink-0"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectControl>

              <div className="ds-segmented shrink-0">
                <ViewButton active={view === 'grid'} onClick={() => setViewMode('grid')} label="Grid view">
                  <LayoutGrid className="ds-icon" />
                </ViewButton>
                <ViewButton active={view === 'list'} onClick={() => setViewMode('list')} label="List view">
                  <List className="ds-icon" />
                </ViewButton>
              </div>
            </div>
          </div>
          </div>
        </section>
      )}

      {error && !loading && list.length > 0 && (
        <AlertBanner tone="error" className="mb-4 flex-wrap justify-between">
          <p>We couldn&apos;t refresh your servers. You&apos;re seeing the last saved list.</p>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            Retry
          </Button>
        </AlertBanner>
      )}

      {loading ? (
        <ListPageSkeleton />
      ) : list.length === 0 ? (
        error ? (
          <EmptyState
            icon={<DsIcon icon={Server} className="ds-icon--md" />}
            title="Couldn't load your servers"
            description="Check your connection and try again. If this keeps happening, contact support."
            action={
              <Button type="button" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<DsIcon icon={Server} className="ds-icon--md" />}
            title="No servers on your account"
            description="When your host provisions a server, it will appear here with status, address, and controls."
          />
        )
      ) : (
        <>
          {list.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--muted)]">
                Showing{' '}
                <span className="font-medium text-[var(--text)]">{filtered.length}</span>
                {filtered.length !== list.length && (
                  <>
                    {' '}
                    of <span className="font-medium text-[var(--text)]">{list.length}</span>
                  </>
                )}{' '}
                server{filtered.length === 1 ? '' : 's'}
                <span className="hidden sm:inline"> · sorted by {sortLabel(sortKey)}</span>
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ds-btn ds-btn--ghost ds-btn--sm"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No matching servers"
              description="Nothing matches your current search or filter. Try different terms or show all servers again."
              action={
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <ServerCard key={s.id} server={s} />
              ))}
            </div>
          ) : (
            <ServerListTable servers={filtered} />
          )}
        </>
      )}
      </Page>
    </ClientLayout>
  );
}

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warn' | 'info';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]'
      : tone === 'warn'
        ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]'
        : tone === 'info'
          ? 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]'
          : '';

  return (
    <div className={`ds-mini-stat ${toneClass}`}>
      {label}
      <span className="ds-mini-stat-value ds-text-mono">{value}</span>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`ds-segmented-btn ${active ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
}
