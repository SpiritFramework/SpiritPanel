import { LayoutGrid, List, Search, Server, Users } from 'lucide-react';
import { Card } from '../../../Layout';
import { EmptyState } from '../../../ui';
import { UserServerFleetCard } from './UserServerFleetCard';
import { UserServerTableRow } from './UserServerTableRow';
import { UserSharedAccessCard } from './UserSharedAccessCard';
import type {
  UserOwnedServer,
  UserServerScope,
  UserServerStatusFilter,
  UserSharedAccess,
} from './user-server-utils';

const SCOPE_OPTIONS: { id: UserServerScope; label: string }[] = [
  { id: 'all', label: 'All access' },
  { id: 'owned', label: 'Owned' },
  { id: 'shared', label: 'Shared' },
];

const STATUS_OPTIONS: { id: UserServerStatusFilter; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'running', label: 'Running' },
  { id: 'offline', label: 'Offline' },
  { id: 'installing', label: 'Installing' },
  { id: 'suspended', label: 'Suspended' },
];

export function UserServersListPanel({
  ownedServers,
  sharedAccess,
  filteredOwned,
  filteredShared,
  search,
  onSearchChange,
  scope,
  onScopeChange,
  scopeCounts,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
}: {
  ownedServers: UserOwnedServer[];
  sharedAccess: UserSharedAccess[];
  filteredOwned: UserOwnedServer[];
  filteredShared: UserSharedAccess[];
  search: string;
  onSearchChange: (value: string) => void;
  scope: UserServerScope;
  onScopeChange: (scope: UserServerScope) => void;
  scopeCounts: Record<UserServerScope, number>;
  statusFilter: UserServerStatusFilter;
  onStatusFilterChange: (filter: UserServerStatusFilter) => void;
  statusCounts: Record<UserServerStatusFilter, number>;
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const showOwned = scope === 'all' || scope === 'owned';
  const showShared = scope === 'all' || scope === 'shared';
  const totalCount = ownedServers.length + sharedAccess.length;
  const filteredCount =
    (showOwned ? filteredOwned.length : 0) + (showShared ? filteredShared.length : 0);
  const isEmpty = totalCount === 0;
  const noMatches = !isEmpty && filteredCount === 0;

  return (
    <Card title="Server access">
      <div className="ds-ud-srv-list-panel">
        <div className="ds-nodes-toolbar mb-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, egg, node, address, or ID…"
              className="ds-field ds-field--icon-left w-full"
              aria-label="Search servers"
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

        <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Access scope">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={scope === opt.id}
              className={`ds-nodes-status-pill${scope === opt.id ? ' ds-nodes-status-pill--active' : ''}`}
              onClick={() => onScopeChange(opt.id)}
            >
              {opt.label}
              <span className="ds-nodes-status-count">{scopeCounts[opt.id]}</span>
            </button>
          ))}
        </div>

        {showOwned && ownedServers.length > 0 ? (
          <div className="ds-nodes-status-pills mb-3" role="tablist" aria-label="Server status filters">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === opt.id}
                className={`ds-nodes-status-pill${statusFilter === opt.id ? ' ds-nodes-status-pill--active' : ''}${
                  opt.id === 'suspended' && statusCounts.suspended > 0 ? ' ds-nodes-status-pill--alert' : ''
                }`}
                onClick={() => onStatusFilterChange(opt.id)}
              >
                {opt.label}
                <span className="ds-nodes-status-count">{statusCounts[opt.id]}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="ds-nodes-results-meta mb-3">
          <span>
            Showing <strong>{filteredCount}</strong>
            {hasActiveFilters ? ` of ${totalCount}` : ''} entries
          </span>
          {hasActiveFilters ? (
            <button type="button" className="ds-ud-srv-clear-btn" onClick={onClearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>

        {isEmpty ? (
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="No server access"
            description="This user does not own any servers and has no subuser access yet."
          />
        ) : noMatches ? (
          <EmptyState
            title="No matching servers"
            description="Try a different search term or filter."
          />
        ) : (
          <div className="ds-ud-srv-list-body">
            {showOwned && filteredOwned.length > 0 ? (
              <section className="ds-ud-srv-list-section" aria-label="Owned servers">
                {scope === 'all' ? (
                  <header className="ds-ud-srv-list-section-head">
                    <Server className="h-4 w-4" aria-hidden />
                    <h3>Owned servers</h3>
                    <span className="ds-ud-srv-list-section-count">{filteredOwned.length}</span>
                  </header>
                ) : null}

                {viewMode === 'cards' ? (
                  <ul className="ds-ud-srv-card-grid">
                    {filteredOwned.map((server) => (
                      <li key={server.id}>
                        <UserServerFleetCard server={server} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="ds-ud-srv-table-wrap">
                    <table className="ds-ud-srv-table">
                      <thead>
                        <tr>
                          <th>Server</th>
                          <th>Node</th>
                          <th>Connection</th>
                          <th>Created</th>
                          <th>Status</th>
                          <th aria-hidden />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOwned.map((server) => (
                          <UserServerTableRow key={server.id} server={server} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            {showShared && filteredShared.length > 0 ? (
              <section className="ds-ud-srv-list-section" aria-label="Shared access">
                {scope === 'all' ? (
                  <header className="ds-ud-srv-list-section-head">
                    <Users className="h-4 w-4" aria-hidden />
                    <h3>Shared access</h3>
                    <span className="ds-ud-srv-list-section-count">{filteredShared.length}</span>
                  </header>
                ) : null}

                {viewMode === 'cards' || scope === 'shared' ? (
                  <ul className="ds-ud-srv-shared-grid">
                    {filteredShared.map((access) => (
                      <li key={access.id}>
                        <UserSharedAccessCard access={access} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="ds-ud-srv-shared-compact-list">
                    {filteredShared.map((access) => (
                      <li key={access.id}>
                        <UserSharedAccessCard access={access} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
