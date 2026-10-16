import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../lib/api';
import { type ActivityEntry } from '../../lib/activity';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AdminLayout, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  AdminActivityHeader,
  ACTIVITY_SCOPES,
  isActivityScope,
  type ActivityScope,
} from '../../components/admin/activity/AdminActivityHeader';
import { AdminActivitySidebar } from '../../components/admin/activity/AdminActivitySidebar';
import { PanelActivityFeedPanel } from '../../components/admin/activity/PanelActivityFeedPanel';
import { groupPanelActivityByCategory } from '../../components/admin/activity/panel-activity-utils';

function mapActivityEntry(row: ActivityLogEntry): ActivityEntry {
  return {
    id: row.id,
    event: row.event,
    description: row.description,
    ip: row.ip,
    timestamp: row.timestamp,
    actor: row.actor,
    server: row.server ? { id: row.server.id, name: row.server.name } : null,
  };
}

export function AdminActivity() {
  const { user } = useAuth();
  const toast = useToast();
  const canClear = isFullPanelAdmin(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope');
  const scope: ActivityScope = isActivityScope(scopeParam) ? scopeParam : 'panel';

  function setScope(next: ActivityScope) {
    setSearchParams({ scope: next }, { replace: true });
  }

  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [totals, setTotals] = useState({
    total: 0,
    loaded: 0,
    filtered: 0,
    hasActiveFilters: false,
  });
  const [loadedEntries, setLoadedEntries] = useState<ActivityEntry[]>([]);

  const fetchPage = useCallback(
    async (cursor: string | null, limit: number) => {
      const result = await api.admin.activity(scope, { limit, cursor });
      return {
        items: result.items.map(mapActivityEntry),
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    [scope],
  );

  const activeScope = ACTIVITY_SCOPES.find((s) => s.id === scope) ?? ACTIVITY_SCOPES[0];
  const categoryRows = useMemo(() => groupPanelActivityByCategory(loadedEntries), [loadedEntries]);

  async function clearActivity() {
    if (!canClear) return;
    setClearing(true);
    setClearError('');
    try {
      const result = await api.admin.clearActivity(scope);
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

  function handleRefresh() {
    setRefreshing(true);
    setRefreshToken((n) => n + 1);
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <AdminLayout>
      <Page className="ds-admin-act">
        <AdminActivityHeader
          activeScope={scope}
          onScopeChange={setScope}
          total={totals.total}
          loaded={totals.loaded}
          filtered={totals.filtered}
          refreshing={refreshing}
          canClear={canClear}
          clearing={clearing}
          onRefresh={handleRefresh}
          onClear={() => {
            setClearError('');
            setClearOpen(true);
          }}
        />

        <div className="ds-admin-act__workspace">
          <section className="ds-admin-act__feed-card">
            <header className="ds-admin-act__feed-head">
              <span className="ds-admin-act__feed-head-icon" aria-hidden>
                <ScrollText className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="ds-admin-act__feed-title">Activity log</h2>
                <p className="ds-admin-act__feed-desc">{activeScope.description}. Search filters loaded events only.</p>
              </div>
            </header>
            <PanelActivityFeedPanel
              refreshKey={`${scope}-${refreshToken}`}
              fetchPage={fetchPage}
              onTotalsChange={setTotals}
              onLoadedEntriesChange={setLoadedEntries}
              emptyTitle="No panel activity yet"
              emptyDescription="Logins, registrations, and admin actions will appear here."
            />
          </section>

          <AdminActivitySidebar categoryRows={categoryRows} />
        </div>
      </Page>

      <ConfirmModal
        open={clearOpen}
        title={`Clear ${activeScope.label.toLowerCase()} activity?`}
        description="This permanently deletes every event in the current scope. New actions will still be logged afterward."
        detail={`${totals.total} event${totals.total === 1 ? '' : 's'} in “${activeScope.label}” will be removed. Logs older than 30 days are already pruned automatically.`}
        confirmLabel="Clear activity"
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
    </AdminLayout>
  );
}
