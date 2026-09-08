import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Network, Server } from 'lucide-react';
import { LocationFlag } from '../../LocationFlag';
import type { LocationFleetMetrics } from './location-fleet-utils';

export function LocationFleetTable({ rows }: { rows: LocationFleetMetrics[] }) {
  return (
    <div className="ds-locs-table-wrap">
      <table className="ds-locs-table">
        <thead>
          <tr>
            <th>Region</th>
            <th>Code</th>
            <th>Nodes</th>
            <th>Servers</th>
            <th>Status</th>
            <th>Created</th>
            <th className="ds-locs-table-chevron" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LocationFleetTableRow key={row.location.id} metrics={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocationFleetTableRow({ metrics }: { metrics: LocationFleetMetrics }) {
  const navigate = useNavigate();
  const { location, nodeCount, serverCount, onlineNodes } = metrics;
  const inUse = nodeCount > 0;
  const created = new Date(location.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr
      onClick={() => navigate(`/admin/locations/${location.id}`)}
      className="ds-locs-table-row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/admin/locations/${location.id}`);
        }
      }}
    >
      <td>
        <div className="ds-locs-table-region">
          <span className="ds-locs-table-icon" aria-hidden>
            {location.flagUrl ? (
              <LocationFlag url={location.flagUrl} size="md" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="min-w-0">
            <span className="ds-locs-table-name block truncate">{location.long}</span>
            <span className="ds-locs-table-uuid block truncate ds-text-mono">{location.uuid.split('-')[0]}</span>
          </span>
        </div>
      </td>
      <td>
        <code className="ds-locs-table-code">{location.short}</code>
      </td>
      <td>
        <span className="ds-locs-table-metric">
          <Network className="h-3 w-3" aria-hidden />
          {nodeCount}
          {inUse && onlineNodes < nodeCount ? (
            <span className="ds-locs-table-metric-sub"> ({onlineNodes} online)</span>
          ) : null}
        </span>
      </td>
      <td>
        <span className="ds-locs-table-metric">
          <Server className="h-3 w-3" aria-hidden />
          {serverCount}
        </span>
      </td>
      <td>
        <span className={`ds-locs-table-badge ds-locs-table-badge--${inUse ? 'active' : 'empty'}`}>
          {inUse ? 'In use' : 'Empty'}
        </span>
      </td>
      <td className="ds-locs-table-date">{created}</td>
      <td className="ds-locs-table-chevron">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </td>
    </tr>
  );
}
