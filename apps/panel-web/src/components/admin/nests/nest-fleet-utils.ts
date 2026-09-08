import type { AdminEggSummary, AdminNestSummary } from '../../../lib/api';

export const NEST_GRADIENT =
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #2e1065 100%)';
export const EGG_GRADIENT =
  'linear-gradient(135deg, #78350f 0%, #d97706 45%, #451a03 100%)';

export type NestFleetView = 'nests' | 'eggs';
export type NestListFilter = 'all' | 'with-eggs' | 'empty';
export type EggListFilter = 'all' | 'enabled' | 'disabled' | 'deployed';

export interface NestFleetStats {
  nests: number;
  eggs: number;
  withEggs: number;
  empty: number;
  deployed: number;
  disabled: number;
  enabled: number;
}

export function computeNestFleetStats(
  nests: AdminNestSummary[],
  eggs: AdminEggSummary[],
): NestFleetStats {
  const withEggs = nests.filter((n) => n._count.eggs > 0).length;
  const empty = nests.length - withEggs;
  const deployed = eggs.reduce((sum, e) => sum + e._count.servers, 0);
  const disabled = eggs.filter((e) => !e.enabled).length;
  const enabled = eggs.length - disabled;

  return {
    nests: nests.length,
    eggs: eggs.length,
    withEggs,
    empty,
    deployed,
    disabled,
    enabled,
  };
}

export function matchesNestFilter(nest: AdminNestSummary, filter: NestListFilter): boolean {
  if (filter === 'with-eggs') return nest._count.eggs > 0;
  if (filter === 'empty') return nest._count.eggs === 0;
  return true;
}

export function matchesEggFilter(egg: AdminEggSummary, filter: EggListFilter): boolean {
  if (filter === 'enabled') return egg.enabled;
  if (filter === 'disabled') return !egg.enabled;
  if (filter === 'deployed') return egg._count.servers > 0;
  return true;
}

export function computeNestFilterCounts(nests: AdminNestSummary[]): Record<NestListFilter, number> {
  return {
    all: nests.length,
    'with-eggs': nests.filter((n) => n._count.eggs > 0).length,
    empty: nests.filter((n) => n._count.eggs === 0).length,
  };
}

export function computeEggFilterCounts(eggs: AdminEggSummary[]): Record<EggListFilter, number> {
  return {
    all: eggs.length,
    enabled: eggs.filter((e) => e.enabled).length,
    disabled: eggs.filter((e) => !e.enabled).length,
    deployed: eggs.filter((e) => e._count.servers > 0).length,
  };
}

export function groupEggsByNest(eggs: AdminEggSummary[]): { nest: string; count: number }[] {
  const map = new Map<string, number>();
  for (const egg of eggs) {
    map.set(egg.nest.name, (map.get(egg.nest.name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([nest, count]) => ({ nest, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function getNestFleetTone(stats: NestFleetStats): 'healthy' | 'warning' | 'neutral' {
  if (stats.nests === 0) return 'neutral';
  if (stats.empty > 0 || stats.disabled > 0) return 'warning';
  return 'healthy';
}

export function readNestFleetView(value: string | null): NestFleetView {
  return value === 'eggs' ? 'eggs' : 'nests';
}
