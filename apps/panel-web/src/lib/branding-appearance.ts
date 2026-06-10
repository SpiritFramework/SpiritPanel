import { THEME_PALETTES } from './branding-theme-palettes';

export type ThemePreset =
  | 'default'
  | 'midnight'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'rose'
  | 'mono'
  | 'lavender'
  | 'crimson'
  | 'arctic'
  | 'neon'
  | 'copper'
  | 'slate'
  | 'grape'
  | 'mint'
  | 'sand'
  | 'void'
  | 'cherry';

export type DefaultThemeMode = 'system' | 'light' | 'dark';

export type LoginBackground =
  | 'gradient'
  | 'orbs'
  | 'mesh'
  | 'grid'
  | 'aurora'
  | 'minimal'
  | 'waves'
  | 'stars'
  | 'beams'
  | 'ripple';

export type PanelBackground =
  | 'gradient'
  | 'subtle'
  | 'grid'
  | 'orbs'
  | 'none'
  | 'aurora'
  | 'waves'
  | 'stars'
  | 'mesh'
  | 'shimmer';

export interface BrandingAppearance {
  themePreset: ThemePreset;
  defaultThemeMode: DefaultThemeMode;
  loginBackground: LoginBackground;
  panelBackground: PanelBackground;
}

export const DEFAULT_BRANDING_APPEARANCE: BrandingAppearance = {
  themePreset: 'default',
  defaultThemeMode: 'dark',
  loginBackground: 'gradient',
  panelBackground: 'gradient',
};

const THEME_PRESET_IDS = ['default', ...Object.keys(THEME_PALETTES)] as ThemePreset[];
const LOGIN_BG_IDS: LoginBackground[] = [
  'gradient', 'orbs', 'mesh', 'grid', 'aurora', 'minimal', 'waves', 'stars', 'beams', 'ripple',
];
const PANEL_BG_IDS: PanelBackground[] = [
  'gradient', 'subtle', 'grid', 'orbs', 'none', 'aurora', 'waves', 'stars', 'mesh', 'shimmer',
];

export const THEME_PRESET_OPTIONS = [
  {
    id: 'default' as const,
    label: 'Default',
    description: 'Balanced dark & light surfaces',
    swatch: ['#151922', '#6366f1', '#0a0c10'] as [string, string, string],
  },
  ...Object.entries(THEME_PALETTES).map(([id, p]) => ({
    id: id as ThemePreset,
    label: p.label,
    description: p.description,
    swatch: [p.dark.surface, p.accent, p.dark.bg] as [string, string, string],
  })),
];

export const DEFAULT_THEME_MODE_OPTIONS: { id: DefaultThemeMode; label: string; description: string }[] = [
  { id: 'dark', label: 'Dark', description: 'Dark mode for all new visitors' },
  { id: 'light', label: 'Light', description: 'Light mode for all new visitors' },
  { id: 'system', label: 'System', description: 'Match the visitor\'s OS preference' },
];

export const LOGIN_BACKGROUND_OPTIONS: { id: LoginBackground; label: string; description: string }[] = [
  { id: 'gradient', label: 'Gradient', description: 'Rich brand gradient wash' },
  { id: 'orbs', label: 'Orbs', description: 'Layered floating glow spheres' },
  { id: 'mesh', label: 'Mesh', description: 'Morphing color mesh blobs' },
  { id: 'aurora', label: 'Aurora', description: 'Northern-lights shimmer' },
  { id: 'waves', label: 'Waves', description: 'Flowing gradient waves' },
  { id: 'stars', label: 'Stars', description: 'Twinkling star field' },
  { id: 'beams', label: 'Beams', description: 'Rotating light rays' },
  { id: 'ripple', label: 'Ripple', description: 'Pulsing concentric rings' },
  { id: 'grid', label: 'Grid', description: 'Animated dot grid' },
  { id: 'minimal', label: 'Minimal', description: 'Flat with accent strip' },
];

export const PANEL_BACKGROUND_OPTIONS: { id: PanelBackground; label: string; description: string }[] = [
  { id: 'gradient', label: 'Gradient glow', description: 'Accent radials (default)' },
  { id: 'aurora', label: 'Aurora', description: 'Soft shifting color bands' },
  { id: 'waves', label: 'Waves', description: 'Gentle flowing motion' },
  { id: 'orbs', label: 'Orbs', description: 'Slow ambient glow drift' },
  { id: 'stars', label: 'Stars', description: 'Subtle star particles' },
  { id: 'mesh', label: 'Mesh', description: 'Blurred color mesh' },
  { id: 'shimmer', label: 'Shimmer', description: 'Diagonal light sweep' },
  { id: 'grid', label: 'Grid', description: 'Faint geometric pattern' },
  { id: 'subtle', label: 'Subtle', description: 'Very light accent wash' },
  { id: 'none', label: 'None', description: 'Solid background only' },
];

export const BRANDING_DEFAULT_THEME_EVENT = 'spirit-default-theme';
export const BRANDING_THEME_RESOLVED_EVENT = 'spirit-theme-resolved';

function isValid<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function normalizeAppearance(data?: Partial<BrandingAppearance>): BrandingAppearance {
  return {
    themePreset: isValid(data?.themePreset, THEME_PRESET_IDS) ? data.themePreset : DEFAULT_BRANDING_APPEARANCE.themePreset,
    defaultThemeMode: isValid(data?.defaultThemeMode, ['system', 'light', 'dark'] as const)
      ? data.defaultThemeMode
      : DEFAULT_BRANDING_APPEARANCE.defaultThemeMode,
    loginBackground: isValid(data?.loginBackground, LOGIN_BG_IDS)
      ? data.loginBackground
      : DEFAULT_BRANDING_APPEARANCE.loginBackground,
    panelBackground: isValid(data?.panelBackground, PANEL_BG_IDS)
      ? data.panelBackground
      : DEFAULT_BRANDING_APPEARANCE.panelBackground,
  };
}
