import type { BrandingAppearance } from './branding-appearance';
import { applyAppearanceDataset, normalizeAppearance } from './branding-appearance';
import { applySurfacePreset } from './branding-theme-palettes';

export type BrandingApplyConfig = {
  accentColor: string;
  secondaryColor?: string;
} & Partial<BrandingAppearance>;

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#818cf8';
  const r = Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) + 255 * amount));
  const g = Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) + 255 * amount));
  const b = Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) + 255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Apply accent + appearance tokens to any element (document root or preview scope). */
export function applyBrandingToElement(
  el: HTMLElement,
  config: BrandingApplyConfig,
  mode: 'light' | 'dark' = 'dark',
) {
  const accent = config.accentColor || '#6366f1';
  const secondary = config.secondaryColor || accent;
  const appearance = normalizeAppearance(config);

  el.style.setProperty('--accent', accent);
  el.style.setProperty('--accent-hover', lightenHex(accent, 0.15));
  el.style.setProperty('--accent-muted', hexToRgba(accent, 0.15));
  el.style.setProperty('--accent-glow', hexToRgba(accent, 0.35));
  el.style.setProperty('--accent-secondary', secondary);
  el.style.setProperty('--accent-secondary-glow', hexToRgba(secondary, 0.25));

  applyAppearanceDataset(el, appearance);
  el.dataset.theme = mode;
  applySurfacePreset(appearance.themePreset, mode, el);
}
