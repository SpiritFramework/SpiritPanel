export type GithubSearchSortId = 'best' | 'stars' | 'forks' | 'updated' | 'pushed';

export const GITHUB_SEARCH_SORT_OPTIONS: { id: GithubSearchSortId; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'stars', label: 'Most stars' },
  { id: 'forks', label: 'Most forks' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'pushed', label: 'Recently pushed' },
];

export function parseGithubSearchSort(value: string | null | undefined): GithubSearchSortId {
  if (value && GITHUB_SEARCH_SORT_OPTIONS.some((opt) => opt.id === value)) {
    return value as GithubSearchSortId;
  }
  return 'best';
}

export function githubSearchSortLabel(id: GithubSearchSortId): string {
  return GITHUB_SEARCH_SORT_OPTIONS.find((opt) => opt.id === id)?.label ?? 'Best match';
}
