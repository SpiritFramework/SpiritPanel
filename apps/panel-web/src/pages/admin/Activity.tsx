import { useCallback, useState } from 'react';
import { Activity, LayoutDashboard, RefreshCw, ShieldAlert, Trash2, Users } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../lib/api';
import { type ActivityEntry } from '../../lib/activity';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isFullPanelAdmin } from '../../lib/roles';
import { AdminLayout, Button } from '../../components/Layout';
import { ActivityFeed } from '../../components/ActivityFeed';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminDetailTabs,
} from '../../components/AdminDetailLayout';

type ActivityScope = 'panel' | 'auth' | 'admin';

const SCOPES: { id: ActivityScope; label: string; description: string; icon: typeof Activity }[] = [
  { id: 'panel', label: 'All panel', description: 'Everything across the panel', icon: LayoutDashboard },
  { id: 'auth', label: 'Auth & signups', description: 'Logins and registrations', icon: Users },
  { id: 'admin', label: 'Admin actions', description: 'Staff changes and provisioning', icon: ShieldAlert },
];

const ACTIVITY_GRADIENT =
  'linear-gradient(135deg, color-mix(in srgb, var(--accent) 70%, #1e3a8a) 0%, #0f172a 55%, #020617 100%)';

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
  const [scope, setScope] = useState<ActivityScope>('panel');
  const [refreshToken, setRefreshToken] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [totals, setTotals] = useState({ total: 0, loaded: 0, filtered: 0 });

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

  const activeScope = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

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

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Activity' }]}>
        <AdminDetailHero
          gradient={ACTIVITY_GRADIENT}
          icon={Activity}
          title="System activity"
          subtitle={`${activeScope.description}. Events older than 30 days are removed automatically.`}
          stats={[
            { icon: LayoutDashboard, label: 'Scope', value: activeScope.label },
            { icon: Activity, label: 'Total', value: String(totals.total) },
            { icon: Users, label: 'Loaded', value: String(totals.loaded) },
            { icon: ShieldAlert, label: 'Showing', value: String(totals.filtered) },
          ]}
          actions={
            <>
              {canClear ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-white/15 bg-black/20 text-white hover:bg-black/30"
                  disabled={clearing}
                  onClick={() => {
                    setClearError('');
                    setClearOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear scope
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="border border-white/15 bg-black/20 text-white hover:bg-black/30"
                onClick={() => setRefreshToken((n) => n + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </>
          }
        />

        <AdminDetailTabs
          tabs={SCOPES.map((s) => ({ id: s.id, label: s.label }))}
          active={scope}
          onChange={setScope}
        />

        <AdminDetailBody>
          <ActivityFeed
            refreshKey={`${scope}-${refreshToken}`}
            fetchPage={fetchPage}
            layout="full"
            search
            adminCategories
            showEventKey
            onTotalsChange={setTotals}
            emptyTitle="No panel activity yet"
            emptyDescription="Logins, registrations, and admin actions will appear here."
          />
        </AdminDetailBody>
      </AdminDetailPage>

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
