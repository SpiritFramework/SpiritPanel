import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button, ClientLayout, SelectControl } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import {
  matchesServerStatusFilter,
  isServerEffectivelyRunning,
  isServerEffectivelyInstalling,
} from '../../lib/server-runtime';
import { EmptyState, Spinner } from '../../components/ui';

type StatusFilter = 'all' | 'running' | 'suspended' | 'installing';
type SortKey = 'name' | 'status' | 'node';
type ViewMode = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'spirit_servers_view';

function readStoredView(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {
    /* ignore */
  }
  return 'grid';
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
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>(readStoredView);

  const loadServers = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await api.client.servers();
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadServers();
    const timer = window.setInterval(() => void loadServers({ silent: true }), 15_000);
    return () => window.clearInterval(timer);
  }, [loadServers]);

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
      total: servers.length,
      running: servers.filter(isServerEffectivelyRunning).length,
      suspended: servers.filter((s) => s.suspended).length,
      installing: servers.filter(isServerEffectivelyInstalling).length,
      offline: servers.filter(
        (s) =>
          !s.suspended &&
          !isServerEffectivelyRunning(s) &&
          !isServerEffectivelyInstalling(s),
      ).length,
    }),
    [servers],
  );

  const hasActiveFilters = statusFilter !== 'all' || search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = servers.filter((s) => serverMatchesFilter(s, statusFilter));

    if (q) {
      list = list.filter((s) => {
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

    return [...list].sort((a, b) => {
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
  }, [servers, search, statusFilter, sortKey]);

  const heroGradient = `linear-gradient(135deg, ${branding.accentColor} 0%, ${branding.secondaryColor || branding.accentColor} 48%, color-mix(in srgb, ${branding.accentColor} 55%, #0c1222) 100%)`;

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
      <div className="mb-5">
        <PanelAnnouncementBanner location="servers" />
      </div>

      <section className="server-list-header mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="h-1 w-full shrink-0" style={{ background: heroGradient }} />
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
                  onClick={() => void loadServers({ silent: true })}
                  disabled={refreshing}
                  title="Refresh servers"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--muted)] transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:text-[var(--text)] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
        <section className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
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
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)] accent-text'
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${pill.id === 'installing' && isActive ? 'animate-spin' : ''}`}
                    />
                    {pill.label}
                    <span
                      className={`rounded-md px-1.5 py-px text-[10px] font-semibold tabular-nums ${
                        isActive ? 'bg-[var(--surface)]/80' : 'bg-[var(--surface-hover)]'
                      }`}
                    >
                      {pill.count}
                    </span>
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-8 text-[13px] outline-none transition focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
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

              <div className="flex shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5">
                <ViewButton active={view === 'grid'} onClick={() => setViewMode('grid')} label="Grid view">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </ViewButton>
                <ViewButton active={view === 'list'} onClick={() => setViewMode('list')} label="List view">
                  <List className="h-3.5 w-3.5" />
                </ViewButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {error && !loading && servers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          <p>Could not refresh server list. Showing last known data.</p>
          <Button type="button" variant="ghost" onClick={() => void loadServers({ silent: true })}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : servers.length === 0 ? (
        error ? (
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="Couldn't load servers"
            description={error}
            action={
              <Button type="button" onClick={() => void loadServers()}>
                Try again
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="No servers yet"
            description="You don't have any game servers on your account. Contact your host or an administrator to get started."
          />
        )
      ) : (
        <>
          {servers.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--muted)]">
                Showing{' '}
                <span className="font-medium text-[var(--text)]">{filtered.length}</span>
                {filtered.length !== servers.length && (
                  <>
                    {' '}
                    of <span className="font-medium text-[var(--text)]">{servers.length}</span>
                  </>
                )}{' '}
                server{filtered.length === 1 ? '' : 's'}
                <span className="hidden sm:inline"> · sorted by {sortLabel(sortKey)}</span>
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:accent-text"
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
  const styles =
    tone === 'success'
      ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]'
      : tone === 'warn'
        ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]'
        : tone === 'info'
          ? 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)]';

  return (
    <div className={`rounded-lg border px-2.5 py-1.5 text-center ${styles}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-base font-bold tabular-nums leading-tight">{value}</p>
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
      className={`rounded-md px-2 py-1.5 transition ${
        active
          ? 'bg-[var(--accent-muted)] accent-text shadow-sm'
          : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}
