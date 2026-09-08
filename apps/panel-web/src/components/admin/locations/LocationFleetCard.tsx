import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Network, Server } from 'lucide-react';
import { LocationFlag } from '../../LocationFlag';
import type { LocationFleetMetrics } from './location-fleet-utils';

export function LocationFleetCard({ metrics }: { metrics: LocationFleetMetrics }) {
  const { location, nodeCount, serverCount, allocationCount, onlineNodes, maintenanceNodes } =
    metrics;
  const inUse = nodeCount > 0;
  const tone = !inUse ? 'empty' : maintenanceNodes > 0 && onlineNodes === 0 ? 'maintenance' : 'active';
  const statusLabel =
    !inUse ? 'Empty' : maintenanceNodes > 0 && onlineNodes === 0 ? 'Draining' : 'In use';
  const uuidShort = location.uuid.split('-')[0] ?? location.uuid.slice(0, 8);
  const created = new Date(location.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      to={`/admin/locations/${location.id}`}
      className={`ds-locs-card ds-locs-card--${tone}`}
      aria-label={`${location.long}, ${statusLabel}`}
    >
      <div className="ds-locs-card-accent" aria-hidden />

      <div className="ds-locs-card-top">
        <div className="ds-locs-card-icon" aria-hidden>
          {location.flagUrl ? (
            <LocationFlag url={location.flagUrl} size="lg" className="ds-locs-card-flag" />
          ) : (
            <MapPin className="ds-icon ds-icon--sm" />
          )}
          <span className={`ds-locs-card-pulse ds-locs-card-pulse--${tone}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="ds-locs-card-title truncate">{location.long}</h3>
            <span className={`ds-locs-card-badge ds-locs-card-badge--${tone}`}>{statusLabel}</span>
          </div>
          <p className="ds-locs-card-subtitle">
            <span className="ds-text-mono">{location.short}</span>
            <span className="opacity-50"> · </span>
            {uuidShort}
          </p>
        </div>
        <ArrowUpRight className="ds-locs-card-arrow" aria-hidden />
      </div>

      <div className="ds-locs-card-stats">
        <span className="ds-locs-card-stat">
          <Network className="h-3 w-3" aria-hidden />
          {nodeCount} node{nodeCount === 1 ? '' : 's'}
        </span>
        <span className="ds-locs-card-stat">
          <Server className="h-3 w-3" aria-hidden />
          {serverCount} srv
        </span>
        {allocationCount > 0 ? (
          <span className="ds-locs-card-stat ds-text-mono">{allocationCount} ports</span>
        ) : null}
        {inUse && onlineNodes < nodeCount ? (
          <span className="ds-locs-card-stat">
            {onlineNodes}/{nodeCount} online
          </span>
        ) : null}
      </div>

      <p className="ds-locs-card-foot">Since {created}</p>
    </Link>
  );
}
