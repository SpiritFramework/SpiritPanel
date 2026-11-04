import { LayoutGrid, List, Plus, Search, Server } from 'lucide-react';
import type { AdminNodeSummary, AdminServerSummary } from '../../../lib/api';
import { AdminServerTable } from '../../AdminServerRow';
import { FilterSelect } from '../../Layout';
import { DsIcon, EmptyState, Skeleton } from '../../ui';
import {
  AdminFilterChips,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../primitives';
import { ServerFleetCard } from './ServerFleetCard';
import type { ServerFleetFilter } from './server-fleet-utils';

const FILTER_OPTIONS: { id: ServerFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'offline', label: 'Offline' },
  { id: 'installing', label: 'Installing' },
  { id: 'suspended', label: 'Suspended' },
];

export function ServersListPanel({
  servers,
  allCount,
  loading,
  search,
  onSearchChange,
  nodeFilter,
  onNodeFilterChange,
  nodeList,
  statusFilter,
  onStatusFilterChange,
  filterCounts,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  lastUpdated,
  fullAdmin,
  onServerDeleted,
}: {
  servers: AdminServerSummary[];
  allCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  nodeFilter: string;
  onNodeFilterChange: (value: string) => void;
  nodeList: AdminNodeSummary[];
  statusFilter: ServerFleetFilter;
  onStatusFilterChange: (filter: ServerFleetFilter) => void;
  filterCounts: Record<ServerFleetFilter, number>;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  lastUpdated: Date | null;
  fullAdmin: boolean;
  onServerDeleted: () => void;
}) {
  return (
    <AdminSection
      icon={Server}
      eyebrow="Inventory"
      title="All servers"
      description="Search, filter, and open any game server in the fleet"
      badge={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}
    >
      <div className="ds-nd-list-toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, owner, UUID…"
            className="ds-field ds-field--icon-left w-full"
            aria-label="Search servers"
          />
        </div>
        <FilterSelect
          value={nodeFilter}
          onChange={(e) => onNodeFilterChange(e.target.value)}
          aria-label="Filter by node"
        >
          <option value="">All nodes</option>
          {nodeList.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </FilterSelect>
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
        label="Server status filters"
        value={statusFilter}
        onChange={(id) => onStatusFilterChange(id as ServerFleetFilter)}
        options={FILTER_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
          count: filterCounts[opt.id],
          alert: opt.id === 'suspended' && filterCounts.suspended > 0,
        }))}
      />

      <div className="ds-nd-list-meta">
        <span>
          Showing <strong>{servers.length}</strong>
          {hasActiveFilters ? ` of ${allCount}` : ''} servers
        </span>
        {hasActiveFilters ? (
          <button type="button" className="ds-nd-list-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {loading && servers.length === 0 && allCount === 0 ? (
        viewMode === 'table' ? (
          <div className="space-y-2 py-1" aria-hidden>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="ds-nd-list-card-grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="ds-nd-list-card-skeleton" />
            ))}
          </div>
        )
      ) : servers.length === 0 ? (
        <EmptyState
          icon={<DsIcon icon={Server} className="ds-icon--md" />}
          title={hasActiveFilters ? 'No servers match your filters' : 'No servers yet'}
          description={
            hasActiveFilters
              ? 'Try broadening your search or clearing filters.'
              : 'Provision a server to populate this fleet.'
          }
          action={
            fullAdmin && !hasActiveFilters ? (
              <AdminToolButton to="/admin/servers/new" primary>
                <Plus className="h-3.5 w-3.5" />
                Provision server
              </AdminToolButton>
            ) : hasActiveFilters ? (
              <AdminToolButton onClick={onClearFilters}>Clear filters</AdminToolButton>
            ) : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="ds-nd-list-card-grid">
          {servers.map((server) => (
            <ServerFleetCard key={server.id} server={server} />
          ))}
        </div>
      ) : (
        <AdminServerTable servers={servers} onServerDeleted={onServerDeleted} />
      )}
    </AdminSection>
  );
}
