import { LayoutGrid } from 'lucide-react';
import { GITHUB_BROWSE_CATEGORIES } from '../lib/github-categories';

export function GithubCategoryPicker({
  activeId,
  onSelect,
  onBrowseAll,
}: {
  activeId?: string;
  onSelect: (categoryId: string) => void;
  onBrowseAll?: () => void;
}) {
  return (
    <div className="ds-stack ds-stack--tight">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Switch category</p>
      <div className="ds-category-picker" role="tablist" aria-label="Script categories">
        {onBrowseAll ? (
          <button
            type="button"
            role="tab"
            aria-selected={!activeId}
            onClick={onBrowseAll}
            className={`ds-category-picker__chip${!activeId ? ' is-active' : ''}`}
          >
            <LayoutGrid className="ds-category-picker__chip-icon" aria-hidden />
            All
          </button>
        ) : null}
        {GITHUB_BROWSE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(cat.id)}
              className={`ds-category-picker__chip${active ? ' is-active' : ''}`}
            >
              <Icon className="ds-category-picker__chip-icon" aria-hidden />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
