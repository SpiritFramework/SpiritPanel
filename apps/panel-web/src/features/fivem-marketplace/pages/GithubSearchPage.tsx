import { useCallback, useEffect, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { Github, Package, Search } from 'lucide-react';

import { api, type GithubSearchResult } from '../../../lib/api';

import { useServer } from '../../../context/ServerContext';

import { useServerRouteId } from '../../../hooks/useServerRouteId';

import { isFiveMServer } from '../../../lib/server-eggs';

import { useMarketplacePaths } from '../../../lib/marketplace-paths';

import { Spinner } from '../../../components/ui';

import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';

import { MarketplaceBackLink, MarketplaceEmptyState, ResourceHero } from '../components/Layout';

import { GithubFindPanel } from '../components/GithubFindPanel';

import { GithubRepoCard } from '../components/GithubRepoCard';

import { GithubPagination } from '../components/GithubPagination';

import {

  githubSearchSortLabel,

  parseGithubSearchSort,

  type GithubSearchSortId,

} from '../lib/github-search-sort';



export function GithubSearchPage() {

  const [searchParams] = useSearchParams();

  const resolvedId = useServerRouteId();

  const { server } = useServer();

  const navigate = useNavigate();

  const { base, scriptPath, githubSearchPath } = useMarketplacePaths();



  const q = searchParams.get('q') ?? '';

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const sort = parseGithubSearchSort(searchParams.get('sort'));



  const [searchInput, setSearchInput] = useState(q);

  const [sortInput, setSortInput] = useState<GithubSearchSortId>(sort);

  const [pasteUrl, setPasteUrl] = useState('');

  const [results, setResults] = useState<GithubSearchResult[]>([]);

  const [totalPages, setTotalPages] = useState(1);

  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const [searchError, setSearchError] = useState('');

  const [pasteError, setPasteError] = useState('');

  const [pasteResolving, setPasteResolving] = useState(false);



  useEffect(() => {

    setSearchInput(q);

    setSortInput(sort);

  }, [q, sort]);



  const runSearch = useCallback(

    async (term: string, nextPage: number, nextSort: GithubSearchSortId) => {

      const trimmed = term.trim();

      if (!trimmed) {

        setResults([]);

        setTotalPages(1);

        setTotalCount(0);

        return;

      }



      setLoading(true);

      setSearchError('');

      try {

        const data = await api.client.marketplaceGithubSearch(resolvedId, trimmed, nextPage, nextSort);

        setResults(data.results ?? []);

        setTotalPages(Math.max(1, data.totalPages ?? 1));

        setTotalCount(data.totalCount ?? data.results?.length ?? 0);

      } catch (err) {

        setSearchError(err instanceof Error ? err.message : 'Search failed');

        setResults([]);

      } finally {

        setLoading(false);

      }

    },

    [resolvedId],

  );



  useEffect(() => {

    if (!isFiveMServer(server) || !q.trim()) return;

    void runSearch(q, page, sort);

  }, [q, page, sort, runSearch, server]);



  function submitSearch() {

    const trimmed = searchInput.trim();

    if (!trimmed) return;

    navigate(githubSearchPath(trimmed, 1, sortInput));

  }



  function changeSort(nextSort: GithubSearchSortId) {

    setSortInput(nextSort);

    if (!q.trim()) return;

    navigate(githubSearchPath(q, 1, nextSort));

  }



  function setPage(next: number) {

    if (!q.trim()) return;

    navigate(githubSearchPath(q, next, sort));

  }



  async function resolvePaste() {

    const url = pasteUrl.trim();

    if (!url) return;

    setPasteError('');

    setPasteResolving(true);

    try {

      const resolved = await api.client.marketplaceGithubResolve(resolvedId, url);

      navigate(scriptPath(resolved.owner, resolved.repo));

    } catch (err) {

      setPasteError(err instanceof Error ? err.message : 'Invalid repository URL');

    } finally {

      setPasteResolving(false);

    }

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



  return (

    <ServerPage>

      <div className="ds-page ds-stack">

        <MarketplaceBackLink to={`${base}?tab=github`}>Back to GitHub</MarketplaceBackLink>



        <ResourceHero

          eyebrow="GitHub search"

          title={q.trim() ? `Results for “${q.trim()}”` : 'Search GitHub'}

          description={

            q.trim()

              ? `${totalCount > 0 ? `${totalCount.toLocaleString()} repositories found` : 'Searching the FiveM community on GitHub'} · sorted by ${githubSearchSortLabel(sort).toLowerCase()}`

              : 'Find scripts, libraries, and resources published on GitHub.'

          }

          icon={<Search className="h-7 w-7" />}

        />



        <GithubFindPanel

          searchInput={searchInput}

          pasteUrl={pasteUrl}

          searching={loading}

          searchError={searchError}

          pasteError={pasteError}

          pasteResolving={pasteResolving}

          sort={sortInput}

          onSortChange={changeSort}

          onSearchInputChange={setSearchInput}

          onPasteUrlChange={setPasteUrl}

          onSearch={submitSearch}

          onPasteOpen={() => void resolvePaste()}

        />



        {!q.trim() ? (

          <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">

            Enter a search term above to browse matching repositories.

          </div>

        ) : loading ? (

          <div className="flex justify-center py-20">

            <Spinner className="h-8 w-8" />

          </div>

        ) : searchError ? (

          <ServerErrorBanner message={searchError} />

        ) : results.length === 0 ? (

          <div className="ds-card ds-card-body py-12 text-center">

            <Github className="mx-auto h-8 w-8 text-[var(--muted)]" />

            <p className="mt-3 text-sm text-[var(--muted)]">No repositories matched your search. Try different keywords.</p>

          </div>

        ) : (

          <section className="ds-stack">

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

      </div>

    </ServerPage>

  );

}


