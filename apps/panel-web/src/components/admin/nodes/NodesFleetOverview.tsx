import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatResourceAmount } from '../../../lib/server-theme';
import { LocationFlag } from '../../LocationFlag';
import { NodeResourceMeter } from '../node-detail/NodeResourceMeter';
import type { FleetStats, LocationFleetRow } from './node-fleet-utils';

export function NodesFleetOverview({
  stats,
  locationRows,
  onlinePercent,
}: {
  stats: FleetStats;
  locationRows: LocationFleetRow[];
  onlinePercent: number;
}) {
  const memPct =
    stats.memoryLimit > 0 ? Math.min(100, Math.round((stats.allocatedMemory / stats.memoryLimit) * 100)) : 0;
  const diskPct =
    stats.diskLimit > 0 ? Math.min(100, Math.round((stats.allocatedDisk / stats.diskLimit) * 100)) : 0;

  if (stats.total === 0) return null;

  return (
    <section className="ds-nodes-overview" aria-label="Fleet capacity">
      <div className="ds-nodes-overview-main">
        <div className="ds-nodes-overview-head">
          <div>
            <p className="ds-nodes-overview-label">Fleet capacity</p>
            <p className="ds-nodes-overview-sub">
              {stats.online} of {stats.total} nodes online
              {onlinePercent < 100 ? ` · ${onlinePercent}% reachable` : ''}
            </p>
          </div>
          <Link to="/admin/locations" className="ds-nodes-overview-link">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Locations
          </Link>
        </div>

        <div className="ds-nodes-overview-meters">
          {stats.memoryLimit > 0 ? (
            <NodeResourceMeter
              label="Memory"
              used={stats.allocatedMemory}
              limit={stats.memoryLimit}
              percent={memPct}
              compact
            />
          ) : (
            <p className="ds-text-xs ds-text-muted">
              Memory {formatResourceAmount(stats.allocatedMemory, 'MiB')} allocated · no fleet limit
            </p>
          )}
          {stats.diskLimit > 0 ? (
            <NodeResourceMeter
              label="Disk"
              used={stats.allocatedDisk}
              limit={stats.diskLimit}
              percent={diskPct}
              compact
            />
          ) : (
            <p className="ds-text-xs ds-text-muted">
              Disk {formatResourceAmount(stats.allocatedDisk, 'MiB')} allocated · no fleet limit
            </p>
          )}
        </div>
      </div>

      {locationRows.length > 0 ? (
        <div className="ds-nodes-overview-locs">
          <p className="ds-nodes-overview-label">By location</p>
          <ul className="ds-nodes-loc-chips">
            {locationRows.map((row) => (
              <li key={row.location.id}>
                <span className="ds-nodes-loc-chip">
                  <span className="ds-nodes-loc-chip-name">
                    {row.location.flagUrl ? (
                      <LocationFlag url={row.location.flagUrl} size="sm" className="ds-nodes-loc-flag" />
                    ) : null}
                    {row.location.short}
                  </span>
                  <span className="ds-nodes-loc-chip-meta">
                    {row.online}/{row.nodes.length} online · {row.nodes.length} node
                    {row.nodes.length === 1 ? '' : 's'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
