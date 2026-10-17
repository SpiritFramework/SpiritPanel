import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { ConfirmModal } from '../../ConfirmModal';
import { useServerActivityPage } from '../../../hooks/useServerActivityPage';
import { ActivityHeader } from './ActivityHeader';
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
          <section className="ds-srv-act-feed-wrap" aria-label="Activity log">
            <div className="ds-srv-act-feed-head">
              <span className="ds-srv-act-feed-head-icon" aria-hidden>
                <ScrollText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="ds-srv-act-feed-title">Activity log</h2>
                <p className="ds-srv-act-feed-desc">Search and filters apply to loaded events only</p>
              </div>
            </div>
            <ActivityFeedPanel
              fetchPage={fetchPage}
              refreshKey={`${server.id}-${refreshToken}`}
              onTotalsChange={setTotals}
            />
          </section>
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
