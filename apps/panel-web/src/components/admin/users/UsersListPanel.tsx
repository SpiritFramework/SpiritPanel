import { LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import type { AdminUserSummary } from '../../../lib/api';
import { AdminUserTable } from '../../AdminUserRow';
import { Button, Card } from '../../Layout';
import { DsIcon, EmptyState, Skeleton } from '../../ui';
import { UserFleetCard } from './UserFleetCard';
import type { UserFleetFilter } from './user-fleet-utils';

const FILTER_OPTIONS: { id: UserFleetFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'admin', label: 'Admins' },
  { id: 'staff', label: 'Staff' },
  { id: 'user', label: 'Users' },
  { id: 'with_servers', label: 'With servers' },
];

export function UsersListPanel({
  users,
  allCount,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  filterCounts,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  lastUpdated,
  currentUserId,
  fullAdmin,
  onCreate,
}: {
  users: AdminUserSummary[];
  allCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: UserFleetFilter;
  onStatusFilterChange: (filter: UserFleetFilter) => void;
  filterCounts: Record<UserFleetFilter, number>;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  lastUpdated: Date | null;
  currentUserId?: string;
  fullAdmin: boolean;
  onCreate: () => void;
}) {
  return (
    <Card title="All accounts">
      <div className="ds-usr-list-panel">
      <div className="ds-nodes-toolbar mb-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, username, UUID, or user ID…"
            className="ds-field ds-field--icon-left w-full"
            aria-label="Search users"
          />
        </div>
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

      <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Account filters">
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
          Showing <strong>{users.length}</strong>
          {hasActiveFilters ? ` of ${allCount}` : ''} accounts
        </span>
        {lastUpdated ? (
          <span className="ds-text-muted">Updated {lastUpdated.toLocaleTimeString()}</span>
        ) : null}
      </div>

      {loading && users.length === 0 && allCount === 0 ? (
        viewMode === 'table' ? (
          <div className="space-y-2 py-1" aria-hidden>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="ds-usr-card-grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="ds-usr-card-skeleton" />
            ))}
          </div>
        )
      ) : users.length === 0 ? (
        <EmptyState
          icon={<DsIcon icon={Users} className="ds-icon--md" />}
          title={hasActiveFilters ? 'No accounts match your filters' : 'No users yet'}
          description={
            hasActiveFilters
              ? 'Try a different role, status, or search term.'
              : 'Create the first panel account to get started.'
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : fullAdmin ? (
              <Button type="button" onClick={onCreate}>
                <Plus className="h-4 w-4" />
                Create user
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'table' ? (
        <AdminUserTable users={users} currentUserId={currentUserId} />
      ) : (
        <div className="ds-usr-card-grid">
          {users.map((user) => (
            <UserFleetCard key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </div>
      )}
      </div>
    </Card>
  );
}
