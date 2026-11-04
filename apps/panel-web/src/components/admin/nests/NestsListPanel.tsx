import { Egg, Layers, LayoutGrid, List, Plus, Search, Upload } from 'lucide-react';
import { AdminEggTable } from '../../AdminEggRow';
import { AdminNestTable } from '../../AdminNestRow';
import { Button, FilterSelect } from '../../Layout';
import { EmptyState, Skeleton, Spinner } from '../../ui';
import {
  AdminFilterChips,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../primitives';
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
    <AdminSection
      icon={isNests ? Layers : Egg}
      eyebrow="Inventory"
      title={isNests ? 'Browse nests' : 'Browse eggs'}
      description={
        isNests
          ? 'Search and filter nest groups across your template library'
          : 'Search eggs by name, author, or nest assignment'
      }
      badge={
        lastUpdated
          ? `Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
          : undefined
      }
    >
      <AdminSegmentedControl
        label="Template view"
        value={view}
        onChange={(id) => onViewChange(id as NestFleetView)}
        options={[
          {
            id: 'nests',
            label: (
              <>
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Nests
                <span className="ds-adm-chip-count">{allNestCount}</span>
              </>
            ),
          },
          {
            id: 'eggs',
            label: (
              <>
                <Egg className="h-3.5 w-3.5" aria-hidden />
                Eggs
                <span className="ds-adm-chip-count">{allEggCount}</span>
              </>
            ),
          },
        ]}
      />

      <div className="ds-nd-list-toolbar">
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
        <AdminSegmentedControl
          label="View mode"
          value={viewMode}
          onChange={(id) => onViewModeChange(id as 'table' | 'cards')}
          options={[
            {
              id: 'table',
              label: (
                <>
                  <List className="h-3.5 w-3.5" aria-hidden />
                  Table
                </>
              ),
            },
            {
              id: 'cards',
              label: (
                <>
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                  Cards
                </>
              ),
            },
          ]}
        />
      </div>

      <AdminFilterChips
        label="Status filters"
        value={activeFilter}
        onChange={(id) =>
          isNests
            ? onNestStatusFilterChange(id as NestListFilter)
            : onEggStatusFilterChange(id as EggListFilter)
        }
        options={filters.map((f) => ({
          id: f.id,
          label: f.label,
          count: filterCounts[f.id as keyof typeof filterCounts],
          alert:
            f.id === 'disabled' &&
            !isNests &&
            (filterCounts as Record<EggListFilter, number>).disabled > 0,
        }))}
      />

      <div className="ds-nd-list-meta">
        <span>
          Showing <strong>{count}</strong>
          {hasActiveFilters ? ` of ${total}` : ''} {isNests ? 'nests' : 'eggs'}
        </span>
        {hasActiveFilters ? (
          <button type="button" className="ds-nd-list-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {loading && count === 0 ? (
        viewMode === 'table' ? (
          <div className="space-y-2 py-1" aria-hidden>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="ds-adm-nest-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        )
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
                <AdminToolButton onClick={onCreate} primary>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Create nest
                </AdminToolButton>
              ) : hasActiveFilters ? (
                <AdminToolButton onClick={onClearFilters}>Clear filters</AdminToolButton>
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
            ) : hasActiveFilters ? (
              <AdminToolButton onClick={onClearFilters}>Clear filters</AdminToolButton>
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
    </AdminSection>
  );
}
