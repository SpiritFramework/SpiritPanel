import { useState } from 'react';
import { CreateBackupModal } from '../../CreateBackupModal';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerBackups } from '../../../hooks/useServerBackups';
import { BackupsHeader } from './BackupsHeader';
import { BackupsStatsRow } from './BackupsStatsRow';
import { BackupsListPanel } from './BackupsListPanel';

export function ServerBackupsDashboard() {
  const bk = useServerBackups();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await bk.load();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <>
      <div className="ds-srv-bk-shell">
        <BackupsHeader
          serverName={bk.server.name}
          eggName={bk.server.egg.name}
          eggLogoUrl={bk.server.egg.logoUrl}
          used={bk.used}
          limit={bk.limit}
          pendingCount={bk.pendingCount}
          refreshing={refreshing}
          canCreate={bk.access.canCreateBackups && bk.canCreate}
          atLimit={bk.atLimit}
          onRefresh={() => void handleRefresh()}
          onCreate={() => bk.setShowCreate(true)}
        />

        <div className="ds-srv-bk-body">
          {!bk.loading ? (
            <BackupsStatsRow
              used={bk.used}
              limit={bk.limit}
              slotsLeft={bk.slotsLeft}
              totalBytes={bk.totalBytes}
              pendingCount={bk.pendingCount}
              completeCount={bk.completeCount}
              disk={bk.disk}
            />
          ) : null}

          <BackupsListPanel
            loading={bk.loading}
            error={bk.error}
            backups={bk.backups}
            filteredBackups={bk.filteredBackups}
            totalCount={bk.backups.length}
            search={bk.search}
            filter={bk.filter}
            hasActiveFilters={bk.hasActiveFilters}
            actioning={bk.actioning}
            access={bk.access}
            canCreate={bk.canCreate}
            onSearchChange={bk.setSearch}
            onFilterChange={bk.setFilter}
            onCreate={() => bk.setShowCreate(true)}
            onRestore={(backup) => bk.setConfirm({ kind: 'restore', backup })}
            onDelete={(backup) => bk.setConfirm({ kind: 'delete', backup })}
            onLock={bk.handleLock}
            onDownload={bk.handleDownload}
          />
        </div>
      </div>

      {bk.showCreate ? (
        <CreateBackupModal
          onClose={() => bk.setShowCreate(false)}
          backupCount={bk.used}
          backupLimit={bk.limit}
          canCreate={bk.canCreate}
          disk={bk.disk}
          onCreate={bk.handleCreate}
        />
      ) : null}

      <ConfirmModal
        open={bk.confirm?.kind === 'delete'}
        title="Delete this backup?"
        detail={bk.confirm?.backup.name}
        description="This permanently removes the archive from the node. Locked backups must be unlocked first."
        confirmLabel="Delete backup"
        tone="danger"
        loading={bk.confirmLoading}
        onClose={() => bk.setConfirm(null)}
        onConfirm={bk.executeConfirm}
      />

      <ConfirmModal
        open={bk.confirm?.kind === 'restore'}
        title="Restore this backup?"
        detail={bk.confirm?.backup.name}
        description="This overwrites current server files and stops the server. Players will be disconnected until the restore completes."
        confirmLabel="Restore backup"
        tone="warning"
        loading={bk.confirmLoading}
        onClose={() => bk.setConfirm(null)}
        onConfirm={bk.executeConfirm}
      />
    </>
  );
}
