import { Link } from 'react-router-dom';
import { Gauge, HardDrive, MapPin, MemoryStick } from 'lucide-react';
import { formatResource, formatResourceAmount } from '../../../lib/server-theme';
import { usageTone } from '../../../lib/node-capacity';
import { LocationFlag } from '../../LocationFlag';
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
  if (stats.total === 0) return null;

  const memPct =
    stats.memoryLimit > 0 ? Math.min(100, Math.round((stats.allocatedMemory / stats.memoryLimit) * 100)) : 0;
  const diskPct =
    stats.diskLimit > 0 ? Math.min(100, Math.round((stats.allocatedDisk / stats.diskLimit) * 100)) : 0;

  return (
    <section className="ds-nd-list-overview" aria-label="Fleet capacity">
      <header className="ds-nd-list-overview-head">
        <span className="ds-nd-list-overview-icon" aria-hidden>
          <Gauge className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ds-nd-list-overview-eyebrow">Pressure</p>
          <h2 className="ds-nd-list-overview-title">Fleet capacity</h2>
          <p className="ds-nd-list-overview-desc">
            {stats.online} of {stats.total} nodes online
            {onlinePercent < 100 ? ` · ${onlinePercent}% reachable` : ''}
          </p>
        </div>
        <Link to="/admin/locations" className="ds-nd-tool-btn">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Locations
        </Link>
      </header>

      <div className="ds-nd-list-overview-body">
        <div className="ds-nd-list-overview-meters">
          <FleetMeter
            icon={MemoryStick}
            label="Memory"
            usedLabel={formatResourceAmount(stats.allocatedMemory, 'MiB')}
            limitLabel={
              stats.memoryLimit > 0 ? formatResource(stats.memoryLimit, 'MiB') : 'Unlimited'
            }
            percent={memPct}
            unlimited={stats.memoryLimit <= 0}
          />
          <FleetMeter
            icon={HardDrive}
            label="Disk"
            usedLabel={formatResourceAmount(stats.allocatedDisk, 'MiB')}
            limitLabel={stats.diskLimit > 0 ? formatResource(stats.diskLimit, 'MiB') : 'Unlimited'}
            percent={diskPct}
            unlimited={stats.diskLimit <= 0}
          />
        </div>

        {locationRows.length > 0 ? (
          <div className="ds-nd-list-overview-locs">
            <p className="ds-nd-list-overview-locs-label">By location</p>
            <ul className="ds-nd-list-loc-list">
              {locationRows.map((row) => {
                const offline = row.nodes.length - row.online;
                return (
                  <li key={row.location.id}>
                    <div
                      className={`ds-nd-list-loc${offline > 0 ? ' ds-nd-list-loc--warn' : ''}`}
                    >
                      <span className="ds-nd-list-loc-name">
                        {row.location.flagUrl ? (
                          <LocationFlag
                            url={row.location.flagUrl}
                            size="sm"
                            className="ds-nd-list-loc-flag"
                          />
                        ) : null}
                        {row.location.short}
                      </span>
                      <span className="ds-nd-list-loc-meta">
                        {row.online}/{row.nodes.length} online
                      </span>
                      <span className="ds-nd-list-loc-count">
                        {row.nodes.length} node{row.nodes.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FleetMeter({
  icon: Icon,
  label,
  usedLabel,
  limitLabel,
  percent,
  unlimited,
}: {
  icon: typeof MemoryStick;
  label: string;
  usedLabel: string;
  limitLabel: string;
  percent: number;
  unlimited: boolean;
}) {
  const tone = unlimited ? null : usageTone(percent);
  const fill =
    tone === 'warning' ? 'ds-progress-fill--warn' : tone === 'danger' ? 'ds-progress-fill--bad' : 'ds-progress-fill--good';

  return (
    <div className={`ds-nd-list-meter${tone ? ` ds-nd-list-meter--${tone}` : ''}`}>
      <div className="ds-nd-list-meter-head">
        <span className="ds-nd-list-meter-icon" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="ds-nd-list-meter-title">{label}</p>
        <span className="ds-nd-list-meter-pct">{unlimited ? '—' : `${percent}%`}</span>
      </div>
      <div className="ds-progress ds-nd-list-meter-bar" aria-hidden>
        <div
          className={`ds-progress-fill ${fill}`}
          style={{ width: `${unlimited ? 0 : Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
      <p className="ds-nd-list-meter-values">
        <span className="font-mono">{usedLabel}</span>
        <span className="opacity-50">/</span>
        <span className="font-mono opacity-70">{limitLabel}</span>
      </p>
    </div>
  );
}
