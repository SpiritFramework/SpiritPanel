import type { NodeCapacityStats } from './api';
import { formatResource, formatResourceAmount } from './server-theme';

export function usageTone(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'success';
}

export function formatCapacityLabel(used: number, limit: number, unit = 'MiB'): string {
  if (limit <= 0) return `${formatResourceAmount(used, unit)} allocated`;
  return `${formatResourceAmount(used, unit)} / ${formatResource(limit, unit)}`;
}

export function formatFreeLabel(free: number, unit = 'MiB'): string {
  return `${formatResourceAmount(free, unit)} free`;
}
