import { useCallback, useState } from 'react';
import { Activity, LayoutDashboard, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { api, type ActivityLogEntry } from '../../lib/api';
import { type ActivityEntry } from '../../lib/activity';
import { AdminLayout, Button } from '../../components/Layout';
import { ActivityFeed } from '../../components/ActivityFeed';
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
  const [scope, setScope] = useState<ActivityScope>('panel');
  const [refreshToken, setRefreshToken] = useState(0);
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

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Activity' }]}>
        <AdminDetailHero
          gradient={ACTIVITY_GRADIENT}
          icon={Activity}
          title="System activity"
          subtitle={activeScope.description}
          stats={[
            { icon: LayoutDashboard, label: 'Scope', value: activeScope.label },
            { icon: Activity, label: 'Total', value: String(totals.total) },
            { icon: Users, label: 'Loaded', value: String(totals.loaded) },
            { icon: ShieldAlert, label: 'Showing', value: String(totals.filtered) },
          ]}
          actions={
            <Button
              type="button"
              variant="ghost"
              className="border border-white/15 bg-black/20 text-white hover:bg-black/30"
              onClick={() => setRefreshToken((n) => n + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
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
    </AdminLayout>
  );
}
