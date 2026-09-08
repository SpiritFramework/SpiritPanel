import { useState } from 'react';
import { CreateScheduleModal } from '../../CreateScheduleModal';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerSchedules } from '../../../hooks/useServerSchedules';
import { SchedulesHeader } from './SchedulesHeader';
import { SchedulesStatsRow } from './SchedulesStatsRow';
import { SchedulesInfoBanner } from './SchedulesInfoBanner';
import { SchedulesListPanel } from './SchedulesListPanel';

export function ServerSchedulesDashboard() {
  const sch = useServerSchedules();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await sch.load();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <>
      <div className="ds-srv-sch-shell">
        <SchedulesHeader
          serverName={sch.server.name}
          eggName={sch.server.egg.name}
          eggLogoUrl={sch.server.egg.logoUrl}
          totalCount={sch.schedules.length}
          activeCount={sch.activeCount}
          refreshing={refreshing}
          canManage={sch.access.canManageSchedules}
          onRefresh={() => void handleRefresh()}
          onCreate={() => sch.openCreate()}
        />

        <div className="ds-srv-sch-body">
          {!sch.loading ? (
            <>
              <SchedulesInfoBanner />
              <SchedulesStatsRow
                total={sch.schedules.length}
                activeCount={sch.activeCount}
                pausedCount={sch.pausedCount}
                activePercent={sch.activePercent}
              />
            </>
          ) : null}

          <SchedulesListPanel
            loading={sch.loading}
            error={sch.error}
            schedules={sch.schedules}
            filteredSchedules={sch.filteredSchedules}
            search={sch.search}
            filter={sch.filter}
            hasActiveFilters={sch.hasActiveFilters}
            runningId={sch.runningId}
            access={sch.access}
            onSearchChange={sch.setSearch}
            onFilterChange={sch.setFilter}
            onCreate={() => sch.openCreate()}
            onTemplateSelect={sch.openCreate}
            onToggle={sch.toggleActive}
            onRun={sch.runNow}
            onDelete={sch.setDeleteTarget}
          />
        </div>
      </div>

      {sch.showCreate ? (
        <CreateScheduleModal initialForm={sch.createSeed} onClose={sch.closeCreate} onCreate={sch.handleCreate} />
      ) : null}

      <ConfirmModal
        open={sch.deleteTarget !== null}
        title="Delete this schedule?"
        detail={sch.deleteTarget?.name}
        description="This removes the automated task permanently. Cron runs and manual triggers will stop for this schedule."
        confirmLabel="Delete schedule"
        tone="danger"
        loading={sch.deleteLoading}
        onClose={() => sch.setDeleteTarget(null)}
        onConfirm={sch.confirmDelete}
      />
    </>
  );
}
