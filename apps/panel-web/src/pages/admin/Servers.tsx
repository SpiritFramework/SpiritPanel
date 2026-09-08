import { AlertTriangle } from 'lucide-react';
import { AdminLayout, Page } from '../../components/Layout';
import { ServersFleetOverview } from '../../components/admin/servers/ServersFleetOverview';
import { ServersFleetStats } from '../../components/admin/servers/ServersFleetStats';
import { ServersHeader } from '../../components/admin/servers/ServersHeader';
import { ServersListPanel } from '../../components/admin/servers/ServersListPanel';
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
      <Page className="ds-adm-srv-page">
        <ServersHeader
          stats={fleetStats}
          refreshing={refreshing}
          fullAdmin={fullAdmin}
          onRefresh={() => void refresh()}
        />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Couldn&apos;t load servers: {error.message}</span>
            </div>
          </AlertBanner>
        ) : null}

        {fleetStats.suspended > 0 && !error ? (
          <AlertBanner tone="warning" className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {fleetStats.suspended} server{fleetStats.suspended === 1 ? '' : 's'} suspended
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

        <ServersFleetStats
          stats={fleetStats}
          onShowSuspended={() => setStatusFilter('suspended')}
          onShowInstalling={() => setStatusFilter('installing')}
        />

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
      </Page>
    </AdminLayout>
  );
}
