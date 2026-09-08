import { useMemo, useState } from 'react';
import { Card } from '../../Layout';
import type { ActivityEntry } from '../../../lib/activity';
import type { UserDetailController } from '../../../pages/admin/user-detail/useUserDetail';
import { useUserActivity } from '../../../pages/admin/user-detail/useUserActivity';
import { UserActivityFeedPanel } from './activity/UserActivityFeedPanel';
import { UserActivityOverview, UserActivityToolbar } from './activity/UserActivityOverview';
import { UserActivityStatsRow } from './activity/UserActivityStatsRow';
import {
  countDistinctActivityServers,
  formatLastActivity,
  groupUserActivityByCategory,
} from './activity/user-activity-utils';

export function UserActivityDashboard({ ctrl }: { ctrl: UserDetailController }) {
  const { detail } = ctrl;
  const activity = useUserActivity(detail?.id ?? '');
  const [refreshing, setRefreshing] = useState(false);
  const [loadedEntries, setLoadedEntries] = useState<ActivityEntry[]>([]);

  const categoryRows = useMemo(
    () => groupUserActivityByCategory(loadedEntries),
    [loadedEntries],
  );

  const serversTouched = useMemo(
    () => countDistinctActivityServers(loadedEntries),
    [loadedEntries],
  );

  const lastActivity = loadedEntries[0]?.timestamp ?? detail?.recentActivity[0]?.timestamp;

  if (!detail) return null;

  async function handleRefresh() {
    setRefreshing(true);
    activity.refresh();
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div className="ds-ud-act">
      <UserActivityToolbar
        detail={detail}
        totalEvents={activity.totals.total || detail.activityCount}
        lastActivityLabel={formatLastActivity(lastActivity)}
        refreshing={refreshing}
        onRefresh={() => void handleRefresh()}
      />

      <UserActivityStatsRow
        total={activity.totals.total || detail.activityCount}
        loaded={activity.totals.loaded}
        filtered={activity.totals.filtered}
        hasActiveFilters={activity.totals.hasActiveFilters}
        serverCount={serversTouched}
      />

      {activity.totals.total > 0 ? (
        <UserActivityOverview
          categoryRows={categoryRows}
          loadedCount={activity.totals.loaded}
          totalCount={activity.totals.total}
        />
      ) : null}

      <Card title="Activity log">
        <UserActivityFeedPanel
          fetchPage={activity.fetchPage}
          refreshKey={`${detail.id}-${activity.refreshToken}`}
          onTotalsChange={activity.setTotals}
          onLoadedEntriesChange={setLoadedEntries}
        />
      </Card>
    </div>
  );
}
