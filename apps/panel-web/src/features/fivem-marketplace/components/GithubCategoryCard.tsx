import { ArrowRight } from 'lucide-react';
import type { GithubBrowseCategory } from '../lib/github-categories';

export function GithubCategoryCard({
  category,
  onClick,
}: {
  category: GithubBrowseCategory;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <button type="button" onClick={onClick} className="ds-category-card group">
      <div className="ds-category-card__icon">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="ds-category-card__content min-w-0">
        <p className="ds-category-card__title">{category.label}</p>
        <p className="ds-category-card__desc">{category.description}</p>
      </div>
      <ArrowRight className="ds-category-card__arrow h-3.5 w-3.5 shrink-0" aria-hidden />
    </button>
  );
}
