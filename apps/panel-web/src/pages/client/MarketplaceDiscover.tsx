import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  Car,
  ChevronLeft,
  ChevronRight,
  Github,
  Home,
  LayoutGrid,
  MapPin,
  Mic,
  Package,
  Radio,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  type FivemServerLayout,
  type GithubFeaturedScript,
  type GithubSearchResult,
} from '../../lib/api';
import { parseGithubOwnerRepo, useMarketplacePaths } from '../../lib/marketplace-paths';
import {
  getMarketplaceCache,
  getMarketplaceCacheStale,
  marketplaceCacheKey,
  setMarketplaceCache,
} from '../../lib/marketplace-cache';
import { previewFromSearchResult } from '../../lib/marketplace-script-state';
import { RepoCard } from '../../components/marketplace/RepoCard';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { MarketplaceAlert, MarketplaceSectionHead } from '../../components/marketplace/MarketplaceChrome';

const FEATURED_PER_PAGE = 12;
const FEATURED_CACHE_TTL = 5 * 60 * 1000;
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

const BROWSE_CATEGORIES = [
  { id: 'standalone', label: 'Standalone', query: 'standalone', icon: Package },
  { id: 'garage', label: 'Garages', query: 'garage', icon: Car },
  { id: 'jobs', label: 'Jobs', query: 'job', icon: Briefcase },
  { id: 'housing', label: 'Housing', query: 'housing', icon: Home },
  { id: 'hud', label: 'HUD / UI', query: 'hud', icon: LayoutGrid },
  { id: 'inventory', label: 'Inventory', query: 'inventory', icon: Package },
  { id: 'dispatch', label: 'Dispatch', query: 'dispatch', icon: Radio },
  { id: 'voice', label: 'Voice', query: 'voice', icon: Mic },
] as const;

function layoutLabel(layout: FivemServerLayout | null | undefined): string {
  if (!layout || layout.confidence === 'low') return 'Default paths (could not scan server)';
  if (layout.layout === 'txadmin' && layout.profileName) {
    return `txAdmin · ${layout.profileName}`;
  }
  if (layout.layout === 'flat') return 'Standard resources folder';
  return 'Detected server layout';
}

export function MarketplaceDiscover({ serverId }: { serverId: string }) {
  const navigate = useNavigate();
  const { scriptPath } = useMarketplacePaths();

  const [serverLayout, setServerLayout] = useState<FivemServerLayout | null>(null);

  const [featured, setFeatured] = useState<GithubFeaturedScript[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredPage, setFeaturedPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchResults, setSearchResults] = useState<GithubSearchResult[]>([]);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const [community, setCommunity] = useState<GithubSearchResult[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityTotalPages, setCommunityTotalPages] = useState(1);
  const searchGenerationRef = useRef(0);

  const loadFeatured = useCallback(async () => {
    const cacheKey = marketplaceCacheKey(serverId, 'featured');
    const cached = getMarketplaceCache<GithubFeaturedScript[]>(cacheKey);
    if (cached) {
      setFeatured(cached);
      setFeaturedLoading(false);
      return;
    }

    const stale = getMarketplaceCacheStale<GithubFeaturedScript[]>(cacheKey);
    if (stale) {
      setFeatured(stale);
      setFeaturedLoading(false);
    } else {
      setFeaturedLoading(true);
    }

    try {
      const { featured: items } = await api.client.marketplaceGithubFeatured(serverId);
      setFeatured(items);
      setMarketplaceCache(cacheKey, items, FEATURED_CACHE_TTL);
    } catch {
      if (!stale) setFeatured([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    let cancelled = false;
    api.client
      .marketplaceLayout(serverId)
      .then((data) => {
        if (!cancelled) setServerLayout(data.layout);
      })
      .catch(() => {
        if (!cancelled) setServerLayout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const loadCommunity = useCallback(
    async (page = 1, term = '') => {
      const cacheKey = marketplaceCacheKey(serverId, 'search', term, page);
      const cached = getMarketplaceCache<{ results: GithubSearchResult[]; totalPages: number }>(cacheKey);
      if (cached) {
        setCommunity(cached.results);
        setCommunityTotalPages(cached.totalPages);
        setCommunityLoading(false);
        return;
      }

      setCommunityLoading(true);
      try {
        const data = await api.client.marketplaceGithubSearch(serverId, term, page);
        setCommunity(data.results);
        setCommunityTotalPages(data.totalPages);
        setMarketplaceCache(cacheKey, { results: data.results, totalPages: data.totalPages }, SEARCH_CACHE_TTL);
      } catch {
        setCommunity([]);
      } finally {
        setCommunityLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    if (!searchMode) {
      setCommunityPage(1);
      void loadCommunity(1, '');
    }
  }, [searchMode, loadCommunity]);

  useEffect(() => {
    const maxFeatured = Math.max(1, Math.ceil(featured.length / FEATURED_PER_PAGE));
    if (featuredPage > maxFeatured) setFeaturedPage(maxFeatured);
  }, [featured.length, featuredPage]);

  function goToRepo(urlOrOwnerRepo: string) {
    const parsed = parseGithubOwnerRepo(urlOrOwnerRepo);
    if (!parsed) {
      setPasteError('Enter a valid GitHub URL or owner/repo');
      return;
    }
    setPasteError('');
    navigate(scriptPath(parsed.owner, parsed.repo), {
      state: { preview: { owner: parsed.owner, repo: parsed.repo, name: parsed.repo } },
    });
  }

  function browseCategory(cat: (typeof BROWSE_CATEGORIES)[number]) {
    setActiveCategoryId(cat.id);
    setSearchInput(cat.query);
    void runSearch(1, cat.query);
  }

  async function runSearch(page = 1, termOverride?: string) {
    const term = (termOverride ?? searchInput).trim();
    if (termOverride) setSearchInput(termOverride);
    if (termOverride && !BROWSE_CATEGORIES.some((c) => c.query === termOverride)) {
      setActiveCategoryId(null);
    }

    const cacheKey = marketplaceCacheKey(serverId, 'search', term, page);
    const cached = getMarketplaceCache<{ results: GithubSearchResult[]; totalPages: number }>(cacheKey);
    const generation = ++searchGenerationRef.current;

    setSearchMode(true);
    setSearchPage(page);
    setSearchError('');

    if (cached) {
      setSearchResults(cached.results);
      setSearchTotalPages(cached.totalPages);
      setSearching(false);
      if (cached.results.length === 0) {
        setSearchError(term ? 'No FiveM repositories found — try ox_lib, garage, hud, etc.' : 'No FiveM scripts found.');
      }
      return;
    }

    setSearching(true);
    try {
      const data = await api.client.marketplaceGithubSearch(serverId, term, page);
      if (generation !== searchGenerationRef.current) return;
      setSearchResults(data.results);
      setSearchTotalPages(data.totalPages);
      setMarketplaceCache(cacheKey, { results: data.results, totalPages: data.totalPages }, SEARCH_CACHE_TTL);
      if (data.results.length === 0) {
        setSearchError(term ? 'No FiveM repositories found — try ox_lib, garage, hud, etc.' : 'No FiveM scripts found.');
      }
    } catch (err) {
      if (generation !== searchGenerationRef.current) return;
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      if (generation === searchGenerationRef.current) setSearching(false);
    }
  }

  function clearSearch() {
    setSearchMode(false);
    setSearchResults([]);
    setSearchError('');
    setSearchPage(1);
    setFeaturedPage(1);
    setCommunityPage(1);
    setActiveCategoryId(null);
    void loadCommunity(1, '');
  }

  const featuredPages = Math.max(1, Math.ceil(featured.length / FEATURED_PER_PAGE));
  const featuredSlice = useMemo(
    () => featured.slice((featuredPage - 1) * FEATURED_PER_PAGE, featuredPage * FEATURED_PER_PAGE),
    [featured, featuredPage],
  );

  const featuredCards = useMemo(
    () =>
      featuredSlice.map((item) => ({
        key: item.githubUrl,
        item,
        to: scriptPath(item.owner, item.repo),
        preview: previewFromSearchResult(item, { blurb: item.blurb, category: item.category }),
        subtitle: item.blurb || item.description,
        category: item.category,
      })),
    [featuredSlice, scriptPath],
  );

  const searchCards = useMemo(
    () =>
      searchResults.map((item) => ({
        key: item.githubUrl,
        item,
        to: scriptPath(item.owner, item.repo),
        preview: previewFromSearchResult(item),
      })),
    [searchResults, scriptPath],
  );

  const communityCards = useMemo(
    () =>
      community.map((item) => ({
        key: item.githubUrl,
        item,
        to: scriptPath(item.owner, item.repo),
        preview: previewFromSearchResult(item),
      })),
    [community, scriptPath],
  );

  return (
    <div className="fm-discover">
      {serverLayout && serverLayout.confidence !== 'low' && (
        <div className="fm-layout-banner">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text)]">Auto-detected: {layoutLabel(serverLayout)}</p>
            <p className="truncate font-mono text-[10px] text-[var(--muted)]">
              {(serverLayout.resourcesPath ?? serverLayout.resourcesBase)} · {serverLayout.cfgFile}
            </p>
          </div>
        </div>
      )}

      <section className="fm-search-panel">
        <div className="fm-search-row">
          <div className="fm-search-input-wrap">
            <Search className="fm-search-icon" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setActiveCategoryId(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch(1)}
              placeholder="Search FiveM scripts on GitHub…"
              className="fm-search-input"
            />
          </div>
          <Button type="button" disabled={searching} onClick={() => void runSearch(1)}>
            {searching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
          {searchMode && (
            <Button type="button" variant="subtle" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>

        <div className="fm-url-block">
          <div className="fm-url-row">
            <span className="fm-url-label">
              <Github className="h-3.5 w-3.5" aria-hidden />
              Install from URL
            </span>
            <input
              value={pasteUrl}
              onChange={(e) => {
                setPasteUrl(e.target.value);
                setPasteError('');
              }}
              placeholder="github.com/owner/repo"
              className="fm-url-input"
              onKeyDown={(e) => e.key === 'Enter' && pasteUrl.trim() && goToRepo(pasteUrl)}
            />
            <Button
              type="button"
              variant="subtle"
              disabled={!pasteUrl.trim()}
              onClick={() => goToRepo(pasteUrl)}
            >
              Open
            </Button>
          </div>
        </div>

        <div className="fm-categories">
          <span className="fm-categories-label">Browse</span>
          <div className="flex flex-wrap gap-1.5">
            {BROWSE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => browseCategory(cat)}
                  className={`fm-cat-chip${active ? ' fm-cat-chip--active' : ''}`}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {pasteError && (
        <MarketplaceAlert>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {pasteError}
        </MarketplaceAlert>
      )}

      {searchError && (
        <MarketplaceAlert>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {searchError}
        </MarketplaceAlert>
      )}

      {searchMode ? (
        <section className="fm-section">
          <MarketplaceSectionHead icon={Search} title="Search results" count={searchResults.length} />
          {searching ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              <div className="fm-grid">
                {searchResults.length === 0 ? (
                  <p className="col-span-full text-sm text-[var(--muted)]">No results on this page.</p>
                ) : (
                  searchCards.map((card) => (
                    <RepoCard
                      key={card.key}
                      item={card.item}
                      to={card.to}
                      preview={card.preview}
                      fivemOnly
                    />
                  ))
                )}
              </div>
              <Pagination page={searchPage} totalPages={searchTotalPages} onChange={(p) => void runSearch(p)} />
            </>
          )}
        </section>
      ) : (
        <>
          <section className="fm-section">
            <MarketplaceSectionHead
              icon={TrendingUp}
              title="Featured FiveM scripts"
              description="Curated popular resources from the community"
              count={featured.length}
              accent
            />
            {featuredLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                <div className="fm-grid">
                  {featuredSlice.length === 0 ? (
                    <p className="col-span-full text-sm text-[var(--muted)]">No scripts on this page.</p>
                  ) : (
                    featuredCards.map((card) => (
                      <RepoCard
                        key={card.key}
                        item={card.item}
                        to={card.to}
                        preview={card.preview}
                        subtitle={card.subtitle}
                        category={card.category}
                        showFivemBadge
                      />
                    ))
                  )}
                </div>
                <Pagination page={featuredPage} totalPages={featuredPages} onChange={setFeaturedPage} />
              </>
            )}
          </section>

          <section className="fm-section">
            <MarketplaceSectionHead
              icon={Github}
              title="More community scripts"
              description="Recently updated repositories on GitHub"
              count={community.length}
            />
            {communityLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : community.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No scripts found — try a category above or paste a GitHub URL.
              </p>
            ) : (
              <>
                <div className="fm-grid">
                  {communityCards.map((card) => (
                    <RepoCard
                      key={card.key}
                      item={card.item}
                      to={card.to}
                      preview={card.preview}
                      fivemOnly
                    />
                  ))}
                </div>
                <Pagination
                  page={communityPage}
                  totalPages={communityTotalPages}
                  onChange={(p) => {
                    setCommunityPage(p);
                    void loadCommunity(p, '');
                  }}
                />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);
  if (safeTotal <= 1) return null;

  const pages = Array.from({ length: Math.min(safeTotal, 7) }, (_, i) => i + 1);

  return (
    <nav className="fm-pagination" aria-label="Pagination">
      <button type="button" className="fm-page-btn" disabled={safePage <= 1} onClick={() => onChange(safePage - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`fm-page-btn${p === safePage ? ' fm-page-btn--active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      {safeTotal > 7 && <span className="px-1 text-xs text-[var(--muted)]">…</span>}
      <button
        type="button"
        className="fm-page-btn"
        disabled={safePage >= safeTotal}
        onClick={() => onChange(safePage + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

