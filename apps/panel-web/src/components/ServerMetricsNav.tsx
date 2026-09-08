import { Clock, Signal, Users } from 'lucide-react';
import {
  formatPing,
  formatPlayerCount,
  formatUptime,
  pingTone,
  playerCountTone,
  type PingTone,
} from '../lib/format-uptime';
import type { ServerPingState } from '../hooks/useServerPing';

export function ServerMetricsNav({
  ping,
  pingState,
  uptimeMs,
  uptimeLive,
  playerOnline,
  playerMax,
  playerLoading,
  playerLive,
  playerUnavailable,
}: {
  ping: number | null;
  pingState: ServerPingState;
  uptimeMs: number | null;
  uptimeLive: boolean;
  playerOnline: number | null;
  playerMax: number | null;
  playerLoading: boolean;
  playerLive: boolean;
  playerUnavailable?: boolean;
  /** @deprecated compact layout is always used */
  compact?: boolean;
}) {
  const playersValue = formatPlayerCount(playerOnline, playerMax, playerLoading, playerLive, playerUnavailable);
  const playersTone = playerCountTone(playerOnline, playerLive, playerUnavailable);

  return (
    <div className="ds-srv-metrics" role="list" aria-label="Live server metrics">
      <MetricPill
        icon={Signal}
        label="Ping"
        title="Estimated latency from your device to this server’s location"
        value={pingState === 'loading' && ping == null ? '…' : formatPing(ping)}
        tone={pingTone(ping)}
        pulse={pingState === 'loading'}
      />
      <MetricPill
        icon={Clock}
        label="Uptime"
        value={uptimeLive && uptimeMs != null ? formatUptime(uptimeMs) : '—'}
        tone={uptimeLive ? 'success' : 'muted'}
      />
      <MetricPill
        icon={Users}
        label="Players"
        value={playersValue}
        tone={playersTone}
        pulse={playerLoading && playerOnline == null}
      />
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  title,
  value,
  tone,
  pulse,
}: {
  icon: typeof Signal;
  label: string;
  title?: string;
  value: string;
  tone: PingTone | 'success' | 'muted';
  pulse?: boolean;
}) {
  const toneClass =
    tone === 'success'
      ? 'ds-srv-metric--success'
      : tone === 'muted'
        ? 'ds-srv-metric--muted'
        : `ds-srv-metric--${tone}`;

  return (
    <div
      className={`ds-srv-metric ${toneClass}${pulse ? ' ds-srv-metric--pulse' : ''}`}
      role="listitem"
      title={title}
    >
      <span className="ds-srv-metric-icon" aria-hidden>
        <Icon className="h-3 w-3" />
      </span>
      <span className="ds-srv-metric-label">{label}</span>
      <span className="ds-srv-metric-value">{value}</span>
    </div>
  );
}
