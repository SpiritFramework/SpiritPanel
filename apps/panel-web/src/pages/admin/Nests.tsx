import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AdminLayout, Page } from '../../components/Layout';
import { CreateNestModal } from '../../components/CreateNestModal';
import { ImportEggModal } from '../../components/ImportEggModal';
import { NestsFleetOverview } from '../../components/admin/nests/NestsFleetOverview';
import { NestsFleetStats } from '../../components/admin/nests/NestsFleetStats';
import { NestsHeader } from '../../components/admin/nests/NestsHeader';
import { NestsListPanel } from '../../components/admin/nests/NestsListPanel';
import { readNestFleetView } from '../../components/admin/nests/nest-fleet-utils';
import { useAuth } from '../../context/AuthContext';
import { useAdminNests } from '../../hooks/useAdminNests';
import { isFullPanelAdmin } from '../../lib/roles';
import { AlertBanner } from '../../components/ui';

export function AdminNests() {
  const { user } = useAuth();
  const fullAdmin = isFullPanelAdmin(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const view = readNestFleetView(searchParams.get('view'));

  const ctrl = useAdminNests();
  const {
    search,
    setSearch,
    nestFilter,
    setNestFilter,
    nestStatusFilter,
    setNestStatusFilter,
    eggStatusFilter,
    setEggStatusFilter,
    viewMode,
    setViewMode,
    lastUpdated,
    refreshing,
    loading,
    error,
    allNests,
    allEggs,
    filteredNests,
    filteredEggs,
    fleetStats,
    nestFilterCounts,
    eggFilterCounts,
    nestDistribution,
    hasActiveNestFilters,
    hasActiveEggFilters,
    clearNestFilters,
    clearEggFilters,
    refresh,
    reload,
  } = ctrl;

  function changeView(next: 'nests' | 'eggs') {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set('view', next);
        return params;
      },
      { replace: true },
    );
  }

  return (
    <AdminLayout>
      <Page className="ds-adm-nest-page">
        <NestsHeader
          stats={fleetStats}
          refreshing={refreshing}
          fullAdmin={fullAdmin}
          onRefresh={() => void refresh()}
          onImport={() => setShowImport(true)}
          onCreate={() => setShowCreate(true)}
        />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Couldn&apos;t load templates: {error.message}</span>
            </div>
          </AlertBanner>
        ) : null}

        <NestsFleetStats
          stats={fleetStats}
          onShowEmpty={() => {
            changeView('nests');
            setNestStatusFilter('empty');
          }}
          onShowDisabled={() => {
            changeView('eggs');
            setEggStatusFilter('disabled');
          }}
        />

        {!loading || allNests.length > 0 ? (
          <NestsFleetOverview stats={fleetStats} nestDistribution={nestDistribution} />
        ) : null}

        <NestsListPanel
          view={view}
          onViewChange={changeView}
          nests={filteredNests}
          eggs={filteredEggs}
          allNestCount={allNests.length}
          allEggCount={allEggs.length}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          nestFilter={nestFilter}
          onNestFilterChange={setNestFilter}
          nestList={allNests}
          nestStatusFilter={nestStatusFilter}
          onNestStatusFilterChange={setNestStatusFilter}
          eggStatusFilter={eggStatusFilter}
          onEggStatusFilterChange={setEggStatusFilter}
          nestFilterCounts={nestFilterCounts}
          eggFilterCounts={eggFilterCounts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasActiveFilters={view === 'nests' ? hasActiveNestFilters : hasActiveEggFilters}
          onClearFilters={view === 'nests' ? clearNestFilters : clearEggFilters}
          lastUpdated={lastUpdated}
          fullAdmin={fullAdmin}
          onImport={() => setShowImport(true)}
          onCreate={() => setShowCreate(true)}
        />
      </Page>

      {fullAdmin && showCreate ? (
        <CreateNestModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void reload();
          }}
        />
      ) : null}

      {fullAdmin && showImport ? (
        <ImportEggModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            void reload();
          }}
        />
      ) : null}
    </AdminLayout>
  );
}
