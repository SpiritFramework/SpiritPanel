import { ArrowRight, Star } from 'lucide-react';
import type { GithubFeaturedScript, GithubSearchResult } from '../../../lib/api';
import { formatStars, languageAccent } from '../../../lib/marketplace-format';
import { GITHUB_CATEGORY_LABELS } from '../lib/github-categories';
import { GithubRepoAvatar } from './GithubRepoAvatar';

type RepoItem = GithubSearchResult | GithubFeaturedScript;

function categoryLabel(category: string | undefined): string | null {
  if (!category) return null;
  return GITHUB_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

export function GithubRepoCard({
  item,
  onOpen,
}: {
  item: RepoItem;
  onOpen: (owner: string, repo: string) => void;
}) {
  const repoName = 'repo' in item && item.repo ? item.repo : item.name;
  const blurb = 'blurb' in item ? item.blurb : undefined;
  const description = blurb || item.description;
  const category = 'category' in item ? item.category : undefined;
  const categoryText = categoryLabel(category);

  return (
    <button
      type="button"
      className="ds-card ds-card--interactive group flex h-full min-h-[168px] flex-col text-left"
      onClick={() => onOpen(item.owner, repoName)}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <GithubRepoAvatar
            owner={item.owner}
            avatarUrl={item.ownerAvatarUrl}
            size="md"
            className="transition group-hover:border-[var(--accent)]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]" title={item.name}>
              {item.name}
            </p>
            <p className="truncate font-mono text-[11px] text-[var(--muted)]" title={`${item.owner}/${repoName}`}>
              {item.owner}/{repoName}
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-snug text-[var(--muted)]">
          {description || 'No description provided.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.stars !== undefined && item.stars > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
              <Star className="h-3 w-3 text-amber-400" />
              {formatStars(item.stars)}
            </span>
          ) : null}
          {item.language ? (
            <span className="inline-flex max-w-[8rem] items-center gap-1 truncate rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: languageAccent(item.language) }}
              />
              <span className="truncate">{item.language}</span>
            </span>
          ) : null}
          {categoryText ? (
            <span className="max-w-full truncate rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--muted)]">
              {categoryText}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)]">
        <span className="truncate">Community script</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[var(--accent)] opacity-80 transition group-hover:opacity-100">
          View
          <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      </div>
    </button>
  );
}
