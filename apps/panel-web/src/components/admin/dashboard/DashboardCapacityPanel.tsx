import { Link } from 'react-router-dom';
import { ArrowUpRight, Gauge, HardDrive, MapPin, MemoryStick, Network } from 'lucide-react';
import type { DashboardNodeHealth, DashboardStats } from '../../../pages/admin/dashboard/types';
import { formatResource, formatResourceAmount } from '../../../lib/server-theme';

function toneForPct(pct: number): 'good' | 'warn' | 'bad' {
  if (pct >= 90) return 'bad';
  if (pct >= 75) return 'warn';
  return 'good';
}

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
  const allocTone = toneForPct(allocPct);
  const allocFree = Math.max(0, stats.allocationsTotal - stats.allocationsUsed);
  const nodesOffline = stats.nodes - stats.nodesOnline;

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
    <section className="ds-admin-dash__card ds-admin-dash__card--capacity">
      <header className="ds-admin-dash__card-head">
        <div className="ds-admin-dash__card-head-icon" aria-hidden>
          <Gauge className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-admin-dash__card-title">Fleet capacity</h2>
          <p className="ds-admin-dash__card-desc">RAM, disk, ports, and reachability</p>
        </div>
        <Link to="/admin/nodes" className="ds-admin-dash__card-link">
          Nodes
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <div className="ds-admin-dash__capacity">
        <div className="ds-admin-dash__capacity-grid">
          <CapacityMeter
            icon={MemoryStick}
            label="Fleet RAM"
            pct={memPct}
            tone={toneForPct(memPct)}
            primary={
              totals.memLimit > 0
                ? `${formatResourceAmount(totals.memUsed, 'MiB')} / ${formatResource(totals.memLimit, 'MiB')}`
                : 'No limits reported'
            }
            secondary={totals.memLimit > 0 ? `${memPct}% allocated` : 'Add node capacity limits'}
          />
          <CapacityMeter
            icon={HardDrive}
            label="Fleet disk"
            pct={diskPct}
            tone={toneForPct(diskPct)}
            primary={
              totals.diskLimit > 0
                ? `${formatResourceAmount(totals.diskUsed, 'MiB')} / ${formatResource(totals.diskLimit, 'MiB')}`
                : 'No limits reported'
            }
            secondary={totals.diskLimit > 0 ? `${diskPct}% allocated` : 'Add node capacity limits'}
          />
          <CapacityMeter
            icon={MapPin}
            label="Ports"
            pct={allocPct}
            tone={allocTone}
            primary={`${stats.allocationsUsed} / ${stats.allocationsTotal || '—'}`}
            secondary={`${allocFree} free · ${allocPct}% used`}
          />
          <div
            className={`ds-admin-dash__cap-tile ds-admin-dash__cap-tile--reach ${
              nodesOffline > 0 ? 'ds-admin-dash__cap-tile--bad' : 'ds-admin-dash__cap-tile--good'
            }`}
          >
            <div className="ds-admin-dash__cap-tile-top">
              <span className="ds-admin-dash__cap-tile-icon" aria-hidden>
                <Network className="h-3.5 w-3.5" />
              </span>
              <span className="ds-admin-dash__cap-tile-label">Reachability</span>
            </div>
            <p className="ds-admin-dash__cap-tile-value">
              {stats.nodesOnline}
              <span className="ds-admin-dash__cap-tile-of">/{stats.nodes}</span>
            </p>
            <p className="ds-admin-dash__cap-tile-hint">
              {nodesOffline > 0
                ? `${nodesOffline} offline${stats.installing > 0 ? ` · ${stats.installing} installing` : ''}`
                : stats.installing > 0
                  ? `All online · ${stats.installing} installing`
                  : 'All nodes reachable'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CapacityMeter({
  icon: Icon,
  label,
  pct,
  tone,
  primary,
  secondary,
}: {
  icon: typeof MemoryStick;
  label: string;
  pct: number;
  tone: 'good' | 'warn' | 'bad';
  primary: string;
  secondary: string;
}) {
  return (
    <div className={`ds-admin-dash__cap-tile ds-admin-dash__cap-tile--${tone}`}>
      <div className="ds-admin-dash__cap-tile-top">
        <span className="ds-admin-dash__cap-tile-icon" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="ds-admin-dash__cap-tile-label">{label}</span>
        <span className="ds-admin-dash__cap-tile-pct">{pct}%</span>
      </div>
      <div className="ds-admin-dash__cap-track" aria-hidden>
        <span className="ds-admin-dash__cap-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="ds-admin-dash__cap-tile-primary ds-text-mono">{primary}</p>
      <p className="ds-admin-dash__cap-tile-hint">{secondary}</p>
    </div>
  );
}
