import type { NodeCapacityStats } from './api';
import { formatResource } from './server-theme';

export function usageTone(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'success';
}

export function formatCapacityLabel(used: number, limit: number, unit = 'MiB'): string {
  if (limit <= 0) return `${formatResource(used, unit)} allocated`;
  return `${formatResource(used, unit)} / ${formatResource(limit, unit)}`;
}

export function formatFreeLabel(free: number, unit = 'MiB'): string {
  return `${formatResource(free, unit)} free`;
}
