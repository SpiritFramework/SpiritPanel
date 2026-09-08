import { Github, Link2, Search } from 'lucide-react';
import { Button, FilterSelect } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';
import { IconField } from './IconField';
import {
  GITHUB_SEARCH_SORT_OPTIONS,
  type GithubSearchSortId,
} from '../lib/github-search-sort';

export function GithubFindPanel({
  searchInput,
  pasteUrl,
  searching,
  searchError,
  pasteError,
  pasteResolving = false,
  sort = 'best',
  onSortChange,
  onSearchInputChange,
  onPasteUrlChange,
  onSearch,
  onPasteOpen,
}: {
  searchInput: string;
  pasteUrl: string;
  searching: boolean;
  searchError: string;
  pasteError: string;
  pasteResolving?: boolean;
  sort?: GithubSearchSortId;
  onSortChange?: (sort: GithubSearchSortId) => void;
  onSearchInputChange: (value: string) => void;
  onPasteUrlChange: (value: string) => void;
  onSearch: () => void;
  onPasteOpen: () => void;
}) {
  return (
    <section className="ds-marketplace-find" aria-label="Find a GitHub repository">
      <div className="ds-marketplace-find__grid">
        <div>
          <label className="ds-label" htmlFor="github-marketplace-search">
            Search GitHub
          </label>
          <div className="ds-marketplace-find__row">
            <div className="min-w-0 flex-1">
              <IconField
                id="github-marketplace-search"
                icon={Search}
                placeholder="e.g. ox_lib, qb-policejob…"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>
            {onSortChange ? (
              <FilterSelect
                value={sort}
                onChange={(e) => onSortChange(e.target.value as GithubSearchSortId)}
                aria-label="Sort search results"
                className="w-full shrink-0 sm:w-auto sm:min-w-[10rem]"
              >
                {GITHUB_SEARCH_SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </FilterSelect>
            ) : null}
            <Button
              type="button"
              className="shrink-0 sm:min-w-[5.25rem]"
              onClick={onSearch}
              disabled={searching || !searchInput.trim()}
            >
              {searching ? <Spinner className="h-4 w-4" /> : 'Search'}
            </Button>
          </div>
          {searchError ? <p className="ds-field-error mt-1.5">{searchError}</p> : null}
        </div>

        <div>
          <label className="ds-label" htmlFor="github-marketplace-paste">
            Paste repo URL
          </label>
          <div className="ds-marketplace-find__row">
            <div className="min-w-0 flex-1">
              <IconField
                id="github-marketplace-paste"
                icon={Link2}
                mono
                placeholder="github.com/owner/repo"
                value={pasteUrl}
                onChange={(e) => onPasteUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onPasteOpen()}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 sm:min-w-[5.25rem]"
              onClick={onPasteOpen}
              disabled={!pasteUrl.trim() || pasteResolving}
            >
              {pasteResolving ? <Spinner className="h-4 w-4" /> : (
                <>
                  <Github className="h-3.5 w-3.5" aria-hidden />
                  Open
                </>
              )}
            </Button>
          </div>
          {pasteError ? <p className="ds-field-error mt-1.5">{pasteError}</p> : null}
        </div>
      </div>
    </section>
  );
}
