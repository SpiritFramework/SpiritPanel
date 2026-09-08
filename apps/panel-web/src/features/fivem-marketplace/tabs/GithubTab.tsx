import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, TrendingUp } from 'lucide-react';
import { api, type GithubFeaturedScript, type GithubSearchResult } from '../../../lib/api';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { Spinner } from '../../../components/ui';
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
    <div className="ds-stack">
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

      <section className="ds-stack">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              Featured community scripts
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Curated high-quality resources — {featured.length} total
            </p>
          </div>
        </div>

        {featuredLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : featuredSlice.length === 0 ? (
          <div className="ds-card ds-card-body py-10 text-center text-sm text-[var(--muted)]">
            Featured scripts will appear here once loaded.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </section>

      <section className="ds-stack">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">More from GitHub</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Recently popular FiveM repositories</p>
          </div>
          <Link
            to={githubBrowsePath('libraries')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Browse all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {communityLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : community.length === 0 ? (
          <div className="ds-card ds-card-body py-10 text-center text-sm text-[var(--muted)]">
            No community scripts loaded right now. Try browsing a category or searching GitHub.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </section>
    </div>
  );
}
