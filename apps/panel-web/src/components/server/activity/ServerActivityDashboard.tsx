import { useState } from 'react';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerActivityPage } from '../../../hooks/useServerActivityPage';
import { ActivityHeader } from './ActivityHeader';
import { ActivityStatsRow } from './ActivityStatsRow';
import { ActivityFeedPanel } from './ActivityFeedPanel';

export function ServerActivityDashboard() {
  const {
    server,
    canClear,
    refreshToken,
    refresh,
    clearing,
    clearError,
    setClearError,
    clearActivity,
    totals,
    setTotals,
    fetchPage,
  } = useServerActivityPage();
  const [clearOpen, setClearOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    refresh();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <>
      <div className="ds-srv-act-shell">
        <ActivityHeader
          serverName={server.name}
          eggName={server.egg.name}
          eggLogoUrl={server.egg.logoUrl}
          totalEvents={totals.total}
          refreshing={refreshing}
          canClear={canClear}
          clearing={clearing}
          onRefresh={() => void handleRefresh()}
          onClear={() => {
            setClearError('');
            setClearOpen(true);
          }}
        />

        <div className="ds-srv-act-body">
          <ActivityStatsRow
            total={totals.total}
            loaded={totals.loaded}
            filtered={totals.filtered}
            hasActiveFilters={totals.hasActiveFilters}
          />

          <ActivityFeedPanel
            fetchPage={fetchPage}
            refreshKey={`${server.id}-${refreshToken}`}
            onTotalsChange={setTotals}
          />
        </div>
      </div>

      <ConfirmModal
        open={clearOpen}
        title="Clear all activity?"
        description="This permanently deletes every activity event for this server. New actions will still be logged afterward."
        detail={`${totals.total} event${totals.total === 1 ? '' : 's'} will be removed. Logs older than 30 days are already pruned automatically.`}
        confirmLabel="Clear all activity"
        tone="danger"
        loading={clearing}
        error={clearError || undefined}
        onClose={() => {
          if (clearing) return;
          setClearOpen(false);
          setClearError('');
        }}
        onConfirm={async () => {
          const ok = await clearActivity();
          if (ok) setClearOpen(false);
        }}
      />
    </>
  );
}
