import { LayoutGrid, List, Search, Server, Users } from 'lucide-react';
import type { ServerSummary } from '../../../../lib/api';
import { ServerCard } from '../../../ServerCard';
import { ServerListTable } from '../../../ServerListRow';
import { EmptyState } from '../../../ui';
import {
  AdminFilterChips,
  AdminSection,
  AdminSegmentedControl,
  AdminToolButton,
} from '../../primitives';
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
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'offline', label: 'Offline' },
  { id: 'installing', label: 'Installing' },
  { id: 'suspended', label: 'Suspended' },
];

function toServerSummary(server: UserOwnedServer): ServerSummary {
  const allocation = server.defaultAllocation ?? (() => {
    const [ip = '0.0.0.0', portRaw = '0'] = server.address.split(':');
    return { ip, port: Number(portRaw) || 0, alias: null as string | null };
  })();

  return {
    id: server.id,
    uuid: server.uuid ?? server.id,
    name: server.name,
    description: server.description ?? undefined,
    status: server.status,
    suspended: server.suspended,
    installStatus: server.installStatus,
    containerState: server.containerState ?? undefined,
    memory: server.memory,
    disk: server.disk,
    cpu: server.cpu,
    egg: { name: server.egg, logoUrl: server.eggLogoUrl },
    node: {
      name: server.node,
      fqdn: server.nodeFqdn,
      maintenanceMode: server.nodeMaintenanceMode,
    },
    defaultAllocation: allocation,
  };
}

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
  const ownedSummaries = filteredOwned.map(toServerSummary);

  return (
    <AdminSection
      tone="fleet"
      icon={Server}
      eyebrow="Inventory"
      title="Server access"
      description="Owned servers and subuser shares for this account"
      badge={String(totalCount)}
    >
      <div className="ds-nd-list-toolbar">
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
                  List
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
        label="Access scope"
        value={scope}
        onChange={(id) => onScopeChange(id as UserServerScope)}
        options={SCOPE_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
          count: scopeCounts[opt.id],
        }))}
      />

      {showOwned && ownedServers.length > 0 ? (
        <AdminFilterChips
          label="Server status filters"
          value={statusFilter}
          onChange={(id) => onStatusFilterChange(id as UserServerStatusFilter)}
          options={STATUS_OPTIONS.map((opt) => ({
            id: opt.id,
            label: opt.label,
            count: statusCounts[opt.id],
            alert: opt.id === 'suspended' && statusCounts.suspended > 0,
          }))}
        />
      ) : null}

      <div className="ds-nd-list-meta">
        <span>
          Showing <strong>{filteredCount}</strong>
          {hasActiveFilters ? ` of ${totalCount}` : ''} entries
        </span>
        {hasActiveFilters ? (
          <button type="button" className="ds-nd-list-clear" onClick={onClearFilters}>
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
          action={<AdminToolButton onClick={onClearFilters}>Clear filters</AdminToolButton>}
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
                <div className="ds-servers-fleet-grid ds-servers-fleet-grid--compact">
                  {ownedSummaries.map((summary) => (
                    <ServerCard
                      key={summary.id}
                      server={summary}
                      href={`/admin/servers/${summary.id}`}
                      footerLabel={summary.node.name}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <ServerListTable
                  servers={ownedSummaries}
                  compact
                  hrefFor={(server) => `/admin/servers/${server.id}`}
                />
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

              <ul className="ds-nd-list-card-grid ds-ud-srv-shared-grid">
                {filteredShared.map((access) => (
                  <li key={access.id}>
                    <UserSharedAccessCard access={access} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </AdminSection>
  );
}
