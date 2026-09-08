import type { ReactNode } from 'react';
import { Compass } from 'lucide-react';
import type { GithubBrowseCategory } from '../lib/github-categories';
import { GithubCategoryGrid } from './GithubCategoryGrid';

export function GithubCategorySection({
  title = 'Browse by category',
  description = 'Jump into popular script types from the community',
  categories,
  onSelect,
  action,
}: {
  title?: string;
  description?: string;
  categories: GithubBrowseCategory[];
  onSelect: (category: GithubBrowseCategory) => void;
  action?: ReactNode;
}) {
  return (
    <section className="ds-stack">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <Compass className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        {action}
      </div>
      <GithubCategoryGrid categories={categories} onSelect={onSelect} />
    </section>
  );
}
