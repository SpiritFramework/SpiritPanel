import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpCircle,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HardDrive,
  Package,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  type MinecraftPluginInstallEntry,
  type MinecraftPluginSearchHit,
} from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isMinecraftServer } from '../../lib/server-eggs';
import {
  categoriesForKind,
  formatPluginDownloads,
  formatRelativePluginDate,
  PLUGIN_SORT_OPTIONS,
  type PluginSortId,
} from '../../lib/minecraft-plugin-format';
import { sanitizeImageSrc, sanitizeLinkHref } from '../../lib/safe-url';
import { Button, FilterSelect } from '../../components/Layout';
import { Modal, Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import { PluginsHeader } from '../../components/server/plugins/PluginsHeader';
import { PluginCard } from '../../components/marketplace/PluginCard';
import {
  MarketplaceEmptyState,
  MarketplaceSegmentTabs,
} from '../../components/marketplace/MarketplaceChrome';

type InstalledSourceFilter = 'all' | 'updates' | 'modrinth' | 'disk';

type Tab = 'discover' | 'installed';

export function ServerPluginsPage() {
  const [searchParams] = useSearchParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('discover');
  const [installed, setInstalled] = useState<MinecraftPluginInstallEntry[]>([]);
  const [installedProjectIds, setInstalledProjectIds] = useState<string[]>([]);
  const [platformLabel, setPlatformLabel] = useState('Minecraft');
  const [kind, setKind] = useState('plugin');
  const [gameVersion, setGameVersion] = useState<string | null>(null);
  const [allowModrinth, setAllowModrinth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedForIdRef = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<PluginSortId>('downloads');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<MinecraftPluginSearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [offset, setOffset] = useState(0);
  const [installedFilter, setInstalledFilter] = useState('');
  const [installedSourceFilter, setInstalledSourceFilter] = useState<InstalledSourceFilter>('all');
  const limit = 24;

  const installedIds = useMemo(() => new Set(installedProjectIds), [installedProjectIds]);
  const updateCount = useMemo(() => installed.filter((i) => i.updateAvailable).length, [installed]);
  const onDiskCount = useMemo(() => installed.filter((i) => i.source === 'disk' || i.onDisk).length, [installed]);
  const categoryChips = useMemo(() => categoriesForKind(kind), [kind]);

  const refresh = useCallback(async () => {
    const data = await api.client.plugins(resolvedId);
    setInstalled(data.installed);
    setInstalledProjectIds(data.installedProjectIds ?? data.installed.map((i) => i.projectId).filter(Boolean) as string[]);
    setPlatformLabel(data.platformLabel);
    setKind(data.kind || 'plugin');
    setGameVersion(data.gameVersion);
    setAllowModrinth(data.allowModrinthInstalls !== false);
    setTab((current) => {
      if (current === 'installed') return current;
      return data.allowModrinthInstalls !== false ? 'discover' : 'installed';
    });
  }, [resolvedId]);

  const loadSearch = useCallback(
    async (nextOffset = 0, opts?: { q?: string; category?: string; sort?: PluginSortId }) => {
      const q = opts?.q ?? query;
      const cat = opts?.category ?? category;
      const index = opts?.sort ?? sort;
      setSearching(true);
      try {
        const data = await api.client.pluginsSearch(resolvedId, {
          q: q.trim() || undefined,
          offset: nextOffset,
          limit,
          index: q.trim() && index === 'downloads' ? 'relevance' : index,
          category: cat || undefined,
        });
        setHits(data.hits);
        setTotalHits(data.totalHits);
        setOffset(data.offset);
        if (data.platformLabel) setPlatformLabel(data.platformLabel);
        if (data.kind) setKind(data.kind);
        if (data.gameVersion !== undefined) setGameVersion(data.gameVersion);
      } finally {
        setSearching(false);
      }
    },
    [resolvedId, query, category, sort],
  );

  useEffect(() => {
    if (!resolvedId || !isMinecraftServer(server)) return;
    let cancelled = false;
    const soft = loadedForIdRef.current === resolvedId;
    if (!soft) setLoading(true);
    else setRefreshing(true);
    setError('');
    (async () => {
      try {
        await refresh();
        if (!cancelled) await loadSearch(0, { q: '', category: '', sort: 'downloads' });
        if (!cancelled) loadedForIdRef.current = resolvedId;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load plugins');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, server.id]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'installed' || tabParam === 'discover') setTab(tabParam);
  }, [searchParams]);

  const tabs = useMemo(() => {
    const items: Array<{ id: Tab; label: string; icon: typeof TrendingUp; badge?: number }> = [];
    if (allowModrinth) items.push({ id: 'discover', label: 'Browse', icon: TrendingUp });
    items.push({
      id: 'installed',
      label: 'Installed',
      icon: Package,
      badge: installed.length || undefined,
    });
    return items;
  }, [allowModrinth, installed.length]);

  const filteredInstalled = useMemo(() => {
    const q = installedFilter.trim().toLowerCase();
    if (!q) return installed;
    return installed.filter(
      (i) =>
        i.displayName.toLowerCase().includes(q) ||
        (i.projectSlug?.toLowerCase().includes(q) ?? false) ||
        i.filename.toLowerCase().includes(q) ||
        i.installPath.toLowerCase().includes(q),
    );
  }, [installed, installedFilter]);

  async function runAction(installId: string, action: 'uninstall' | 'update', label: string, installPath?: string) {
    setBusyId(installId);
    try {
      if (action === 'uninstall') await api.client.pluginsUninstall(resolvedId, installId, installPath);
      if (action === 'update') await api.client.pluginsUpdate(resolvedId, installId);
      await refresh();
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  function selectCategory(next: string) {
    const value = category === next ? '' : next;
    setCategory(value);
    void loadSearch(0, { category: value });
  }

  function selectSort(next: PluginSortId) {
    setSort(next);
    void loadSearch(0, { sort: next });
  }

  if (server.minecraftPluginsEnabled === false) {
    return (
      <ServerPage>
        <MarketplaceEmptyState
          icon={Package}
          title="Plugins disabled"
          description="Your host administrator has turned off the Minecraft plugin store."
        />
      </ServerPage>
    );
  }

  if (!isMinecraftServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState
          icon={Box}
          title="Minecraft only"
          description="The plugin store is available on Java Minecraft servers (Paper, Fabric, Forge, and more)."
        />
      </ServerPage>
    );
  }

  const heroNoun = kind === 'mod' ? 'mods' : kind === 'datapack' ? 'datapacks' : 'plugins';
  const routeLabel = heroNoun.charAt(0).toUpperCase() + heroNoun.slice(1);
  const installPathHint =
    kind === 'mod' ? 'mods/' : kind === 'datapack' ? 'world/datapacks/' : 'plugins/';

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
      if (tab === 'discover' && allowModrinth) await loadSearch(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh plugins');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ServerPage>
      <div className="ds-srv-plugins-shell mc-plugins-page">
        <PluginsHeader
          serverName={server.name}
          eggName={server.egg.name}
          eggLogoUrl={server.egg.logoUrl}
          routeLabel={routeLabel}
          platformLabel={platformLabel}
          gameVersion={gameVersion}
          installed={installed.length}
          updates={updateCount}
          refreshing={refreshing || loading}
          onRefresh={() => void handleRefresh()}
          onInstalledClick={() => {
            setInstalledSourceFilter('all');
            setTab('installed');
          }}
          onUpdatesClick={() => {
            setInstalledSourceFilter('updates');
            setTab('installed');
          }}
        />

        <div className="ds-srv-plugins-body">
          <div className="ds-srv-plugins-tabs">
            <MarketplaceSegmentTabs tabs={tabs} active={tab} onChange={setTab} />
            <p className="ds-srv-plugins-tabs-hint">
              One-click {heroNoun} · installs to <code>{installPathHint}</code>
              {onDiskCount > 0 ? ` · ${onDiskCount} on disk` : ''}
            </p>
          </div>

          {error ? <ServerErrorBanner message={error} /> : null}

          {loading ? (
            <div className="ds-srv-plugins-loading">
              <Spinner />
              <p>Loading {heroNoun}…</p>
            </div>
          ) : tab === 'discover' ? (
            <section className="ds-srv-plugins-panel">
              <form
                className="ds-srv-plugins-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  void loadSearch(0);
                }}
              >
                <div className="fm-search-row">
                  <div className="fm-search-input-wrap">
                    <Search className="fm-search-icon" aria-hidden />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${platformLabel} ${heroNoun}…`}
                      className="fm-search-input"
                      aria-label={`Search ${heroNoun}`}
                    />
                  </div>
                  <FilterSelect
                    value={sort}
                    onChange={(e) => selectSort(e.target.value as PluginSortId)}
                    aria-label="Sort plugins"
                    className="mc-sort-filter"
                  >
                    {PLUGIN_SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <Button type="submit" size="sm" disabled={searching}>
                    {searching ? 'Searching…' : 'Search'}
                  </Button>
                </div>
              </form>

              <div className="mc-cat-row" role="list" aria-label="Categories">
                <button
                  type="button"
                  role="listitem"
                  className={`mc-cat-chip${!category ? ' mc-cat-chip--active' : ''}`}
                  onClick={() => selectCategory('')}
                >
                  All
                </button>
                {categoryChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    role="listitem"
                    className={`mc-cat-chip${category === chip.id ? ' mc-cat-chip--active' : ''}`}
                    onClick={() => selectCategory(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <PluginsResultsHead
                title={
                  query.trim()
                    ? 'Search results'
                    : category
                      ? categoryChips.find((c) => c.id === category)?.label || 'Category'
                      : 'Popular'
                }
                description={
                  query.trim()
                    ? `Matches for “${query.trim()}” on ${platformLabel}`
                    : category
                      ? `${categoryChips.find((c) => c.id === category)?.label || 'Category'} · ${platformLabel} ${heroNoun}`
                      : `Top downloads on Modrinth for ${platformLabel}`
                }
                count={totalHits}
                searching={searching}
              />

              {searching && !hits.length ? (
                <div className="ds-srv-plugins-loading">
                  <Spinner />
                </div>
              ) : hits.length === 0 ? (
                <MarketplaceEmptyState
                  icon={Search}
                  title="No projects found"
                  description="Try another category or search, or set a concrete Minecraft version on the egg variables."
                />
              ) : (
                <div className={`mc-card-grid${searching ? ' mc-card-grid--dim' : ''}`}>
                  {hits.map((hit) => (
                    <PluginCard
                      key={hit.projectId}
                      item={hit}
                      to={`project/${encodeURIComponent(hit.slug || hit.projectId)}`}
                      installed={installedIds.has(hit.projectId)}
                    />
                  ))}
                </div>
              )}

              {totalHits > limit ? (
                <PluginsPagination
                  page={Math.floor(offset / limit) + 1}
                  totalPages={Math.max(1, Math.ceil(totalHits / limit))}
                  disabled={searching}
                  onChange={(page) => void loadSearch((page - 1) * limit)}
                />
              ) : null}
            </section>
          ) : (
            <section className="ds-srv-plugins-panel">
              <InstalledList
                items={filteredInstalled}
                total={installed.length}
                updateCount={updateCount}
                filter={installedFilter}
                onFilterChange={setInstalledFilter}
                sourceFilter={installedSourceFilter}
                onSourceFilterChange={setInstalledSourceFilter}
                canInstall={access.canInstallMarketplace}
                installPathHint={installPathHint}
                heroNoun={heroNoun}
                busyId={busyId}
                onUninstall={(item) =>
                  runAction(
                    item.id,
                    'uninstall',
                    'Removed',
                    item.source === 'disk' ? item.installPath : undefined,
                  )
                }
                onUpdate={(id) => void runAction(id, 'update', 'Updated')}
                onOpen={(item) => {
                  if (item.projectSlug || item.projectId) {
                    navigate(`project/${encodeURIComponent(item.projectSlug || item.projectId!)}`);
                  }
                }}
                onRefresh={() => void refresh()}
                onBrowse={() => setTab('discover')}
              />
            </section>
          )}
        </div>
      </div>
    </ServerPage>
  );
}

function PluginsResultsHead({
  title,
  description,
  count,
  searching,
}: {
  title: string;
  description: string;
  count: number;
  searching: boolean;
}) {
  return (
    <header className="ds-srv-plugins-results-head">
      <div className="ds-srv-plugins-results-identity">
        <span className="ds-srv-plugins-results-icon" aria-hidden>
          <TrendingUp className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="ds-srv-plugins-results-title">{title}</h3>
          <p className="ds-srv-plugins-results-desc">{description}</p>
        </div>
      </div>
      <div className="ds-srv-plugins-results-meta">
        {searching ? <span className="ds-srv-plugins-results-live">Updating…</span> : null}
        <span className="ds-srv-plugins-results-count" title={`${count.toLocaleString()} projects`}>
          <strong>{formatPluginDownloads(count)}</strong>
          <span>projects</span>
        </span>
      </div>
    </header>
  );
}

function InstalledList({
  items,
  total,
  updateCount,
  filter,
  onFilterChange,
  sourceFilter,
  onSourceFilterChange,
  canInstall,
  installPathHint,
  heroNoun,
  busyId,
  onUninstall,
  onUpdate,
  onOpen,
  onRefresh,
  onBrowse,
}: {
  items: MinecraftPluginInstallEntry[];
  total: number;
  updateCount: number;
  filter: string;
  onFilterChange: (v: string) => void;
  sourceFilter: InstalledSourceFilter;
  onSourceFilterChange: (v: InstalledSourceFilter) => void;
  canInstall: boolean;
  installPathHint: string;
  heroNoun: string;
  busyId: string | null;
  onUninstall: (item: MinecraftPluginInstallEntry) => Promise<void>;
  onUpdate: (id: string) => void;
  onOpen: (item: MinecraftPluginInstallEntry) => void;
  onRefresh: () => void;
  onBrowse: () => void;
}) {
  const [pendingRemove, setPendingRemove] = useState<MinecraftPluginInstallEntry | null>(null);
  const [removing, setRemoving] = useState(false);

  const modrinthCount = useMemo(
    () => items.filter((i) => i.source === 'modrinth' || Boolean(i.recognized)).length,
    [items],
  );
  const diskCount = useMemo(
    () => items.filter((i) => i.source === 'disk' && !i.recognized).length,
    [items],
  );

  const visible = useMemo(() => {
    let list = items;
    if (sourceFilter === 'updates') list = list.filter((i) => Boolean(i.updateAvailable));
    if (sourceFilter === 'modrinth') {
      list = list.filter((i) => i.source === 'modrinth' || Boolean(i.recognized));
    }
    if (sourceFilter === 'disk') {
      list = list.filter((i) => i.source === 'disk' && !i.recognized);
    }
    return [...list].sort((a, b) => {
      const au = a.updateAvailable ? 0 : 1;
      const bu = b.updateAvailable ? 0 : 1;
      if (au !== bu) return au - bu;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [items, sourceFilter]);

  const filters: Array<{
    id: InstalledSourceFilter;
    label: string;
    count?: number;
    icon: typeof Package;
  }> = [
    { id: 'all', label: 'All', count: items.length, icon: Package },
    { id: 'updates', label: 'Updates', count: updateCount || undefined, icon: ArrowUpCircle },
    { id: 'modrinth', label: 'Modrinth', count: modrinthCount || undefined, icon: TrendingUp },
    { id: 'disk', label: 'Manual', count: diskCount || undefined, icon: HardDrive },
  ];

  const headDesc =
    updateCount > 0
      ? `${updateCount} update${updateCount === 1 ? '' : 's'} ready · Modrinth & files in ${installPathHint}`
      : total > 0
        ? `All ${heroNoun} are current · Modrinth & files in ${installPathHint}`
        : `Install from Browse, or drop files into ${installPathHint}`;

  return (
    <div className="ds-srv-plugins-installed">
      <header className="ds-srv-plugins-installed-head">
        <div className="ds-srv-plugins-installed-identity">
          <span className="ds-srv-plugins-installed-icon" aria-hidden>
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="ds-srv-plugins-installed-title">Installed</h3>
            <p className="ds-srv-plugins-installed-desc">{headDesc}</p>
          </div>
        </div>
        <div className="ds-srv-plugins-installed-meta">
          {total > 0 ? (
            updateCount > 0 ? (
              <span className="ds-srv-plugins-installed-status ds-srv-plugins-installed-status--warn">
                <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
                {updateCount} update{updateCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="ds-srv-plugins-installed-status ds-srv-plugins-installed-status--ok">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Up to date
              </span>
            )
          ) : null}
          <span className="ds-srv-plugins-installed-count">
            <strong>{total}</strong>
            <span>{total === 1 ? 'install' : 'installs'}</span>
          </span>
        </div>
      </header>

      {!total ? (
        <div className="ds-srv-plugins-installed-empty">
          <MarketplaceEmptyState
            icon={Package}
            title="Nothing installed yet"
            description={`Browse Modrinth for one-click ${heroNoun}, or drop files into ${installPathHint} — we’ll detect them on rescan.`}
            action={
              <div className="ds-srv-plugins-installed-empty-actions">
                <Button type="button" size="sm" onClick={onBrowse}>
                  Browse catalog
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={onRefresh}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Rescan disk
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="ds-srv-plugins-installed-toolbar">
            <div className="fm-search-input-wrap ds-srv-plugins-installed-search">
              <Search className="fm-search-icon" aria-hidden />
              <input
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                placeholder="Filter by name, path, or slug…"
                className="fm-search-input"
                aria-label="Filter installed plugins"
              />
            </div>
            <button
              type="button"
              className="ds-srv-plugins-action-btn"
              onClick={onRefresh}
              aria-label="Rescan installed plugins"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <span className="ds-srv-plugins-action-label">Rescan</span>
            </button>
          </div>

          <div className="ds-srv-plugins-installed-filters" role="tablist" aria-label="Filter installed by source">
            {filters.map((f) => {
              const Icon = f.icon;
              const active = sourceFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={[
                    'ds-srv-plugins-installed-filter',
                    active ? 'ds-srv-plugins-installed-filter--active' : '',
                    f.id === 'updates' && updateCount > 0 ? 'ds-srv-plugins-installed-filter--warn' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSourceFilterChange(f.id)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {f.label}
                  {typeof f.count === 'number' ? (
                    <span className="ds-srv-plugins-installed-filter-count">{f.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className="ds-srv-plugins-installed-empty ds-srv-plugins-installed-empty--compact">
              <MarketplaceEmptyState
                icon={Search}
                title="No matches"
                description={
                  filter.trim()
                    ? 'Try a different search.'
                    : sourceFilter === 'updates'
                      ? 'Nothing needs updating right now.'
                      : 'Nothing in this filter.'
                }
              />
            </div>
          ) : (
            <div className="ds-srv-plugins-installed-list">
              {visible.map((item) => {
                const busy = busyId === item.id;
                const canOpen = Boolean(item.projectSlug || item.projectId);
                const installedAgo = formatRelativePluginDate(item.installedAt);
                const missing = item.source === 'modrinth' && item.onDisk === false;
                const iconUrl = sanitizeImageSrc(item.iconUrl);
                const modrinthUrl = sanitizeLinkHref(item.modrinthUrl);
                return (
                  <article
                    key={item.id}
                    className={[
                      'ds-srv-plugins-installed-card',
                      item.updateAvailable ? 'ds-srv-plugins-installed-card--update' : '',
                      missing ? 'ds-srv-plugins-installed-card--missing' : '',
                      busy ? 'ds-srv-plugins-installed-card--busy' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="ds-srv-plugins-installed-card-accent" aria-hidden />
                    <button
                      type="button"
                      className="ds-srv-plugins-installed-main"
                      onClick={() => canOpen && onOpen(item)}
                      disabled={!canOpen}
                      title={canOpen ? 'Open project' : undefined}
                    >
                      <div className="ds-srv-plugins-installed-thumb">
                        {iconUrl ? (
                          <img src={iconUrl} alt="" />
                        ) : (
                          <Package className="h-5 w-5" aria-hidden />
                        )}
                      </div>
                      <div className="ds-srv-plugins-installed-copy min-w-0">
                        <div className="ds-srv-plugins-installed-title-row">
                          <p className="ds-srv-plugins-installed-name">{item.displayName}</p>
                          {item.updateAvailable ? (
                            <span className="ds-srv-plugins-update-pill">
                              {item.versionNumber || 'installed'} → {item.updateAvailable.latestVersionNumber}
                            </span>
                          ) : null}
                        </div>
                        <div className="ds-srv-plugins-installed-badges">
                          {item.source === 'disk' ? (
                            <span className={`mc-chip ${item.recognized ? 'mc-chip--soft' : 'mc-chip--disk'}`}>
                              <HardDrive className="h-3 w-3" aria-hidden />
                              {item.recognized ? 'On disk · Modrinth' : 'Manual file'}
                            </span>
                          ) : (
                            <span className="mc-chip mc-chip--soft">v{item.versionNumber || '?'}</span>
                          )}
                          {missing ? <span className="mc-chip mc-chip--missing">File missing</span> : null}
                          {item.loaders.slice(0, 2).map((loader) => (
                            <span key={loader} className="mc-chip mc-chip--loader">
                              {loader}
                            </span>
                          ))}
                          {installedAgo ? (
                            <span className="ds-srv-plugins-installed-ago">{installedAgo}</span>
                          ) : null}
                        </div>
                        <p className="ds-srv-plugins-installed-path" title={item.installPath}>
                          <HardDrive className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{item.installPath}</span>
                        </p>
                      </div>
                    </button>
                    <div className="ds-srv-plugins-installed-actions">
                      {item.source === 'modrinth' && item.updateAvailable && canInstall ? (
                        <Button type="button" size="sm" disabled={busy} onClick={() => onUpdate(item.id)}>
                          {busy ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
                          )}
                          Update
                        </Button>
                      ) : null}
                      {canInstall ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setPendingRemove(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </Button>
                      ) : null}
                      {modrinthUrl ? (
                        <a
                          className="ds-srv-plugins-external"
                          href={modrinthUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Modrinth
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="ds-srv-plugins-installed-foot">
            Showing {visible.length} of {total}
            {filter.trim() || sourceFilter !== 'all' ? ' (filtered)' : ''} · Modrinth installs and files in{' '}
            {installPathHint}
          </p>
        </>
      )}

      <PluginRemoveModal
        item={pendingRemove}
        loading={removing}
        onClose={() => {
          if (!removing) setPendingRemove(null);
        }}
        onConfirm={async () => {
          if (!pendingRemove || removing) return;
          setRemoving(true);
          try {
            await onUninstall(pendingRemove);
            setPendingRemove(null);
          } catch {
            /* toast handled in runAction */
          } finally {
            setRemoving(false);
          }
        }}
      />
    </div>
  );
}

function PluginRemoveModal({
  item,
  loading,
  onClose,
  onConfirm,
}: {
  item: MinecraftPluginInstallEntry | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!item) return null;

  const isDisk = item.source === 'disk';
  const title = isDisk ? 'Remove file from server?' : 'Uninstall plugin?';
  const description = isDisk
    ? 'This deletes the JAR from disk. Restart the server if it is still loaded in memory.'
    : 'Removes this Modrinth install and deletes the file from the server.';
  const iconUrl = sanitizeImageSrc(item.iconUrl);

  return (
    <Modal
      open={Boolean(item)}
      onClose={loading ? () => {} : onClose}
      title={title}
      description="Please confirm before continuing."
      footer={
        <>
          <button type="button" className="ds-btn ds-btn--ghost ds-btn--md" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--md ds-btn--danger"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
            {loading ? 'Removing…' : isDisk ? 'Delete file' : 'Uninstall'}
          </button>
        </>
      }
    >
      <div className="mc-remove-modal">
        <div className="mc-remove-target">
          <div className="mc-card-icon mc-card-icon--sm">
            {iconUrl ? <img src={iconUrl} alt="" /> : <Package className="h-5 w-5" aria-hidden />}
          </div>
          <div className="min-w-0">
            <p className="mc-remove-name">{item.displayName}</p>
            <p className="mc-remove-meta">
              {item.versionNumber ? `v${item.versionNumber}` : isDisk ? 'On-disk file' : 'Installed'}
              {item.filename ? ` · ${item.filename}` : ''}
            </p>
            <p className="mc-remove-path" title={item.installPath}>
              {item.installPath}
            </p>
          </div>
        </div>
        <p className="mc-remove-copy">{description}</p>
        <div className="ds-alert ds-alert--warning">
          <AlertTriangle className="ds-icon ds-icon--md shrink-0" aria-hidden />
          <span>This cannot be undone. Reinstall from Modrinth or restore a backup if needed.</span>
        </div>
      </div>
    </Modal>
  );
}

function PluginsPagination({
  page,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);
  if (safeTotal <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, safePage - Math.floor(windowSize / 2));
  const end = Math.min(safeTotal, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="fm-pagination mc-pagination" aria-label="Plugin results pages">
      <button
        type="button"
        className="fm-page-btn"
        disabled={disabled || safePage <= 1}
        onClick={() => onChange(safePage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {start > 1 ? (
        <>
          <button
            type="button"
            className="fm-page-btn"
            disabled={disabled}
            onClick={() => onChange(1)}
          >
            1
          </button>
          {start > 2 ? <span className="fm-page-ellipsis">…</span> : null}
        </>
      ) : null}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`fm-page-btn${p === safePage ? ' fm-page-btn--active mc-page-btn--active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(p)}
          aria-current={p === safePage ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < safeTotal ? (
        <>
          {end < safeTotal - 1 ? <span className="fm-page-ellipsis">…</span> : null}
          <button
            type="button"
            className="fm-page-btn"
            disabled={disabled}
            onClick={() => onChange(safeTotal)}
          >
            {safeTotal}
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="fm-page-btn"
        disabled={disabled || safePage >= safeTotal}
        onClick={() => onChange(safePage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
