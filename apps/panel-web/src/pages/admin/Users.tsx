import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminLayout, Page } from '../../components/Layout';
import { CreateUserModal } from '../../components/CreateUserModal';
import { UsersFleetOverview } from '../../components/admin/users/UsersFleetOverview';
import { UsersFleetStats } from '../../components/admin/users/UsersFleetStats';
import { UsersHeader } from '../../components/admin/users/UsersHeader';
import { UsersListPanel } from '../../components/admin/users/UsersListPanel';
import { useAuth } from '../../context/AuthContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner } from '../../components/ui';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const fullAdmin = isFullPanelAdmin(currentUser);
  const [showCreate, setShowCreate] = useState(false);

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
    reload,
  } = useAdminUsers();

  return (
    <AdminLayout>
      <Page className="ds-usr-page">
        <UsersHeader
          stats={fleetStats}
          refreshing={refreshing}
          fullAdmin={fullAdmin}
          onRefresh={() => void refresh()}
          onCreate={() => setShowCreate(true)}
        />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Couldn&apos;t load users: {error.message}</span>
            </div>
          </AlertBanner>
        ) : null}

        {fleetStats.suspended > 0 && !error ? (
          <AlertBanner tone="warning" className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {fleetStats.suspended} account{fleetStats.suspended === 1 ? '' : 's'} suspended
              </span>
              <button
                type="button"
                className="text-xs font-medium underline underline-offset-2"
                onClick={() => setStatusFilter('suspended')}
              >
                Show suspended
              </button>
            </div>
          </AlertBanner>
        ) : null}

        <UsersFleetStats stats={fleetStats} onShowSuspended={() => setStatusFilter('suspended')} />

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
          onCreate={() => setShowCreate(true)}
        />

        {fullAdmin && showCreate ? (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              void reload();
            }}
          />
        ) : null}
      </Page>
    </AdminLayout>
  );
}
