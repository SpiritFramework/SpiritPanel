import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, TrendingUp } from 'lucide-react';
import { api, type GithubFeaturedScript, type GithubSearchResult } from '../../../lib/api';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { Spinner } from '../../../components/ui';
import { MarketplaceSectionHead } from '../../../components/marketplace/MarketplaceChrome';
import { GithubFindPanel } from '../components/GithubFindPanel';
import { GithubCategorySection } from '../components/GithubCategorySection';
import { GithubRepoCard } from '../components/GithubRepoCard';
import { GithubPagination } from '../components/GithubPagination';
import {
  GITHUB_BROWSE_CATEGORIES,
  GITHUB_FEATURED_PAGE_SIZE,
} from '../lib/github-categories';
import { type GithubSearchSortId } from '../lib/github-search-sort';

export function MarketplaceGithubTab({
  serverId,
  onOpenRepo,
}: {
  serverId: string;
  onOpenRepo: (owner: string, repo: string) => void;
}) {
  const navigate = useNavigate();
  const { githubBrowsePath, githubSearchPath } = useMarketplacePaths();

  const [featured, setFeatured] = useState<GithubFeaturedScript[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredPage, setFeaturedPage] = useState(1);

  const [community, setCommunity] = useState<GithubSearchResult[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityTotalPages, setCommunityTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [searchSort, setSearchSort] = useState<GithubSearchSortId>('best');
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [pasteResolving, setPasteResolving] = useState(false);

  useEffect(() => {
    setFeaturedLoading(true);
    api.client
      .marketplaceGithubFeatured(serverId)
      .then((r) => setFeatured(r.featured))
      .catch(() => setFeatured([]))
      .finally(() => setFeaturedLoading(false));
  }, [serverId]);

  const loadCommunity = useCallback(
    async (page: number) => {
      setCommunityLoading(true);
      try {
        const data = await api.client.marketplaceGithubSearch(serverId, 'fivem', page, 'stars');
        setCommunity(data.results ?? []);
        setCommunityTotalPages(Math.max(1, data.totalPages ?? 1));
      } catch {
        setCommunity([]);
        setCommunityTotalPages(1);
      } finally {
        setCommunityLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    void loadCommunity(communityPage);
  }, [communityPage, loadCommunity]);

  const featuredPages = Math.max(1, Math.ceil(featured.length / GITHUB_FEATURED_PAGE_SIZE));
  const featuredSlice = useMemo(() => {
    const start = (featuredPage - 1) * GITHUB_FEATURED_PAGE_SIZE;
    return featured.slice(start, start + GITHUB_FEATURED_PAGE_SIZE);
  }, [featured, featuredPage]);

  useEffect(() => {
    if (featuredPage > featuredPages) setFeaturedPage(featuredPages);
  }, [featuredPage, featuredPages]);

  function goToSearch() {
    const q = searchInput.trim();
    if (!q) return;
    navigate(githubSearchPath(q, 1, searchSort));
  }

  async function resolvePaste() {
    const url = pasteUrl.trim();
    if (!url) return;
    setPasteError('');
    setPasteResolving(true);
    try {
      const resolved = await api.client.marketplaceGithubResolve(serverId, url);
      onOpenRepo(resolved.owner, resolved.repo);
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : 'Invalid repository URL');
    } finally {
      setPasteResolving(false);
    }
  }

  return (
    <section className="ds-srv-plugins-panel ds-srv-mp-panel ds-srv-mp-github">
      <GithubFindPanel
        searchInput={searchInput}
        pasteUrl={pasteUrl}
        searching={false}
        searchError=""
        pasteError={pasteError}
        pasteResolving={pasteResolving}
        sort={searchSort}
        onSortChange={setSearchSort}
        onSearchInputChange={setSearchInput}
        onPasteUrlChange={setPasteUrl}
        onSearch={goToSearch}
        onPasteOpen={() => void resolvePaste()}
      />

      <GithubCategorySection
        categories={GITHUB_BROWSE_CATEGORIES.slice(0, 8)}
        onSelect={(cat) => navigate(githubBrowsePath(cat.id))}
        action={
          <Link
            to={githubBrowsePath()}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            <Compass className="h-3.5 w-3.5" />
            All categories
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="ds-srv-mp-block">
        <MarketplaceSectionHead
          icon={TrendingUp}
          title="Featured community scripts"
          description={`Curated high-quality resources · ${featured.length} total`}
          count={featured.length}
          accent
        />

        {featuredLoading && featuredSlice.length === 0 ? (
          <div className="ds-srv-plugins-loading" role="status">
            <Spinner className="h-7 w-7" />
            <span className="sr-only">Loading featured scripts</span>
          </div>
        ) : featuredSlice.length === 0 ? (
          <p className="ds-srv-mp-inline-empty">Featured scripts will appear here once loaded.</p>
        ) : (
          <>
            <div className="mc-card-grid">
              {featuredSlice.map((item) => (
                <GithubRepoCard key={`${item.owner}/${item.repo}`} item={item} onOpen={onOpenRepo} />
              ))}
            </div>
            <GithubPagination
              page={featuredPage}
              totalPages={featuredPages}
              onPageChange={setFeaturedPage}
              disabled={featuredLoading}
            />
          </>
        )}
      </div>

      <div className="ds-srv-mp-block">
        <MarketplaceSectionHead
          icon={Compass}
          title="More from GitHub"
          description="Recently popular FiveM repositories"
          action={
            <Link
              to={githubBrowsePath('libraries')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Browse all
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />

        {communityLoading && community.length === 0 ? (
          <div className="ds-srv-plugins-loading" role="status">
            <Spinner className="h-7 w-7" />
            <span className="sr-only">Loading community scripts</span>
          </div>
        ) : community.length === 0 ? (
          <p className="ds-srv-mp-inline-empty">
            No community scripts loaded right now. Try browsing a category or searching GitHub.
          </p>
        ) : (
          <>
            <div className="mc-card-grid">
              {community.map((item) => (
                <GithubRepoCard key={`${item.owner}/${item.name}`} item={item} onOpen={onOpenRepo} />
              ))}
            </div>
            <GithubPagination
              page={communityPage}
              totalPages={communityTotalPages}
              onPageChange={setCommunityPage}
              disabled={communityLoading}
            />
          </>
        )}
      </div>
    </section>
  );
}
