import type { GithubBrowseCategory } from '../lib/github-categories';
import { GithubCategoryCard } from './GithubCategoryCard';

export function GithubCategoryGrid({
  categories,
  onSelect,
}: {
  categories: GithubBrowseCategory[];
  onSelect: (category: GithubBrowseCategory) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {categories.map((category) => (
        <GithubCategoryCard key={category.id} category={category} onClick={() => onSelect(category)} />
      ))}
    </div>
  );
}
