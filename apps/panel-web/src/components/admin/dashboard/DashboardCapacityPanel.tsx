import { Link } from 'react-router-dom';
import { ArrowUpRight, Gauge, MapPin, Network } from 'lucide-react';
import type { DashboardNodeHealth, DashboardStats } from '../../../pages/admin/dashboard/types';
import { fleetHealthScore } from '../../../pages/admin/dashboard/types';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';

export function DashboardCapacityPanel({
  stats,
  nodeHealth,
}: {
  stats: DashboardStats;
  nodeHealth: DashboardNodeHealth[];
}) {
  const health = fleetHealthScore(stats);
  const healthTone = health >= 85 ? 'good' : health >= 60 ? 'warn' : 'bad';
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
    <section className="ds-ad-card ds-ad-card--capacity">
      <header className="ds-ad-card-head">
        <div className="ds-ad-card-head-icon" aria-hidden>
          <Gauge className="ds-icon ds-icon--sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-ad-card-title">Fleet capacity</h2>
          <p className="ds-ad-card-desc">Reachability, ports, and resource headroom</p>
        </div>
        <Link to="/admin/nodes" className="ds-ad-card-link">
          Nodes
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <div className="ds-ad-capacity-grid">
        <div className="ds-ad-capacity-ring-block">
          <div className={`ds-ad-capacity-ring ds-ad-capacity-ring--${healthTone}`}>
            <svg viewBox="0 0 84 84" className="ds-ad-capacity-ring-svg" aria-hidden>
              <circle cx="42" cy="42" r="34" className="ds-ad-capacity-ring-track" />
              <circle
                cx="42"
                cy="42"
                r="34"
                className="ds-ad-capacity-ring-progress"
                strokeDasharray={`${(health / 100) * 213.6} 213.6`}
              />
            </svg>
            <span className="ds-ad-capacity-ring-value">{health}%</span>
          </div>
          <span className="ds-ad-capacity-ring-label">Fleet health</span>
        </div>

        <div className="ds-ad-capacity-meters">
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

          <div className={`ds-ad-capacity-port ds-ad-capacity-port--${allocTone}`}>
            <div className="ds-ad-capacity-port-head">
              <span className="ds-ad-capacity-port-label">
                <MapPin className="h-3 w-3" aria-hidden />
                Port allocation
              </span>
              <span className="ds-ad-capacity-port-value">{allocPct}%</span>
            </div>
            <div className="ds-ad-capacity-port-track" aria-hidden>
              <span className="ds-ad-capacity-port-fill" style={{ width: `${allocPct}%` }} />
            </div>
            <p className="ds-ad-capacity-port-hint">
              {stats.allocationsUsed} assigned · {allocFree} available
            </p>
          </div>

          <div className="ds-ad-capacity-mini">
            <span className="ds-ad-capacity-mini-item">
              <Network className="h-3 w-3" aria-hidden />
              {stats.nodesOnline} online
            </span>
            <span className="ds-ad-capacity-mini-item">
              {stats.nodes - stats.nodesOnline} offline
            </span>
            {stats.installing > 0 ? (
              <span className="ds-ad-capacity-mini-item">{stats.installing} installing</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
