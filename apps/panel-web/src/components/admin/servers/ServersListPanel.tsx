import { LayoutGrid, List, Plus, Search, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminNodeSummary, AdminServerSummary } from '../../../lib/api';
import { AdminServerTable } from '../../AdminServerRow';
import { Button, Card, FilterSelect } from '../../Layout';
import { DsIcon, EmptyState, Skeleton } from '../../ui';
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
    <Card title="All servers">
      <div className="ds-adm-srv-list-panel">
        <div className="ds-nodes-toolbar mb-3">
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

        <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Server status filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.id}
              className={`ds-nodes-status-pill${statusFilter === opt.id ? ' ds-nodes-status-pill--active' : ''}${
                opt.id === 'suspended' && filterCounts.suspended > 0 ? ' ds-nodes-status-pill--alert' : ''
              }`}
              onClick={() => onStatusFilterChange(opt.id)}
            >
              {opt.label}
              <span className="ds-nodes-status-count">{filterCounts[opt.id]}</span>
            </button>
          ))}
        </div>

        <div className="ds-nodes-results-meta mb-3">
          <span>
            Showing <strong>{servers.length}</strong>
            {hasActiveFilters ? ` of ${allCount}` : ''} servers
          </span>
          <span className="flex items-center gap-2">
            {hasActiveFilters ? (
              <button type="button" className="ds-adm-srv-clear-btn" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : null}
            {lastUpdated ? (
              <span className="ds-text-muted">Updated {lastUpdated.toLocaleTimeString()}</span>
            ) : null}
          </span>
        </div>

        {loading && servers.length === 0 && allCount === 0 ? (
          viewMode === 'table' ? (
            <div className="space-y-2 py-1" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="ds-adm-srv-card-grid" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="ds-adm-srv-card-skeleton h-44 w-full rounded-xl" />
                </li>
              ))}
            </ul>
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
                <Link to="/admin/servers/new">
                  <Button>Provision server</Button>
                </Link>
              ) : hasActiveFilters ? (
                <Button type="button" variant="secondary" onClick={onClearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'cards' ? (
          <ul className="ds-adm-srv-card-grid">
            {servers.map((server) => (
              <li key={server.id}>
                <ServerFleetCard server={server} />
              </li>
            ))}
          </ul>
        ) : (
          <AdminServerTable servers={servers} onServerDeleted={onServerDeleted} />
        )}
      </div>
    </Card>
  );
}
