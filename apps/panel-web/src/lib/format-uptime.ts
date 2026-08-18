export function formatUptime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return '<1s';

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatPing(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  return `${Math.round(ms)} ms`;
}

export type PingTone = 'success' | 'warning' | 'danger' | 'muted';

export function pingTone(ms: number | null | undefined): PingTone {
  if (ms == null || !Number.isFinite(ms)) return 'muted';
  if (ms < 60) return 'success';
  if (ms < 120) return 'warning';
  return 'danger';
}

export const PING_TONE_CLASS: Record<PingTone, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-orange-400',
  muted: 'text-[var(--muted)]',
};

export function formatPlayerCount(
  online: number | null,
  max: number | null,
  loading: boolean,
  live: boolean,
  unavailable?: boolean,
): string {
  if (!live) return '—';
  if (loading && online == null) return '…';
  if (unavailable) return '—';
  if (online == null) return '—';
  return max != null ? `${online} / ${max}` : String(online);
}

export function playerCountTone(
  online: number | null,
  live: boolean,
  unavailable?: boolean,
): PingTone | 'success' | 'muted' {
  if (!live || unavailable || online == null) return 'muted';
  return online > 0 ? 'success' : 'muted';
}
