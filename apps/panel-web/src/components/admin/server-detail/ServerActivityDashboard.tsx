import { useState } from 'react';
import { Card } from '../../Layout';
import { ConfirmModal } from '../../ConfirmModal';
import { ActivityHeader } from '../../server/activity/ActivityHeader';
import { ActivityStatsRow } from '../../server/activity/ActivityStatsRow';
import { ActivityFeedPanel } from '../../server/activity/ActivityFeedPanel';
import type { ServerDetailController } from '../../../pages/admin/server-detail/useServerDetail';
import { useServerActivity } from '../../../pages/admin/server-detail/useServerActivity';

export function ServerActivityDashboard({
  ctrl,
  fullAdmin,
}: {
  ctrl: ServerDetailController;
  fullAdmin: boolean;
}) {
  const { detail } = ctrl;
  const activity = useServerActivity(detail?.id ?? '');
  const [clearOpen, setClearOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!detail) return null;

  async function handleRefresh() {
    setRefreshing(true);
    activity.refresh();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  const totalEvents = activity.totals.total || detail.recentActivity.length;

  return (
    <>
      <div className="ds-asd-act">
        <ActivityHeader
          serverName={detail.name}
          eggName={detail.egg.name}
          eggLogoUrl={detail.egg.logoUrl}
          totalEvents={totalEvents}
          refreshing={refreshing}
          canClear={fullAdmin}
          clearing={activity.clearing}
          onRefresh={() => void handleRefresh()}
          onClear={() => {
            activity.setClearError('');
            setClearOpen(true);
          }}
        />

        <ActivityStatsRow
          total={totalEvents}
          loaded={activity.totals.loaded}
          filtered={activity.totals.filtered}
          hasActiveFilters={activity.totals.hasActiveFilters}
        />

        <Card title="Activity log">
          <ActivityFeedPanel
            fetchPage={activity.fetchPage}
            refreshKey={`${detail.id}-${activity.refreshToken}`}
            onTotalsChange={activity.setTotals}
          />
        </Card>
      </div>

      <ConfirmModal
        open={clearOpen}
        title="Clear all activity?"
        description="This permanently deletes every activity event for this server. New actions will still be logged afterward."
        detail={`${totalEvents} event${totalEvents === 1 ? '' : 's'} will be removed. Logs older than 30 days are already pruned automatically.`}
        confirmLabel="Clear all activity"
        tone="danger"
        loading={activity.clearing}
        error={activity.clearError || undefined}
        onClose={() => {
          if (activity.clearing) return;
          setClearOpen(false);
          activity.setClearError('');
        }}
        onConfirm={async () => {
          const ok = await activity.clearActivity();
          if (ok) setClearOpen(false);
        }}
      />
    </>
  );
}
