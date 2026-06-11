import { Box, type LucideIcon } from 'lucide-react';
import type { ServerCardStylePreference } from './branding-appearance';

export type ServerCardStyle = 'banner' | 'stripe' | 'glass' | 'edge' | 'neon' | 'minimal' | 'stacked';

export interface ServerTheme {
  gradient: string;
  glow: string;
  accent: string;
  icon: LucideIcon;
  label: string;
}

/** Panel-accent styling for all servers — no per-game color overrides. */
const PANEL_THEME: ServerTheme = {
  gradient: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 55%, #0f172a) 0%, #0f1117 100%)',
  glow: 'var(--accent-glow)',
  accent: 'var(--accent)',
  icon: Box,
  label: 'Server',
};

export function getServerTheme(eggName: string): ServerTheme {
  return {
    ...PANEL_THEME,
    label: eggName.trim() || PANEL_THEME.label,
  };
}

export function resolveServerCardStyle(preference: ServerCardStylePreference): ServerCardStyle {
  if (!preference || preference === 'auto') return 'glass';
  return preference;
}

export function formatResource(value: number, unit: string): string {
  if (value <= 0) return 'Unlimited';
  if (value >= 1024 && unit === 'MiB') return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} GiB`;
  return `${value} ${unit}`;
}

export function formatCpuLimit(value: number): string {
  if (value <= 0) return 'Unlimited';
  return `${value}%`;
}
