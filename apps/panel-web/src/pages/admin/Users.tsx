import { AlertTriangle, ChevronRight } from 'lucide-react';
import { AdminLayout, Page } from '../../components/Layout';
import { UsersFleetOverview } from '../../components/admin/users/UsersFleetOverview';
import { UsersHeader } from '../../components/admin/users/UsersHeader';
import { UsersListPanel } from '../../components/admin/users/UsersListPanel';
import { AdminCallout, AdminPageStack } from '../../components/admin/primitives';
import { useAuth } from '../../context/AuthContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner } from '../../components/ui';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const fullAdmin = isFullPanelAdmin(currentUser);

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading,
    error,
    allUsers,
    filteredUsers,
    fleetStats,
    roleRows,
    filterCounts,
    activePercent,
    hasActiveFilters,
    clearFilters,
    refresh,
  } = useAdminUsers();

  return (
    <AdminLayout>
      <Page>
        <AdminPageStack>
          <UsersHeader
            stats={fleetStats}
            refreshing={refreshing}
            fullAdmin={fullAdmin}
            onRefresh={() => void refresh()}
          />

          {error ? (
            <AlertBanner tone="error">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Couldn&apos;t load users: {error.message}</span>
              </div>
            </AlertBanner>
          ) : null}

          {fleetStats.suspended > 0 && !error ? (
            <AdminCallout
              tone="warning"
              icon={AlertTriangle}
              title={`${fleetStats.suspended} account${fleetStats.suspended === 1 ? '' : 's'} suspended`}
              description="Suspended accounts cannot sign in or manage servers until an admin restores access."
              action={
                <button
                  type="button"
                  className="ds-nd-list-alert-action"
                  onClick={() => setStatusFilter('suspended')}
                >
                  Show suspended
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              }
            />
          ) : null}

          {!loading || allUsers.length > 0 ? (
            <UsersFleetOverview stats={fleetStats} roleRows={roleRows} activePercent={activePercent} />
          ) : null}

          <UsersListPanel
            users={filteredUsers}
            allCount={allUsers.length}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterCounts={filterCounts}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            lastUpdated={lastUpdated}
            currentUserId={currentUser?.id}
            fullAdmin={fullAdmin}
          />
        </AdminPageStack>
      </Page>
    </AdminLayout>
  );
}
