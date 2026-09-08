import { ArrowUp, ChevronRight, Home, Search } from 'lucide-react';
import { pathSegments } from '../../../lib/paths';
import { FilterSelect } from '../../Layout';
import { BreadcrumbButton } from './FilesShared';
import type { FilesSortBy } from '../../../hooks/useServerFiles';

export function FilesToolbar({
  currentDir,
  search,
  sortBy,
  onNavigate,
  onParent,
  onSearchChange,
  onSortChange,
}: {
  currentDir: string;
  search: string;
  sortBy: FilesSortBy;
  onNavigate: (path: string) => void;
  onParent: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: FilesSortBy) => void;
}) {
  const breadcrumbs = pathSegments(currentDir);

  return (
    <div className="ds-srv-fm-toolbar">
      <nav className="ds-srv-fm-breadcrumb" aria-label="Path">
        <BreadcrumbButton onClick={() => onNavigate('/')} active={currentDir === '/'}>
          <Home className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">root</span>
        </BreadcrumbButton>
        {breadcrumbs.map((seg) => (
          <span key={seg.path} className="ds-srv-fm-breadcrumb-seg">
            <ChevronRight className="h-3 w-3" aria-hidden />
            <BreadcrumbButton onClick={() => onNavigate(seg.path)} active={seg.path === currentDir}>
              {seg.label}
            </BreadcrumbButton>
          </span>
        ))}
        {currentDir !== '/' ? (
          <button type="button" className="ds-srv-fm-up-btn" onClick={onParent}>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Up</span>
          </button>
        ) : null}
      </nav>

      <div className="ds-srv-fm-toolbar-controls">
        <div className="ds-srv-fm-search-wrap">
          <Search className="ds-srv-fm-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files…"
            className="ds-srv-fm-search"
          />
        </div>
        <FilterSelect value={sortBy} onChange={(e) => onSortChange(e.target.value as FilesSortBy)}>
          <option value="name">Sort: Name</option>
          <option value="size">Sort: Size</option>
          <option value="type">Sort: Type</option>
        </FilterSelect>
      </div>
    </div>
  );
}
