import { WifiOff, Wrench } from 'lucide-react';

/** Secondary host condition under the server power status (card / list row). */
export function ServerHostNotice({
  nodeReachable,
  maintenanceMode,
  compact,
}: {
  nodeReachable?: boolean;
  maintenanceMode?: boolean;
  compact?: boolean;
}) {
  const unreachable = nodeReachable === false;
  const maintenance = Boolean(maintenanceMode);
  if (!unreachable && !maintenance) return null;

  return (
    <div className={`ds-servers-host-notices${compact ? ' ds-servers-host-notices--compact' : ''}`}>
      {maintenance ? (
        <span className="ds-servers-host-chip ds-servers-host-chip--maintenance">
          <Wrench className="h-3 w-3" aria-hidden />
          Maintenance
        </span>
      ) : null}
      {unreachable ? (
        <span className="ds-servers-host-chip ds-servers-host-chip--unreachable">
          <WifiOff className="h-3 w-3" aria-hidden />
          FeatherWings unreachable
        </span>
      ) : null}
    </div>
  );
}
