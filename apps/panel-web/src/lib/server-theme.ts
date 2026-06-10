import { Box, Cpu, Gamepad2, Pickaxe, Swords, type LucideIcon } from 'lucide-react';

export interface ServerTheme {
  gradient: string;
  glow: string;
  icon: LucideIcon;
  label: string;
}

const THEMES: Array<{ match: RegExp; theme: ServerTheme }> = [
  {
    match: /minecraft|paper|spigot|forge|fabric|vanilla/i,
    theme: {
      gradient: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #052e16 100%)',
      glow: 'rgba(34, 197, 94, 0.25)',
      icon: Pickaxe,
      label: 'Minecraft',
    },
  },
  {
    match: /rust/i,
    theme: {
      gradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 40%, #431407 100%)',
      glow: 'rgba(249, 115, 22, 0.25)',
      icon: Swords,
      label: 'Rust',
    },
  },
  {
    match: /ark|survival|valheim|terraria/i,
    theme: {
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 40%, #0f172a 100%)',
      glow: 'rgba(59, 130, 246, 0.25)',
      icon: Gamepad2,
      label: 'Survival',
    },
  },
];

const DEFAULT_THEME: ServerTheme = {
  gradient: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 60%, #0f172a) 0%, #0f1117 100%)',
  glow: 'var(--accent-glow)',
  icon: Box,
  label: 'Game Server',
};

export function getServerTheme(eggName: string): ServerTheme {
  for (const { match, theme } of THEMES) {
    if (match.test(eggName)) return theme;
  }
  return DEFAULT_THEME;
}

export function formatResource(value: number, unit: string): string {
  if (value >= 1024 && unit === 'MiB') return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} GiB`;
  return `${value} ${unit}`;
}
