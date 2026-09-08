import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Compass, Package } from 'lucide-react';
import { api, type GithubSearchResult } from '../../../lib/api';
import { useServer } from '../../../context/ServerContext';
import { useServerRouteId } from '../../../hooks/useServerRouteId';
import { isFiveMServer } from '../../../lib/server-eggs';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { Button, FilterSelect } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';
import { MarketplaceBackLink, MarketplaceEmptyState, ResourceHero } from '../components/Layout';
import { GithubCategorySection } from '../components/GithubCategorySection';
import { GithubCategoryPicker } from '../components/GithubCategoryPicker';
import { GithubRepoCard } from '../components/GithubRepoCard';
import { GithubPagination } from '../components/GithubPagination';
import { GITHUB_BROWSE_CATEGORIES, githubCategoryById } from '../lib/github-categories';
import {
  GITHUB_SEARCH_SORT_OPTIONS,
  githubSearchSortLabel,
  parseGithubSearchSort,
  type GithubSearchSortId,
} from '../lib/github-search-sort';

export function GithubBrowsePage() {
  const { categoryId } = useParams<{ categoryId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const navigate = useNavigate();
  const { base, scriptPath, githubBrowsePath } = useMarketplacePaths();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const sort = parseGithubSearchSort(searchParams.get('sort') || 'stars');
  const category = categoryId ? githubCategoryById(categoryId) : undefined;
  const query = category?.query;
  const CategoryIcon = category?.icon ?? Compass;

  const [results, setResults] = useState<GithubSearchResult[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const prevCategoryRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevCategoryRef.current === undefined) {
      prevCategoryRef.current = categoryId;
      return;
    }
    if (prevCategoryRef.current !== categoryId) {
      prevCategoryRef.current = categoryId;
      setSearchParams({}, { replace: true });
    }
  }, [categoryId, setSearchParams]);

  const load = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.client.marketplaceGithubSearch(resolvedId, query, page, sort);
      setResults(data.results ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scripts');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedId, query, page, sort]);

  useEffect(() => {
    if (!isFiveMServer(server) || !query) return;
    void load();
  }, [load, query, server]);

  function openCategory(nextCategoryId: string) {
    navigate(githubBrowsePath(nextCategoryId), { replace: true });
  }

  function setPage(next: number) {
    const params = new URLSearchParams();
    if (next > 1) params.set('page', String(next));
    if (sort !== 'stars') params.set('sort', sort);
    setSearchParams(params, { replace: true });
  }

  function setSort(nextSort: GithubSearchSortId) {
    const params = new URLSearchParams();
    if (nextSort !== 'stars') params.set('sort', nextSort);
    setSearchParams(params, { replace: true });
  }

  if (server.marketplaceEnabled === false) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="Marketplace disabled" />
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="FiveM only" />
      </ServerPage>
    );
  }

  const title = category ? category.label : 'Browse GitHub';
  const description = category
    ? category.description
    : 'Pick a category to explore popular FiveM scripts from the community.';

  return (
    <ServerPage>
      <div className="ds-page ds-stack">
        <MarketplaceBackLink to={`${base}?tab=github`}>Back to GitHub</MarketplaceBackLink>

        <ResourceHero
          eyebrow="GitHub browse"
          title={title}
          description={description}
          icon={<CategoryIcon className="h-7 w-7" />}
        />

        {!categoryId ? (
          <GithubCategorySection
            title="All categories"
            description="Choose a script type to browse matching repositories on GitHub"
            categories={GITHUB_BROWSE_CATEGORIES}
            onSelect={(cat) => openCategory(cat.id)}
          />
        ) : !category ? (
          <div className="ds-card ds-card-body py-12 text-center">
            <p className="text-sm text-[var(--muted)]">Unknown category.</p>
            <Button className="mt-4" size="sm" variant="secondary" onClick={() => navigate(githubBrowsePath())}>
              Browse all categories
            </Button>
          </div>
        ) : (
          <>
            <GithubCategoryPicker
              activeId={categoryId}
              onSelect={openCategory}
              onBrowseAll={() => navigate(githubBrowsePath())}
            />

            {error ? <ServerErrorBanner message={error} /> : null}

            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner className="h-8 w-8" />
              </div>
            ) : results.length === 0 ? (
              <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">
                No scripts found in this category. Try another category or search manually.
              </div>
            ) : (
              <section className="ds-stack">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    Page {page} of {totalPages} · {results.length} repositories · sorted by{' '}
                    {githubSearchSortLabel(sort).toLowerCase()}
                  </p>
                  <FilterSelect
                    value={sort}
                    onChange={(e) => setSort(e.target.value as GithubSearchSortId)}
                    aria-label="Sort browse results"
                    className="w-full sm:w-auto sm:min-w-[10.5rem]"
                  >
                    {GITHUB_SEARCH_SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((item) => (
                    <GithubRepoCard
                      key={`${item.owner}/${item.name}`}
                      item={item}
                      onOpen={(owner, repo) => navigate(scriptPath(owner, repo))}
                    />
                  ))}
                </div>
                <GithubPagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
              </section>
            )}
          </>
        )}
      </div>
    </ServerPage>
  );
}
