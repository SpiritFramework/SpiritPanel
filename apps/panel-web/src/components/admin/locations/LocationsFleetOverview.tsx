import { Link } from 'react-router-dom';
import { HardDrive } from 'lucide-react';
import { LocationFlag } from '../../LocationFlag';
import type { LocationFleetMetrics } from './location-fleet-utils';

export function LocationsFleetOverview({
  metrics,
}: {
  metrics: LocationFleetMetrics[];
}) {
  const active = metrics.filter((m) => m.nodeCount > 0);
  const maxNodes = Math.max(1, ...active.map((m) => m.nodeCount));
  const totalNodes = metrics.reduce((n, m) => n + m.nodeCount, 0);
  const emptyCount = metrics.filter((m) => m.nodeCount === 0).length;

  if (metrics.length === 0) return null;

  return (
    <section className="ds-locs-overview" aria-label="Region distribution">
      <div className="ds-locs-overview-main">
        <div className="ds-locs-overview-head">
          <div>
            <p className="ds-locs-overview-label">Fleet spread</p>
            <p className="ds-locs-overview-sub">
              {totalNodes} node{totalNodes === 1 ? '' : 's'} across {active.length} active region
              {active.length === 1 ? '' : 's'}
              {emptyCount > 0 ? ` · ${emptyCount} empty` : ''}
            </p>
          </div>
          <Link to="/admin/nodes" className="ds-locs-overview-link">
            <HardDrive className="h-3.5 w-3.5" aria-hidden />
            View nodes
          </Link>
        </div>

        {active.length > 0 ? (
          <ul className="ds-locs-bars" aria-label="Nodes per region">
            {active
              .slice()
              .sort((a, b) => b.nodeCount - a.nodeCount)
              .slice(0, 6)
              .map((row) => {
                const pct = Math.round((row.nodeCount / maxNodes) * 100);
                return (
                  <li key={row.location.id} className="ds-locs-bar-row">
                    <Link
                      to={`/admin/locations/${row.location.id}`}
                      className="ds-locs-bar-label"
                      title={row.location.long}
                    >
                      {row.location.flagUrl ? (
                        <LocationFlag url={row.location.flagUrl} size="sm" className="ds-locs-bar-flag" />
                      ) : null}
                      <span className="truncate">{row.location.short}</span>
                    </Link>
                    <div className="ds-locs-bar-track" aria-hidden>
                      <span
                        className="ds-locs-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="ds-locs-bar-value">{row.nodeCount}</span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="ds-text-xs ds-text-muted">No nodes assigned to any region yet.</p>
        )}
      </div>

      {active.length > 0 ? (
        <div className="ds-locs-overview-side">
          <p className="ds-locs-overview-label">Top regions</p>
          <ul className="ds-locs-rank">
            {active
              .slice()
              .sort((a, b) => b.serverCount - a.serverCount)
              .slice(0, 4)
              .map((row, index) => (
                <li key={row.location.id}>
                  <Link to={`/admin/locations/${row.location.id}`} className="ds-locs-rank-item">
                    <span className="ds-locs-rank-pos">{index + 1}</span>
                    <span className="ds-locs-rank-copy min-w-0">
                      <span className="ds-locs-rank-name truncate">
                        {row.location.flagUrl ? (
                          <LocationFlag
                            url={row.location.flagUrl}
                            size="sm"
                            className="ds-locs-rank-flag"
                          />
                        ) : null}
                        {row.location.long}
                      </span>
                      <span className="ds-locs-rank-meta">
                        {row.nodeCount} node{row.nodeCount === 1 ? '' : 's'} · {row.serverCount} srv
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
