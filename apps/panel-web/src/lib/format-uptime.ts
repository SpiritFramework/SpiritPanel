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
