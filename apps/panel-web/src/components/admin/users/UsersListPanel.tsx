import { LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import type { AdminUserSummary } from '../../../lib/api';
import { AdminUserTable } from '../../AdminUserRow';
import { DsIcon, EmptyState, Skeleton } from '../../ui';
import {
  AdminFilterChips,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../primitives';
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
    <AdminSection
      icon={Users}
      eyebrow="Inventory"
      title="All accounts"
      description="Search, filter, and open any panel account"
      badge={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}
    >
      <div className="ds-nd-list-toolbar">
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
        label="Account filters"
        value={statusFilter}
        onChange={(id) => onStatusFilterChange(id as UserFleetFilter)}
        options={FILTER_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
          count: filterCounts[opt.id],
          alert: opt.id === 'suspended' && filterCounts.suspended > 0,
        }))}
      />

      <div className="ds-nd-list-meta">
        <span>
          Showing <strong>{users.length}</strong>
          {hasActiveFilters ? ` of ${allCount}` : ''} accounts
        </span>
        {hasActiveFilters ? (
          <button type="button" className="ds-nd-list-clear" onClick={onClearFilters}>
            Clear filters
          </button>
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
          <div className="ds-nd-list-card-grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="ds-nd-list-card-skeleton" />
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
              <AdminToolButton onClick={onClearFilters}>Clear filters</AdminToolButton>
            ) : fullAdmin ? (
              <AdminToolButton onClick={onCreate} primary>
                <Plus className="h-3.5 w-3.5" />
                Create user
              </AdminToolButton>
            ) : undefined
          }
        />
      ) : viewMode === 'table' ? (
        <AdminUserTable users={users} currentUserId={currentUserId} />
      ) : (
        <div className="ds-nd-list-card-grid">
          {users.map((user) => (
            <UserFleetCard key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </div>
      )}
    </AdminSection>
  );
}
