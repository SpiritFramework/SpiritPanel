import { readFile } from 'node:fs/promises';
import { getBrandingSettings, getGeneralSettings } from './panel-settings.js';
import { resolveBrandingAssetPath } from './branding-assets.js';

/**
 * Background colours per theme preset, used for the PWA splash screen.
 *
 * Mirrors the `bg` token in `apps/panel-web/src/lib/branding-theme-palettes.ts`,
 * which stays the source of truth. Only `bg` is duplicated here because the
 * splash screen paints before any CSS loads, so the API has to know it up front.
 */
const PRESET_BACKGROUNDS: Record<string, { dark: string; light: string }> = {
  default: { dark: '#050810', light: '#eef2fb' },
  midnight: { dark: '#050810', light: '#eef2fb' },
  ocean: { dark: '#061018', light: '#eef8fb' },
  forest: { dark: '#060f0a', light: '#eef8f2' },
  sunset: { dark: '#100a08', light: '#fbf4ee' },
  rose: { dark: '#100810', light: '#fbf0f6' },
  mono: { dark: '#0a0a0a', light: '#f4f4f4' },
  lavender: { dark: '#0c0a14', light: '#f5f2fc' },
  crimson: { dark: '#100808', light: '#fbf2f2' },
  arctic: { dark: '#080c12', light: '#f0f8ff' },
  neon: { dark: '#0a0612', light: '#faf5ff' },
  copper: { dark: '#0e0a06', light: '#faf6f0' },
  slate: { dark: '#0c0e12', light: '#f1f5f9' },
  grape: { dark: '#0c0810', light: '#f8f2fc' },
  mint: { dark: '#061210', light: '#f0fdfa' },
  sand: { dark: '#100e08', light: '#faf8f2' },
  void: { dark: '#030304', light: '#fafafa' },
  cherry: { dark: '#0e0608', light: '#fdf2f4' },
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Smallest icon Chrome/Android will accept as an installable app icon. */
const MIN_APP_ICON_PX = 192;

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

/**
 * Reads width/height straight out of a PNG's IHDR chunk.
 *
 * The monorepo has no image library, and we need real dimensions because a
 * manifest icon whose declared `sizes` don't match the file is ignored.
 */
export function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buf.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

/**
 * Extracts the stored PNG filename from a branding asset URL, or null when the
 * URL is empty, externally hosted, or not a PNG.
 *
 * Stored URLs carry a `?v=` cache-busting query that is not part of the name.
 */
export function pngAssetFilename(assetUrl: string): string | null {
  if (!assetUrl.startsWith('/')) return null;
  const filename = assetUrl.split('/').pop()?.split('?')[0];
  if (!filename || !filename.toLowerCase().endsWith('.png')) return null;
  return filename;
}

/**
 * Promotes an uploaded branding asset to the app icon when it is a square PNG
 * that is large enough. Anything else falls back to the bundled icons so the
 * app stays installable.
 *
 * `purpose` is 'any maskable' because Branding Studio renders these with the
 * logo inside the maskable safe zone, so one file serves both cases.
 */
async function brandedIcon(assetUrl: string): Promise<ManifestIcon | null> {
  const filename = pngAssetFilename(assetUrl);
  if (!filename) return null;

  const path = resolveBrandingAssetPath(filename);
  if (!path) return null;

  try {
    const size = readPngSize(await readFile(path));
    if (!size) return null;
    if (size.width !== size.height) return null;
    if (size.width < MIN_APP_ICON_PX) return null;
    return {
      src: assetUrl,
      sizes: `${size.width}x${size.height}`,
      type: 'image/png',
      purpose: 'any maskable',
    };
  } catch {
    return null;
  }
}

const BUNDLED_ICONS: ManifestIcon[] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/**
 * Builds the manifest icon list.
 *
 * When a branded icon exists it is returned alone. Listing the bundled icons
 * alongside it would put two entries at the same size with overlapping
 * purposes, and browsers are free to pick either — in practice they tend to
 * take the last match, which would show the default mark instead of the
 * operator's branding.
 */
export function manifestIcons(branded: ManifestIcon | null): ManifestIcon[] {
  return branded ? [branded] : [...BUNDLED_ICONS];
}

/** Home-screen labels get truncated aggressively, so keep `short_name` tight. */
export function shortName(panelName: string): string {
  const trimmed = panelName.trim() || 'Panel';
  if (trimmed.length <= 12) return trimmed;
  const firstWord = trimmed.split(/[\s·|-]+/)[0];
  return (firstWord && firstWord.length <= 12 ? firstWord : trimmed.slice(0, 12)).trim();
}

export async function buildWebManifest() {
  const [branding, general] = await Promise.all([getBrandingSettings(), getGeneralSettings()]);

  const preset = PRESET_BACKGROUNDS[branding.themePreset ?? 'default'] ?? PRESET_BACKGROUNDS.default;
  // 'system' can't be resolved server-side; dark matches the panel's default.
  const mode = branding.defaultThemeMode === 'light' ? 'light' : 'dark';
  const background = preset[mode];

  // Prefer the purpose-built app icon; a large square favicon is a decent
  // second choice for deploys that never generated one.
  const branded =
    (await brandedIcon(branding.appIconUrl ?? '')) ?? (await brandedIcon(branding.faviconUrl ?? ''));
  const icons = manifestIcons(branded);

  const name = branding.panelName?.trim() || 'Spirit Panel';
  const description = branding.tagline?.trim() || general.companyName?.trim() || name;

  return {
    // A stable id keeps the installed app identity fixed even if the name changes.
    id: '/',
    name,
    short_name: shortName(name),
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    // Chrome tints the title bar / status bar with this.
    theme_color: background,
    background_color: background,
    categories: ['utilities', 'productivity'],
    icons,
    shortcuts: [
      {
        name: 'My Servers',
        short_name: 'Servers',
        url: '/servers',
        icons: [icons[0]],
      },
    ],
  };
}
