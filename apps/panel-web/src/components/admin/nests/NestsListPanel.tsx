import { Egg, Layers, LayoutGrid, List, Plus, Search, Upload } from 'lucide-react';
import { AdminEggTable } from '../../AdminEggRow';
import { AdminNestTable } from '../../AdminNestRow';
import { Button, Card, FilterSelect } from '../../Layout';
import { EmptyState, Skeleton, Spinner } from '../../ui';
import { EggFleetCard } from './EggFleetCard';
import { NestFleetCard } from './NestFleetCard';
import type { AdminEggSummary, AdminNestSummary } from '../../../lib/api';
import type { EggListFilter, NestFleetView, NestListFilter } from './nest-fleet-utils';

const NEST_FILTERS: { id: NestListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'with-eggs', label: 'With eggs' },
  { id: 'empty', label: 'Empty' },
];

const EGG_FILTERS: { id: EggListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'deployed', label: 'Deployed' },
];

export function NestsListPanel({
  view,
  onViewChange,
  nests,
  eggs,
  allNestCount,
  allEggCount,
  loading,
  search,
  onSearchChange,
  nestFilter,
  onNestFilterChange,
  nestList,
  nestStatusFilter,
  onNestStatusFilterChange,
  eggStatusFilter,
  onEggStatusFilterChange,
  nestFilterCounts,
  eggFilterCounts,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  lastUpdated,
  fullAdmin,
  onImport,
  onCreate,
}: {
  view: NestFleetView;
  onViewChange: (view: NestFleetView) => void;
  nests: AdminNestSummary[];
  eggs: AdminEggSummary[];
  allNestCount: number;
  allEggCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  nestFilter: string;
  onNestFilterChange: (value: string) => void;
  nestList: AdminNestSummary[];
  nestStatusFilter: NestListFilter;
  onNestStatusFilterChange: (filter: NestListFilter) => void;
  eggStatusFilter: EggListFilter;
  onEggStatusFilterChange: (filter: EggListFilter) => void;
  nestFilterCounts: Record<NestListFilter, number>;
  eggFilterCounts: Record<EggListFilter, number>;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  lastUpdated: Date | null;
  fullAdmin: boolean;
  onImport: () => void;
  onCreate: () => void;
}) {
  const isNests = view === 'nests';
  const count = isNests ? nests.length : eggs.length;
  const total = isNests ? allNestCount : allEggCount;
  const filters = isNests ? NEST_FILTERS : EGG_FILTERS;
  const filterCounts = isNests ? nestFilterCounts : eggFilterCounts;
  const activeFilter = isNests ? nestStatusFilter : eggStatusFilter;

  return (
    <Card title={isNests ? 'All nests' : 'All eggs'}>
      <div className="ds-adm-nest-list-panel">
        <div className="ds-adm-nest-view-tabs" role="tablist" aria-label="Template view">
          <button
            type="button"
            role="tab"
            aria-selected={isNests}
            className={`ds-adm-nest-view-tab${isNests ? ' ds-adm-nest-view-tab--active' : ''}`}
            onClick={() => onViewChange('nests')}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Nests
            <span className="ds-adm-nest-view-tab-count">{allNestCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isNests}
            className={`ds-adm-nest-view-tab${!isNests ? ' ds-adm-nest-view-tab--active' : ''}`}
            onClick={() => onViewChange('eggs')}
          >
            <Egg className="h-3.5 w-3.5" aria-hidden />
            Eggs
            <span className="ds-adm-nest-view-tab-count">{allEggCount}</span>
          </button>
        </div>

        <div className="ds-nodes-toolbar mb-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isNests ? 'Search name, description, UUID…' : 'Search name, author, UUID…'
              }
              className="ds-field ds-field--icon-left w-full"
              aria-label={isNests ? 'Search nests' : 'Search eggs'}
            />
          </div>
          {!isNests ? (
            <FilterSelect
              value={nestFilter}
              onChange={(e) => onNestFilterChange(e.target.value)}
              aria-label="Filter by nest"
            >
              <option value="">All nests</option>
              {nestList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </FilterSelect>
          ) : null}
          <div className="ds-nodes-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`ds-nodes-view-btn${viewMode === 'table' ? ' ds-nodes-view-btn--active' : ''}`}
              onClick={() => onViewModeChange('table')}
              aria-pressed={viewMode === 'table'}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              Table
            </button>
            <button
              type="button"
              className={`ds-nodes-view-btn${viewMode === 'cards' ? ' ds-nodes-view-btn--active' : ''}`}
              onClick={() => onViewModeChange('cards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Cards
            </button>
          </div>
        </div>

        <div className="ds-adm-nest-filter-pills" role="group" aria-label="Status filters">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ds-adm-nest-filter-pill${
                activeFilter === f.id ? ' ds-adm-nest-filter-pill--active' : ''
              }`}
              onClick={() =>
                isNests
                  ? onNestStatusFilterChange(f.id as NestListFilter)
                  : onEggStatusFilterChange(f.id as EggListFilter)
              }
              aria-pressed={activeFilter === f.id}
            >
              {f.label}
              <span className="ds-adm-nest-filter-pill-count">{filterCounts[f.id as keyof typeof filterCounts]}</span>
            </button>
          ))}
          {hasActiveFilters ? (
            <button type="button" className="ds-adm-nest-filter-clear" onClick={onClearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="ds-adm-nest-list-meta">
          <span>
            Showing {count} of {total}
            {lastUpdated ? (
              <span className="ds-adm-nest-list-updated">
                · Updated {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </span>
        </div>

        {loading && count === 0 ? (
          <div className="ds-adm-nest-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : isNests ? (
          nests.length === 0 ? (
            <EmptyState
              title="No nests found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Create a nest to organize your eggs.'
              }
              action={
                fullAdmin && !hasActiveFilters ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" onClick={onCreate}>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Create nest
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ) : viewMode === 'cards' ? (
            <div className="ds-adm-nest-card-grid">
              {nests.map((nest) => (
                <NestFleetCard key={nest.id} nest={nest} />
              ))}
            </div>
          ) : (
            <AdminNestTable nests={nests} />
          )
        ) : eggs.length === 0 ? (
          <EmptyState
            title="No eggs found"
            description={
              hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Import a PTDL_v2 JSON egg into a nest.'
            }
            action={
              fullAdmin && !hasActiveFilters ? (
                <Button type="button" onClick={onImport}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Import egg
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'cards' ? (
          <div className="ds-adm-nest-card-grid">
            {eggs.map((egg) => (
              <EggFleetCard key={egg.id} egg={egg} />
            ))}
          </div>
        ) : (
          <AdminEggTable eggs={eggs} />
        )}

        {loading && count > 0 ? (
          <div className="ds-adm-nest-list-loading" aria-live="polite">
            <Spinner />
            Refreshing…
          </div>
        ) : null}
      </div>
    </Card>
  );
}
