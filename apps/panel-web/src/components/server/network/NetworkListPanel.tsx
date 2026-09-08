import { Network, Plus, Search } from 'lucide-react';
import { Button } from '../../Layout';
import { EmptyState, Spinner } from '../../ui';
import type { ServerAllocationEntry } from '../../../lib/api';
import type { AllocationFilter } from '../../../lib/network-utils';
import type { getServerAccess } from '../../../lib/server-access';
import { AllocationRow } from './AllocationRow';

const FILTER_OPTIONS: { id: AllocationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'additional', label: 'Additional' },
];

export function NetworkListPanel({
  loading,
  error,
  allocations,
  filteredAllocations,
  search,
  filter,
  hasActiveFilters,
  limit,
  canCreateFromApi,
  working,
  copiedKey,
  access,
  onSearchChange,
  onFilterChange,
  onCreate,
  onCopy,
  onSetPrimary,
  onDelete,
}: {
  loading: boolean;
  error: string;
  allocations: ServerAllocationEntry[];
  filteredAllocations: ServerAllocationEntry[];
  search: string;
  filter: AllocationFilter;
  hasActiveFilters: boolean;
  limit: number;
  canCreateFromApi: boolean;
  working: string | null;
  copiedKey: string | null;
  access: ReturnType<typeof getServerAccess>;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: AllocationFilter) => void;
  onCreate: () => void;
  onCopy: (text: string, key: string) => void;
  onSetPrimary: (allocationId: string) => void;
  onDelete: (alloc: ServerAllocationEntry) => void;
}) {
  const canCreate = access.canCreateAllocations && canCreateFromApi;

  return (
    <section className="ds-srv-net-panel">
      <div className="ds-srv-net-panel-toolbar">
        <div className="ds-srv-net-search-wrap">
          <Search className="ds-srv-net-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ports…"
            className="ds-srv-net-search"
          />
        </div>
        <div className="ds-srv-net-filters" role="group" aria-label="Filter allocations">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`ds-srv-net-filter-btn${filter === opt.id ? ' ds-srv-net-filter-btn--active' : ''}`}
              aria-pressed={filter === opt.id}
              onClick={() => onFilterChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="ds-srv-net-error">{error}</div> : null}

      {limit === 0 && !loading ? (
        <div className="ds-srv-net-notice ds-srv-net-notice--warning">
          Additional ports are disabled on this server (limit 0).
        </div>
      ) : null}

      {!access.canCreateAllocations && !loading && allocations.length === 0 ? (
        <div className="ds-srv-net-notice">You can view network settings but do not have permission to manage ports.</div>
      ) : null}

      <div className="ds-srv-net-panel-body">
        {loading ? (
          <div className="ds-srv-net-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading network…</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="ds-srv-net-empty-wrap">
            <EmptyState
              icon={<Network className="h-5 w-5" />}
              title="No ports assigned"
              description="This server has no network allocations yet. Assign a port to expose your game or service."
              action={
                canCreate && limit > 0 ? (
                  <Button type="button" size="sm" disabled={working === 'create'} onClick={onCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    {working === 'create' ? 'Assigning…' : 'Add port'}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="ds-srv-net-empty-wrap">
            <EmptyState title="No matching ports" description="Try a different search or filter." />
          </div>
        ) : (
          <ul className="ds-srv-net-list">
            {filteredAllocations.map((alloc) => (
              <AllocationRow
                key={alloc.id}
                alloc={alloc}
                busy={working === alloc.id}
                canUpdate={access.canUpdateAllocations}
                canDelete={access.canDeleteAllocations}
                copied={copiedKey === alloc.id}
                onCopy={() => void onCopy(alloc.address, alloc.id)}
                onSetPrimary={() => onSetPrimary(alloc.id)}
                onDelete={() => onDelete(alloc)}
              />
            ))}
          </ul>
        )}
      </div>

      {allocations.length > 0 && !canCreateFromApi && access.canCreateAllocations && limit > 0 ? (
        <div className="ds-srv-net-limit-banner">
          Port limit reached ({limit}). Ask an admin to raise it.
        </div>
      ) : null}

      <footer className="ds-srv-net-panel-footer">
        {loading
          ? 'Loading…'
          : hasActiveFilters
            ? `${filteredAllocations.length} of ${allocations.length} port${allocations.length === 1 ? '' : 's'}`
            : `${allocations.length} port${allocations.length === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
