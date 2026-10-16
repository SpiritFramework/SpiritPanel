import { Link } from 'react-router-dom';
import { ArrowUpRight, Gauge, MapPin, Network } from 'lucide-react';
import type { DashboardNodeHealth, DashboardStats } from '../../../pages/admin/dashboard/types';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';

export function DashboardCapacityPanel({
  stats,
  nodeHealth,
}: {
  stats: DashboardStats;
  nodeHealth: DashboardNodeHealth[];
}) {
  const allocPct =
    stats.allocationsTotal > 0
      ? Math.round((stats.allocationsUsed / stats.allocationsTotal) * 100)
      : 0;
  const allocTone = allocPct >= 90 ? 'bad' : allocPct >= 75 ? 'warn' : 'good';
  const allocFree = Math.max(0, stats.allocationsTotal - stats.allocationsUsed);

  const totals = nodeHealth.reduce(
    (acc, node) => {
      const cap = node.capacity;
      if (!cap) return acc;
      return {
        memUsed: acc.memUsed + cap.allocatedMemory,
        memLimit: acc.memLimit + cap.effectiveMemoryLimit,
        diskUsed: acc.diskUsed + cap.allocatedDisk,
        diskLimit: acc.diskLimit + cap.effectiveDiskLimit,
      };
    },
    { memUsed: 0, memLimit: 0, diskUsed: 0, diskLimit: 0 },
  );

  const memPct =
    totals.memLimit > 0 ? Math.min(100, Math.round((totals.memUsed / totals.memLimit) * 100)) : 0;
  const diskPct =
    totals.diskLimit > 0 ? Math.min(100, Math.round((totals.diskUsed / totals.diskLimit) * 100)) : 0;

  return (
    <section className="ds-admin-dash__card">
      <header className="ds-admin-dash__card-head">
        <div className="ds-admin-dash__card-head-icon" aria-hidden>
          <Gauge className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-admin-dash__card-title">Fleet capacity</h2>
          <p className="ds-admin-dash__card-desc">RAM, disk, and port headroom</p>
        </div>
        <Link to="/admin/nodes" className="ds-admin-dash__card-link">
          Nodes
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <div className="ds-admin-dash__capacity">
        {totals.memLimit > 0 ? (
          <NodeResourceMeter
            label="Fleet RAM"
            used={totals.memUsed}
            limit={totals.memLimit}
            percent={memPct}
            compact
          />
        ) : null}
        {totals.diskLimit > 0 ? (
          <NodeResourceMeter
            label="Fleet disk"
            used={totals.diskUsed}
            limit={totals.diskLimit}
            percent={diskPct}
            compact
          />
        ) : null}

        <div className={`ds-admin-dash__port ds-admin-dash__port--${allocTone}`}>
          <div className="ds-admin-dash__port-head">
            <span className="ds-admin-dash__port-label">
              <MapPin className="h-3 w-3" aria-hidden />
              Port allocation
            </span>
            <span className="ds-admin-dash__port-value">{allocPct}%</span>
          </div>
          <div className="ds-admin-dash__port-track" aria-hidden>
            <span className="ds-admin-dash__port-fill" style={{ width: `${allocPct}%` }} />
          </div>
          <p className="ds-admin-dash__port-hint">
            {stats.allocationsUsed} assigned · {allocFree} available
          </p>
        </div>

        <div className="ds-admin-dash__capacity-mini">
          <span>
            <Network className="h-3 w-3" aria-hidden />
            {stats.nodesOnline} online
          </span>
          <span>{stats.nodes - stats.nodesOnline} offline</span>
          {stats.installing > 0 ? <span>{stats.installing} installing</span> : null}
        </div>
      </div>
    </section>
  );
}
