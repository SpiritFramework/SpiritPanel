import { useCallback, useState } from 'react';
import { Activity, Clock, Filter, RefreshCw, ScrollText } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../lib/api';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import type { ActivityEntry } from '../../lib/activity';
import { ActivityFeed } from '../../components/ActivityFeed';
import {
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';
import { StatCard } from '../../components/ui';

function mapActivityEntry(row: ActivityLogEntry): ActivityEntry {
  return {
    id: row.id,
    event: row.event,
    description: row.description,
    ip: row.ip,
    timestamp: row.timestamp,
    actor: row.actor,
  };
}

export function ServerActivityPage() {
  const id = useServerRouteId();
  const [refreshToken, setRefreshToken] = useState(0);
  const [totals, setTotals] = useState({ total: 0, loaded: 0, filtered: 0 });

  const fetchPage = useCallback(
    async (cursor: string | null, limit: number) => {
      if (!id) return { items: [], total: 0, hasMore: false, nextCursor: null };
      const result = await api.client.activity(id, { limit, cursor });
      return {
        items: result.items.map(mapActivityEntry),
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    [id],
  );

  return (
    <ServerPage>
      <ServerPageHeader
        title="Activity"
        description="Audit trail of power actions, file edits, and configuration changes on this server"
        actions={
          <ServerToolbarButton
            icon={RefreshCw}
            label="Refresh"
            onClick={() => setRefreshToken((n) => n + 1)}
          />
        }
      />

      <section className="activity-hero">
        <div className="activity-hero-icon">
          <ScrollText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="activity-hero-title">Server audit log</p>
          <p className="activity-hero-text">
            Every panel action is recorded with the user, IP address, and timestamp. Filter by category or
            search to find specific events.
          </p>
        </div>
      </section>

      {totals.total > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total events"
            value={String(totals.total)}
            hint="All recorded actions on this server"
            icon={<Activity className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Loaded"
            value={String(totals.loaded)}
            hint={totals.loaded < totals.total ? 'Load more to see older events' : 'All events loaded'}
            icon={<Clock className="h-3.5 w-3.5" />}
            tone={totals.loaded < totals.total ? 'info' : 'default'}
          />
          <StatCard
            label="Showing"
            value={String(totals.filtered)}
            hint="After search and category filters"
            icon={<Filter className="h-3.5 w-3.5" />}
            tone={totals.filtered < totals.loaded ? 'warning' : 'default'}
          />
        </div>
      )}

      <ServerPanel icon={Activity} iconTone="cyan" title="Event log" description="Chronological list of server actions">
        <ActivityFeed
          refreshKey={`${id}-${refreshToken}`}
          fetchPage={fetchPage}
          layout="server"
          filters
          search
          onTotalsChange={setTotals}
          emptyTitle="No activity yet"
          emptyDescription="Power commands, file edits, and settings changes will show up here."
        />
      </ServerPanel>
    </ServerPage>
  );
}
