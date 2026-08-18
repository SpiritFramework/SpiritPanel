import { useCallback, useState } from 'react';
import { Activity, Clock, Filter, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import type { ActivityEntry } from '../../lib/activity';
import { useToast } from '../../context/ToastContext';
import { ActivityFeed } from '../../components/ActivityFeed';
import { ConfirmModal } from '../../components/ConfirmModal';
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
  const { serverId: id, isAdminManage } = useServerManageBase();
  const { server } = useServer();
  const access = getServerAccess(server);
  const toast = useToast();
  const [refreshToken, setRefreshToken] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [totals, setTotals] = useState({ total: 0, loaded: 0, filtered: 0 });

  const canClear = access.isOwner || access.isAdminSupport || isAdminManage;

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

  async function clearActivity() {
    if (!id || !canClear) return;
    setClearing(true);
    setClearError('');
    try {
      const result = isAdminManage
        ? await api.admin.clearServerActivity(id)
        : await api.client.clearActivity(id);
      toast.success(
        result.deleted === 0
          ? 'Activity log was already empty'
          : `Deleted ${result.deleted} activity event${result.deleted === 1 ? '' : 's'}`,
      );
      setClearOpen(false);
      setRefreshToken((n) => n + 1);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Could not clear activity');
    } finally {
      setClearing(false);
    }
  }

  return (
    <ServerPage>
      <ServerPageHeader
        title="Activity"
        description="Audit trail of power actions, file edits, and configuration changes on this server. Events older than 30 days are removed automatically."
        actions={
          <>
            {canClear ? (
              <ServerToolbarButton
                icon={Trash2}
                label="Clear all"
                onClick={() => {
                  setClearError('');
                  setClearOpen(true);
                }}
                disabled={clearing}
              />
            ) : null}
            <ServerToolbarButton
              icon={RefreshCw}
              label="Refresh"
              onClick={() => setRefreshToken((n) => n + 1)}
            />
          </>
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
            search to find specific events. Retention is 30 days.
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
        onConfirm={() => void clearActivity()}
      />
    </ServerPage>
  );
}
