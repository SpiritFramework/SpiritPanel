import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  Ban,
  ChevronRight,
  CircleOff,
  LayoutGrid,
  List,
  Loader2,
  Play,
  Power,
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
  isServerEffectivelyOffline,
  type ServerStatusFilter,
} from '../../lib/server-runtime';
import { AlertBanner, DsIcon, EmptyState, ListPageSkeleton } from '../../components/ui';

type StatusFilter = ServerStatusFilter;
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
  const appearance = normalizeAppearance(branding);
  const defaultView = appearance.serverListDefaultView;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>(() => readStoredView(defaultView));

  const wantLiveRef = useRef(false);
  const fetchServers = useCallback(() => api.client.servers(wantLiveRef.current), []);
  const { data: servers, loading, validating, error, refetch } = useAsyncData(
    'client-servers',
    fetchServers,
  );
  const list = servers ?? [];
  const refreshing = validating && list.length > 0;

  const pollServers = useCallback(() => {
    pollTickRef.current += 1;
    wantLiveRef.current = pollTickRef.current % 3 === 0;
    return refetch().finally(() => {
      wantLiveRef.current = false;
    });
  }, [refetch]);

  const refreshServersLive = useCallback(async () => {
    wantLiveRef.current = true;
    try {
      await refetch();
    } finally {
      wantLiveRef.current = false;
    }
  }, [refetch]);

  const pollRef = useRef(pollServers);
  pollRef.current = pollServers;
  const pollTickRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => void pollRef.current(), 15_000);
    return () => window.clearInterval(timer);
  }, []);

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

  function toggleFilter(id: StatusFilter) {
    setStatusFilter((current) => (current === id ? 'all' : id));
  }

  const stats = useMemo(
    () => ({
      total: list.length,
      running: list.filter(isServerEffectivelyRunning).length,
      suspended: list.filter((s) => s.suspended).length,
      installing: list.filter(isServerEffectivelyInstalling).length,
      offline: list.filter(isServerEffectivelyOffline).length,
    }),
    [list],
  );

  const hasActiveFilters = statusFilter !== 'all' || search.trim().length > 0;
  const logoSrc = sanitizeImageSrc(branding.logoUrl);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = list.filter((s) => matchesServerStatusFilter(s, statusFilter));

    if (q) {
      next = next.filter((s) => {
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

    return [...next].sort((a, b) => {
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
    { id: 'running', label: 'Online', count: stats.running, icon: Play },
    { id: 'offline', label: 'Offline', count: stats.offline, icon: CircleOff },
    { id: 'installing', label: 'Installing', count: stats.installing, icon: Loader2 },
    { id: 'suspended', label: 'Suspended', count: stats.suspended, icon: Ban },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'name', label: 'Sort by name' },
    { value: 'status', label: 'Sort by status' },
    { value: 'node', label: 'Sort by node' },
  ];

  const summaryText =
    stats.total === 0
      ? 'No servers on your account yet — contact your host to get started.'
      : stats.running > 0
        ? `${stats.running} of ${stats.total} online · tap a stat to filter`
        : `${stats.total} server${stats.total === 1 ? '' : 's'} — none running right now`;

  const attentionCallout = useMemo(() => {
    if (stats.suspended > 0 && statusFilter !== 'suspended') {
      const first = list.find((s) => s.suspended);
      return {
        filter: 'suspended' as const,
        tone: 'warn' as const,
        icon: Ban,
        title: `${stats.suspended} suspended server${stats.suspended === 1 ? '' : 's'}`,
        detail: first ? `Includes “${first.name}”. Contact your host if you need this lifted.` : 'Contact your host if you need access restored.',
      };
    }
    if (stats.installing > 0 && statusFilter !== 'installing') {
      const first = list.find(isServerEffectivelyInstalling);
      return {
        filter: 'installing' as const,
        tone: 'info' as const,
        icon: Loader2,
        title: `${stats.installing} still installing`,
        detail: first ? `“${first.name}” is provisioning — open it to watch progress.` : 'Open a server to watch install progress.',
      };
    }
    if (stats.offline > 0 && stats.running === 0 && statusFilter !== 'offline') {
      return {
        filter: 'offline' as const,
        tone: 'muted' as const,
        icon: Power,
        title: 'All servers are offline',
        detail: 'Start one from its console when you are ready to play.',
      };
    }
    return null;
  }, [list, stats, statusFilter]);

  return (
    <ClientLayout>
      <Page>
        <div className="mb-4">
          <PanelAnnouncementBanner location="servers" />
        </div>

        <section className="ds-servers-page" aria-label="Your servers">
          <header className="ds-servers-fleet">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

            <div className="ds-servers-fleet-top">
              <div className="ds-servers-fleet-identity">
                {logoSrc ? (
                  <div className="ds-servers-fleet-mark">
                    <img src={logoSrc} alt="" />
                  </div>
                ) : (
                  <div
                    className="ds-servers-fleet-mark ds-servers-fleet-mark-fallback"
                    style={panelNameGradientStyle()}
                  >
                    {panelNameInitial(branding.panelName)}
                  </div>
                )}
                <div className="ds-servers-fleet-copy">
                  <p className="ds-servers-fleet-greeting">
                    {getGreeting()}
                    {user ? `, ${displayName(user)}` : ''}
                  </p>
                  <h1 className="ds-servers-fleet-title">My servers</h1>
                  <div className="ds-servers-fleet-brand">
                    <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
                    {branding.tagline ? (
                      <span className="ds-servers-fleet-tagline">{branding.tagline}</span>
                    ) : null}
                  </div>
                  {loading ? (
                    <p className="ds-servers-fleet-summary ds-servers-fleet-summary-loading">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                      Loading your servers…
                    </p>
                  ) : (
                    <p className="ds-servers-fleet-summary">{summaryText}</p>
                  )}
                </div>
              </div>

              <div className="ds-servers-fleet-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void refreshServersLive()}
                  disabled={refreshing || loading}
                  aria-label="Refresh servers"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {!loading && stats.total > 0 ? (
              <div className="ds-servers-fleet-stats" role="list" aria-label="Fleet summary">
                <FleetStat
                  label="Online"
                  value={stats.running}
                  tone="success"
                  active={statusFilter === 'running'}
                  onClick={() => toggleFilter('running')}
                />
                <FleetStat
                  label="Offline"
                  value={stats.offline}
                  active={statusFilter === 'offline'}
                  onClick={() => toggleFilter('offline')}
                />
                <FleetStat
                  label="Installing"
                  value={stats.installing}
                  tone="info"
                  active={statusFilter === 'installing'}
                  onClick={() => toggleFilter('installing')}
                />
                <FleetStat
                  label="Total"
                  value={stats.total}
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
              </div>
            ) : null}
          </header>

          {attentionCallout ? (
            <AttentionCallout
              tone={attentionCallout.tone}
              icon={attentionCallout.icon}
              spin={attentionCallout.filter === 'installing'}
              title={attentionCallout.title}
              detail={attentionCallout.detail}
              onClick={() => setStatusFilter(attentionCallout.filter)}
            />
          ) : null}

          {error && !loading && list.length > 0 ? (
            <AlertBanner tone="error" className="flex-wrap justify-between">
              <p>We couldn&apos;t refresh your servers. You&apos;re seeing the last saved list.</p>
              <Button type="button" variant="secondary" onClick={() => void refreshServersLive()}>
                Retry
              </Button>
            </AlertBanner>
          ) : null}

          {loading ? (
            <ListPageSkeleton />
          ) : list.length === 0 ? (
            error ? (
              <EmptyState
                icon={<DsIcon icon={Server} className="ds-icon--md" />}
                title="Couldn't load your servers"
                description="Check your connection and try again. If this keeps happening, contact support."
                action={
                  <Button type="button" onClick={() => void refreshServersLive()}>
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
            <div className="ds-servers-panel">
              <div className="ds-servers-panel-tools">
                <div className="ds-servers-fleet-pills" role="toolbar" aria-label="Filter by status">
                  {filterPills.map((pill) => {
                    const Icon = pill.icon;
                    const isActive = statusFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setStatusFilter(pill.id)}
                        className={`ds-filter-pill ${isActive ? 'is-active' : ''}`}
                        aria-pressed={isActive}
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

                <div className="ds-servers-fleet-controls">
                  <div className="ds-servers-fleet-search">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, egg, node, address…"
                      className="ds-field ds-field--icon-left ds-field--icon-right"
                      aria-label="Search servers"
                    />
                    {search ? (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="ds-servers-fleet-search-clear"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
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

              <div className="ds-servers-panel-meta">
                <p className="ds-servers-fleet-meta-text">
                  Showing <strong>{filtered.length}</strong>
                  {filtered.length !== list.length ? (
                    <>
                      {' '}
                      of <strong>{list.length}</strong>
                    </>
                  ) : null}{' '}
                  server{filtered.length === 1 ? '' : 's'}
                  <span className="hidden sm:inline"> · sorted by {sortLabel(sortKey)}</span>
                </p>
                {hasActiveFilters ? (
                  <button type="button" onClick={clearFilters} className="ds-btn ds-btn--ghost ds-btn--sm">
                    <X className="h-3 w-3" />
                    Clear filters
                  </button>
                ) : null}
              </div>

              <div className="ds-servers-panel-body">
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
                  <div className="ds-servers-fleet-grid">
                    {filtered.map((s) => (
                      <ServerCard key={s.id} server={s} />
                    ))}
                  </div>
                ) : (
                  <ServerListTable servers={filtered} />
                )}
              </div>
            </div>
          )}
        </section>
      </Page>
    </ClientLayout>
  );
}

function FleetStat({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'warn';
  active?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'success'
      ? 'ds-servers-stat--success'
      : tone === 'info'
        ? 'ds-servers-stat--info'
        : tone === 'warn'
          ? 'ds-servers-stat--warn'
          : '';

  return (
    <button
      type="button"
      role="listitem"
      className={`ds-servers-stat ${toneClass}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="ds-servers-stat-value">{value}</span>
      <span className="ds-servers-stat-label">{label}</span>
    </button>
  );
}

function AttentionCallout({
  tone,
  icon: Icon,
  spin,
  title,
  detail,
  onClick,
}: {
  tone: 'warn' | 'info' | 'muted';
  icon: typeof Server;
  spin?: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ds-servers-callout ds-servers-callout--${tone}`}
      onClick={onClick}
    >
      <span className="ds-servers-callout-icon" aria-hidden>
        <Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />
      </span>
      <span className="ds-servers-callout-body">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <ChevronRight className="ds-servers-callout-chevron h-4 w-4" aria-hidden />
    </button>
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
