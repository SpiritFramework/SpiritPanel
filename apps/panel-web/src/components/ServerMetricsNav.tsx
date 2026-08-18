import { Clock, Signal, Users } from 'lucide-react';
import {
  formatPing,
  formatPlayerCount,
  formatUptime,
  pingTone,
  playerCountTone,
  PING_TONE_CLASS,
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
  compact,
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
  compact?: boolean;
}) {
  const playersValue = formatPlayerCount(playerOnline, playerMax, playerLoading, playerLive, playerUnavailable);
  const playersTone = playerCountTone(playerOnline, playerLive, playerUnavailable);

  if (compact) {
    return (
      <div className="server-metrics-strip flex flex-wrap items-center gap-2">
        <MetricChip
          icon={Signal}
          label="Ping"
          value={pingState === 'loading' && ping == null ? '…' : formatPing(ping)}
          tone={pingTone(ping)}
          pulse={pingState === 'loading'}
        />
        <MetricChip
          icon={Clock}
          label="Uptime"
          value={uptimeLive && uptimeMs != null ? formatUptime(uptimeMs) : '—'}
          tone={uptimeLive ? 'success' : 'muted'}
        />
        <MetricChip
          icon={Users}
          label="Players"
          value={playersValue}
          tone={playersTone}
          pulse={playerLoading && playerOnline == null}
        />
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-xl border border-[var(--border)]/80 bg-[var(--bg-elevated)]/50 p-2.5">
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
        Live metrics
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={Signal}
          label="Ping"
          value={pingState === 'loading' && ping == null ? 'Measuring…' : formatPing(ping)}
          hint={pingState === 'unreachable' ? 'Port unreachable' : pingState === 'idle' ? 'Server offline' : 'Your connection'}
          tone={pingTone(ping)}
          loading={pingState === 'loading' && ping == null}
        />
        <MetricTile
          icon={Clock}
          label="Uptime"
          value={uptimeLive && uptimeMs != null ? formatUptime(uptimeMs) : '—'}
          hint={uptimeLive ? 'Container running' : 'Start server for uptime'}
          tone={uptimeLive ? 'success' : 'muted'}
        />
        <MetricTile
          icon={Users}
          label="Players"
          value={playersValue}
          hint={
            !playerLive
              ? 'Start server for player count'
              : playerUnavailable
                ? 'Player count unavailable'
                : 'Online players'
          }
          tone={playersTone}
          loading={playerLoading && playerOnline == null}
        />
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading,
}: {
  icon: typeof Signal;
  label: string;
  value: string;
  hint: string;
  tone: PingTone | 'success' | 'muted';
  loading?: boolean;
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-400'
      : tone in PING_TONE_CLASS
        ? PING_TONE_CLASS[tone as PingTone]
        : 'text-[var(--text)]';

  return (
    <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--surface)]/40 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--muted)]">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </div>
      <p className={`mt-1 truncate text-sm font-semibold tabular-nums ${valueClass} ${loading ? 'animate-pulse' : ''}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
  tone,
  pulse,
}: {
  icon: typeof Signal;
  label: string;
  value: string;
  tone: PingTone | 'success' | 'muted';
  pulse?: boolean;
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-400'
      : tone in PING_TONE_CLASS
        ? PING_TONE_CLASS[tone as PingTone]
        : 'text-[var(--text)]';

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)]/60 bg-[var(--bg-elevated)]/40 px-2.5 py-1 text-[11px]">
      <Icon className="h-3 w-3 shrink-0 text-[var(--muted)]" />
      <span className="metric-chip-label text-[var(--muted)]">{label}</span>
      <span className={`font-semibold tabular-nums ${valueClass} ${pulse ? 'animate-pulse' : ''}`}>{value}</span>
    </span>
  );
}
