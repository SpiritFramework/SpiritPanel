import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Plus } from 'lucide-react';
import { formatResourceAmount } from '../../../lib/server-theme';
import { LocationFlag } from '../../LocationFlag';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import type { FleetStats, LocationFleetRow } from './node-fleet-utils';

function FleetResourceBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="ds-fleet-sidebar-bar">
      {limit > 0 ? (
        <NodeResourceMeter label={label} used={used} limit={limit} percent={percent} compact />
      ) : (
        <>
          <div className="ds-fleet-sidebar-bar-head">
            <span>{label}</span>
          </div>
          <p className="ds-text-xs ds-text-muted mt-1">
            {formatResourceAmount(used, 'MiB')} allocated · unlimited
          </p>
        </>
      )}
    </div>
  );
}

export function NodeFleetSidebar({
  stats,
  locationRows,
  onlinePercent,
}: {
  stats: FleetStats;
  locationRows: LocationFleetRow[];
  onlinePercent: number;
}) {
  const healthTone = onlinePercent >= 85 ? 'good' : onlinePercent >= 60 ? 'warn' : 'bad';

  return (
    <aside className="ds-fleet-sidebar" aria-label="Fleet summary">
      <div className="ds-fleet-sidebar-panel">
        <p className="ds-fleet-sidebar-label">Fleet health</p>
        <div className="ds-fleet-health-score">
          <div
            className={`ds-fleet-health-ring ds-fleet-health-ring--${healthTone}`}
            style={{ '--fleet-health': `${onlinePercent}%` } as CSSProperties}
            aria-hidden
          >
            <span className="ds-fleet-health-value">{onlinePercent}%</span>
          </div>
          <div className="min-w-0">
            <p className="ds-fleet-sidebar-strong">
              {stats.online} of {stats.total} online
            </p>
            <p className="ds-fleet-sidebar-muted">
              {stats.maintenance > 0 ? `${stats.maintenance} maintenance · ` : ''}
              {stats.offline > 0 ? `${stats.offline} unreachable` : 'All reachable'}
            </p>
          </div>
        </div>
      </div>

      <div className="ds-fleet-sidebar-panel">
        <p className="ds-fleet-sidebar-label">Capacity</p>
        <div className="ds-fleet-sidebar-stack">
          <FleetResourceBar label="Memory" used={stats.allocatedMemory} limit={stats.memoryLimit} />
          <FleetResourceBar label="Disk" used={stats.allocatedDisk} limit={stats.diskLimit} />
          <div className="ds-fleet-sidebar-bar">
            <div className="ds-fleet-sidebar-bar-head">
              <span>Network ports</span>
              <span className="ds-text-mono ds-text-xs">{stats.allocations}</span>
            </div>
            <p className="ds-text-xs ds-text-muted mt-1">Total allocations across the fleet</p>
          </div>
        </div>
      </div>

      {locationRows.length > 0 ? (
        <div className="ds-fleet-sidebar-panel">
          <p className="ds-fleet-sidebar-label">By location</p>
          <ul className="ds-fleet-loc-list">
            {locationRows.map((row) => (
              <li key={row.location.id} className="ds-fleet-loc-item">
                <div className="ds-fleet-loc-item-main">
                  <span className="ds-fleet-loc-icon" aria-hidden>
                    {row.location.flagUrl ? (
                      <LocationFlag url={row.location.flagUrl} size="md" />
                    ) : (
                      <MapPin className="ds-icon ds-icon--sm" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="ds-fleet-loc-name truncate">{row.location.short}</p>
                    <p className="ds-fleet-loc-long truncate">{row.location.long}</p>
                  </div>
                </div>
                <div className="ds-fleet-loc-item-meta">
                  <span className="ds-text-mono ds-text-xs">
                    {row.online}/{row.nodes.length}
                  </span>
                  <span className="ds-fleet-loc-online">online</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="ds-fleet-sidebar-panel ds-fleet-sidebar-cta">
        <p className="ds-fleet-sidebar-strong">Expand your fleet</p>
        <p className="ds-fleet-sidebar-muted mt-0.5">
          Register another Wings node to distribute workloads and add capacity.
        </p>
        <Link to="/admin/nodes/new" className="ds-btn ds-btn--primary ds-btn--sm mt-3">
          <Plus className="ds-icon ds-icon--sm" aria-hidden />
          Add node
        </Link>
        <Link to="/admin/locations" className="ds-fleet-sidebar-link">
          Manage locations
          <ArrowUpRight className="ds-icon ds-icon--sm" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
