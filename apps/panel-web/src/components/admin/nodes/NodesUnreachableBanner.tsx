import { AlertTriangle, ChevronRight, WifiOff } from 'lucide-react';
import { AdminCallout } from '../primitives';

export function NodesUnreachableBanner({
  offlineCount,
  maintenanceCount,
  onShowOffline,
}: {
  offlineCount: number;
  maintenanceCount: number;
  onShowOffline: () => void;
}) {
  if (offlineCount <= 0) return null;

  return (
    <AdminCallout
      tone="warning"
      icon={WifiOff}
      title={`${offlineCount} node${offlineCount === 1 ? '' : 's'} unreachable`}
      description={
        <>
          Wings is not responding on {offlineCount === 1 ? 'this host' : 'these hosts'}.
          {maintenanceCount > 0
            ? ` ${maintenanceCount} other node${maintenanceCount === 1 ? '' : 's'} in maintenance.`
            : ' Check join-data, firewall, and daemon status.'}
        </>
      }
      action={
        <button type="button" className="ds-nd-list-alert-action" onClick={onShowOffline}>
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Show offline
          <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </button>
      }
    />
  );
}
