import { AlertTriangle, ChevronRight } from 'lucide-react';
import { AdminLayout, Page } from '../../components/Layout';
import { ServersFleetOverview } from '../../components/admin/servers/ServersFleetOverview';
import { ServersHeader } from '../../components/admin/servers/ServersHeader';
import { ServersListPanel } from '../../components/admin/servers/ServersListPanel';
import { AdminCallout, AdminPageStack } from '../../components/admin/primitives';
import { useAuth } from '../../context/AuthContext';
import { useAdminServers } from '../../hooks/useAdminServers';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner } from '../../components/ui';

export function AdminServers() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);

  const {
    search,
    setSearch,
    nodeFilter,
    setNodeFilter,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading,
    error,
    allServers,
    filteredServers,
    nodeList,
    fleetStats,
    statusRows,
    nodeRows,
    filterCounts,
    runningPercent,
    hasActiveFilters,
    clearFilters,
    refresh,
    reload,
  } = useAdminServers();

  return (
    <AdminLayout>
      <Page>
        <AdminPageStack>
          <ServersHeader
            stats={fleetStats}
            refreshing={refreshing}
            fullAdmin={fullAdmin}
            onRefresh={() => void refresh()}
          />

          {error ? (
            <AlertBanner tone="error">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Couldn&apos;t load servers: {error.message}</span>
              </div>
            </AlertBanner>
          ) : null}

          {fleetStats.suspended > 0 && !error ? (
            <AdminCallout
              tone="warning"
              icon={AlertTriangle}
              title={`${fleetStats.suspended} server${fleetStats.suspended === 1 ? '' : 's'} suspended`}
              description="Suspended instances cannot start until an admin unsuspends them."
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

          {!loading || allServers.length > 0 ? (
            <ServersFleetOverview
              stats={fleetStats}
              statusRows={statusRows}
              nodeRows={nodeRows}
              runningPercent={runningPercent}
            />
          ) : null}

          <ServersListPanel
            servers={filteredServers}
            allCount={allServers.length}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            nodeFilter={nodeFilter}
            onNodeFilterChange={setNodeFilter}
            nodeList={nodeList}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterCounts={filterCounts}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            lastUpdated={lastUpdated}
            fullAdmin={fullAdmin}
            onServerDeleted={() => void reload()}
          />
        </AdminPageStack>
      </Page>
    </AdminLayout>
  );
}
