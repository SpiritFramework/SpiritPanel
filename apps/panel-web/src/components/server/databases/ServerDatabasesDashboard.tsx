import { useState } from 'react';
import { CreateDatabaseModal } from '../../CreateDatabaseModal';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerDatabases } from '../../../hooks/useServerDatabases';
import { DatabasesHeader } from './DatabasesHeader';
import { DatabasesStatsRow } from './DatabasesStatsRow';
import { DatabasesConnectPanel } from './DatabasesConnectPanel';
import { DatabasesListPanel } from './DatabasesListPanel';
import { DatabaseManagerModal } from './DatabaseManagerModal';

export function ServerDatabasesDashboard() {
  const db = useServerDatabases();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await db.load();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  const canCreateUi = db.access.canCreateDatabases && db.canCreate;

  return (
    <>
      <div className="ds-srv-db-shell">
        <DatabasesHeader
          serverName={db.server.name}
          eggName={db.server.egg.name}
          eggLogoUrl={db.server.egg.logoUrl}
          used={db.used}
          limit={db.limit}
          refreshing={refreshing}
          canCreate={canCreateUi}
          atLimit={db.atLimit}
          onRefresh={() => void handleRefresh()}
          onCreate={() => db.setShowCreate(true)}
        />

        <div className="ds-srv-db-body">
          {!db.loading ? (
            <DatabasesStatsRow
              used={db.used}
              limit={db.limit}
              slotsLeft={db.slotsLeft}
              usagePercent={db.usagePercent}
              hostPools={db.hostPools}
              atLimit={db.atLimit}
            />
          ) : null}

          {!db.loading && db.databases.length > 0 ? (
            <DatabasesConnectPanel database={db.databases[0]} count={db.databases.length} />
          ) : null}

          <DatabasesListPanel
            loading={db.loading}
            error={db.error}
            databases={db.databases}
            filteredDatabases={db.filteredDatabases}
            search={db.search}
            hasSearch={db.hasSearch}
            limit={db.limit}
            canCreateFromApi={db.canCreate}
            actioning={db.actioning}
            access={db.access}
            onSearchChange={db.setSearch}
            onCreate={() => db.setShowCreate(true)}
            onDelete={db.setDeleteTarget}
            managerEnabled={db.manager.enabled}
            onOpenManager={db.setManagerTarget}
          />
        </div>
      </div>

      {db.showCreate ? (
        <CreateDatabaseModal
          onClose={() => db.setShowCreate(false)}
          databaseCount={db.used}
          databaseLimit={db.limit}
          canCreate={db.canCreate}
          onCreate={db.handleCreate}
        />
      ) : null}

      {db.managerTarget && db.manager.enabled ? (
        <DatabaseManagerModal
          serverId={db.server.id}
          database={db.managerTarget}
          capabilities={db.manager}
          onClose={() => db.setManagerTarget(null)}
        />
      ) : null}

      <ConfirmModal
        open={db.deleteTarget !== null}
        title="Delete this database?"
        detail={db.deleteTarget?.name}
        description="This permanently removes the MySQL database and user from the host. Any plugins using these credentials will stop working."
        confirmLabel="Delete database"
        tone="danger"
        loading={db.deleteLoading}
        onClose={() => db.setDeleteTarget(null)}
        onConfirm={db.confirmDelete}
      />
    </>
  );
}
