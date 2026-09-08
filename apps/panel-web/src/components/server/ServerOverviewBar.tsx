import { Copy, MapPin, Network } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAdminSupport } from '../../context/AdminSupportContext';
import type { ServerPingState } from '../../hooks/useServerPing';
import { LocationFlag } from '../LocationFlag';
import { CompactBackLink } from '../Nav';
import { ServerMetricsNav } from '../ServerMetricsNav';

export function ServerOverviewBar({
  themeGradient,
  address,
  copied,
  onCopyAddress,
  ping,
  pingState,
  uptimeMs,
  uptimeLive,
  playerOnline,
  playerMax,
  playerLoading,
  playerLive,
  playerUnavailable,
  compact = false,
}: {
  themeGradient: string;
  address: string;
  copied: boolean;
  onCopyAddress: () => void;
  ping: number | null;
  pingState: ServerPingState;
  uptimeMs: number | null;
  uptimeLive: boolean;
  playerOnline: number | null;
  playerMax: number | null;
  playerLoading: boolean;
  playerLive: boolean;
  playerUnavailable?: boolean;
  compact?: boolean;
}) {
  const { server } = useServer();
  const adminSupport = useAdminSupport();

  const metrics = (
    <ServerMetricsNav
      ping={ping}
      pingState={pingState}
      uptimeMs={uptimeMs}
      uptimeLive={uptimeLive}
      playerOnline={playerOnline}
      playerMax={playerMax}
      playerLoading={playerLoading}
      playerLive={playerLive}
      playerUnavailable={playerUnavailable}
    />
  );

  return (
    <div className={`ds-srv-bar shrink-0${compact ? ' ds-srv-bar--compact' : ''}`}>
      <div className="ds-srv-bar-accent" style={{ background: themeGradient }} aria-hidden />

      {/* Phone / tablet portrait: compact strip — full desktop bar from md up */}
      <div className="ds-srv-bar-mobile">
        <div className="ds-srv-bar-mobile-row">
          <CompactBackLink
            to={adminSupport?.backTo ?? '/servers'}
            label={adminSupport ? 'Admin' : 'Servers'}
          />
          <OverviewAddressButton address={address} onCopy={onCopyAddress} className="min-w-0 flex-1" />
        </div>
        <div className="ds-srv-bar-metrics ds-srv-bar-metrics--scroll">{metrics}</div>
      </div>

      <div className="ds-srv-bar-main">
        <div className="ds-srv-bar-cluster ds-srv-bar-cluster--nav">
          <CompactBackLink
            to={adminSupport?.backTo ?? '/servers'}
            label={adminSupport ? 'Admin server' : 'My servers'}
          />
        </div>

        <div className="ds-srv-bar-cluster ds-srv-bar-cluster--address">
          <OverviewAddressButton address={address} onCopy={onCopyAddress} />
          {copied ? <span className="ds-srv-bar-copied">Copied</span> : null}
        </div>

        <div className="ds-srv-bar-metrics">{metrics}</div>

        <div className="ds-srv-bar-location" title={`${server.node.location?.short ?? server.node.name} · ${server.node.name}`}>
          <span className="ds-srv-bar-location-flag" aria-hidden>
            <LocationFlag url={server.node.location?.flagUrl} size="sm" />
            {!server.node.location?.flagUrl ? <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" /> : null}
          </span>
          <span className="ds-srv-bar-location-text">
            <span className="ds-srv-bar-location-region">{server.node.location?.short ?? server.node.name}</span>
            <span className="ds-srv-bar-location-node">{server.node.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewAddressButton({
  address,
  onCopy,
  className = '',
}: {
  address: string;
  onCopy: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`${address} — click to copy`}
      className={`ds-srv-bar-address group ${className}`.trim()}
    >
      <Network className="h-3.5 w-3.5 shrink-0 ds-srv-bar-address-icon" aria-hidden />
      <span className="min-w-0 truncate font-mono">{address}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-50 transition group-hover:opacity-100" aria-hidden />
    </button>
  );
}
