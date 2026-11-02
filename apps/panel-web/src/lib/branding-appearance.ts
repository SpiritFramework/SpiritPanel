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

/** Shared animated atmosphere presets for login hero and panel shells. */
export type AtmospherePreset =
  | 'aurora'
  | 'orbits'
  | 'constellation'
  | 'ripple'
  | 'beams'
  | 'tide'
  | 'ember'
  | 'lattice'
  | 'prism'
  | 'halo'
  | 'mist'
  | 'solid';

export type LoginBackground = AtmospherePreset;
export type PanelBackground = AtmospherePreset;

export type ServerCardLayoutStyle =
  | 'banner'
  | 'stripe'
  | 'glass'
  | 'edge'
  | 'neon'
  | 'minimal'
  | 'stacked'
  | 'poster'
  | 'split'
  | 'outline'
  | 'tile';

/** Legacy `auto` is accepted from stored settings but normalized to `glass`. */
export type ServerCardStylePreference = ServerCardLayoutStyle | 'auto';

export type AdminSidebarStyle = 'default' | 'rail' | 'minimal' | 'icons' | 'boxed';
export type ClientSidebarStyle = 'default' | 'floating' | 'inset' | 'pill' | 'underline';
export type ServerSidebarStyle = 'default' | 'compact' | 'wide' | 'icons' | 'stacked';
/** Admin & client shell: left sidebar or top navbar. Server pages keep a left nav. */
export type ShellLayout = 'sidebar' | 'navbar';

export type SurfaceRadius = 'default' | 'soft' | 'sharp';
export type SidebarMaterial = 'glass' | 'solid' | 'frosted';
export type ContentDensity = 'comfortable' | 'compact' | 'spacious';
export type MotionPreference = 'system' | 'full' | 'reduced';
export type ServerListDefaultView = 'grid' | 'list';
export type AdminTabsStyle = 'segmented' | 'underline' | 'pills';
export type LoginAmbientLevel = 'off' | 'standard' | 'enhanced' | 'cinematic';

export interface BrandingAppearance {
  themePreset: ThemePreset;
  defaultThemeMode: DefaultThemeMode;
  loginBackground: LoginBackground;
  panelBackground: PanelBackground;
  panelAmbient: boolean;
  serverCardStyle: ServerCardLayoutStyle;
  shellLayout: ShellLayout;
  adminSidebarStyle: AdminSidebarStyle;
  clientSidebarStyle: ClientSidebarStyle;
  serverSidebarStyle: ServerSidebarStyle;
  surfaceRadius: SurfaceRadius;
  sidebarMaterial: SidebarMaterial;
  contentDensity: ContentDensity;
  motionPreference: MotionPreference;
  serverListDefaultView: ServerListDefaultView;
  adminTabsStyle: AdminTabsStyle;
  loginAmbientLevel: LoginAmbientLevel;
  showHeroStripe: boolean;
}

export const DEFAULT_BRANDING_APPEARANCE: BrandingAppearance = {
  themePreset: 'default',
  defaultThemeMode: 'dark',
  loginBackground: 'aurora',
  panelBackground: 'mist',
  panelAmbient: true,
  serverCardStyle: 'glass',
  shellLayout: 'sidebar',
  adminSidebarStyle: 'rail',
  clientSidebarStyle: 'floating',
  serverSidebarStyle: 'compact',
  surfaceRadius: 'default',
  sidebarMaterial: 'glass',
  contentDensity: 'comfortable',
  motionPreference: 'system',
  serverListDefaultView: 'grid',
  adminTabsStyle: 'segmented',
  loginAmbientLevel: 'enhanced',
  showHeroStripe: true,
};

const THEME_PRESET_IDS = ['default', ...Object.keys(THEME_PALETTES)] as ThemePreset[];
const ATMOSPHERE_IDS: AtmospherePreset[] = [
  'aurora',
  'orbits',
  'constellation',
  'ripple',
  'beams',
  'tide',
  'ember',
  'lattice',
  'prism',
  'halo',
  'mist',
  'solid',
];

/** Map retired branding IDs onto the new atmosphere set. */
const LEGACY_ATMOSPHERE: Record<string, AtmospherePreset> = {
  gradient: 'orbits',
  orbs: 'orbits',
  mesh: 'orbits',
  grid: 'lattice',
  minimal: 'solid',
  waves: 'tide',
  stars: 'constellation',
  spotlight: 'beams',
  horizon: 'tide',
  fog: 'mist',
  circuit: 'lattice',
  dawn: 'halo',
  void: 'constellation',
  nebula: 'constellation',
  meteor: 'ember',
  pulse: 'ripple',
  shear: 'prism',
  subtle: 'mist',
  none: 'solid',
  shimmer: 'mist',
  bokeh: 'orbits',
};

function resolveAtmosphere(value: unknown, fallback: AtmospherePreset): AtmospherePreset {
  if (typeof value !== 'string') return fallback;
  if ((ATMOSPHERE_IDS as readonly string[]).includes(value)) return value as AtmospherePreset;
  return LEGACY_ATMOSPHERE[value] ?? fallback;
}
const SERVER_CARD_LAYOUT_IDS: ServerCardLayoutStyle[] = [
  'banner', 'stripe', 'glass', 'edge', 'neon', 'minimal', 'stacked', 'poster', 'split', 'outline', 'tile',
];
const SERVER_CARD_STYLE_IDS: ServerCardStylePreference[] = ['auto', ...SERVER_CARD_LAYOUT_IDS];
const SHELL_LAYOUT_IDS: ShellLayout[] = ['sidebar', 'navbar'];
const ADMIN_SIDEBAR_STYLE_IDS: AdminSidebarStyle[] = ['default', 'rail', 'minimal', 'icons', 'boxed'];
const CLIENT_SIDEBAR_STYLE_IDS: ClientSidebarStyle[] = ['default', 'floating', 'inset', 'pill', 'underline'];
const SERVER_SIDEBAR_STYLE_IDS: ServerSidebarStyle[] = ['default', 'compact', 'wide', 'icons', 'stacked'];
const SURFACE_RADIUS_IDS: SurfaceRadius[] = ['default', 'soft', 'sharp'];
const SIDEBAR_MATERIAL_IDS: SidebarMaterial[] = ['glass', 'solid', 'frosted'];
const CONTENT_DENSITY_IDS: ContentDensity[] = ['comfortable', 'compact', 'spacious'];
const MOTION_PREFERENCE_IDS: MotionPreference[] = ['system', 'full', 'reduced'];
const SERVER_LIST_VIEW_IDS: ServerListDefaultView[] = ['grid', 'list'];
const ADMIN_TABS_STYLE_IDS: AdminTabsStyle[] = ['segmented', 'underline', 'pills'];
const LOGIN_AMBIENT_LEVEL_IDS: LoginAmbientLevel[] = ['off', 'standard', 'enhanced', 'cinematic'];

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

export const ATMOSPHERE_OPTIONS: { id: AtmospherePreset; label: string; description: string }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Ribboned northern-light bands that drift across the dark' },
  { id: 'orbits', label: 'Orbits', description: 'Large floating color spheres that slowly orbit' },
  { id: 'constellation', label: 'Constellation', description: 'Twinkling star field with a soft nebula wash' },
  { id: 'ripple', label: 'Ripple', description: 'Expanding accent rings pulsing from the center' },
  { id: 'beams', label: 'Beams', description: 'Rotating light rays cutting through deep shadow' },
  { id: 'tide', label: 'Tide', description: 'Rolling luminous swells along the lower edge' },
  { id: 'ember', label: 'Ember', description: 'Rising spark particles with a warm underglow' },
  { id: 'lattice', label: 'Lattice', description: 'Perspective tech grid that breathes and drifts' },
  { id: 'prism', label: 'Prism', description: 'Sliding chromatic planes of accent color' },
  { id: 'halo', label: 'Halo', description: 'Breathing radial bloom centered in the scene' },
  { id: 'mist', label: 'Mist', description: 'Soft fog layers that drift and thicken' },
  { id: 'solid', label: 'Solid', description: 'Quiet branded wash with no motion' },
];

export const LOGIN_BACKGROUND_OPTIONS = ATMOSPHERE_OPTIONS;
export const PANEL_BACKGROUND_OPTIONS = ATMOSPHERE_OPTIONS;

export const LOGIN_AMBIENT_LEVEL_OPTIONS: { id: LoginAmbientLevel; label: string; description: string }[] = [
  { id: 'off', label: 'Off', description: 'Scene still shows, motion dialed way down' },
  { id: 'standard', label: 'Standard', description: 'Clear motion at a calm intensity' },
  { id: 'enhanced', label: 'Enhanced', description: 'Stronger glow, grain, and movement' },
  { id: 'cinematic', label: 'Cinematic', description: 'Full intensity for the login hero' },
];
export const SERVER_CARD_STYLE_OPTIONS: { id: ServerCardLayoutStyle; label: string; description: string; hint: string }[] = [
  { id: 'glass', label: 'Glass', description: 'Frosted body with accent icon ring', hint: 'Header row + stats panel' },
  { id: 'banner', label: 'Banner', description: 'Accent gradient header block', hint: 'Colored top, white title text' },
  { id: 'poster', label: 'Poster', description: 'Tall hero header with bottom-aligned title', hint: 'Cinematic card top' },
  { id: 'split', label: 'Split', description: 'Accent icon column beside the title', hint: 'Two-tone header' },
  { id: 'stripe', label: 'Stripe', description: 'Thin accent line across the top', hint: 'Subtle strip, standard body' },
  { id: 'edge', label: 'Edge', description: 'Bold left accent rail', hint: 'Vertical bar beside the icon' },
  { id: 'outline', label: 'Outline', description: 'Double-ring focus without a filled hero', hint: 'Border-forward' },
  { id: 'tile', label: 'Tile', description: 'Large watermark icon behind the title', hint: 'Icon as backdrop' },
  { id: 'neon', label: 'Neon', description: 'Soft outer glow on the card', hint: 'Glowing border + mesh tint' },
  { id: 'minimal', label: 'Minimal', description: 'Compact row-style header', hint: 'No hero block, flat layout' },
  { id: 'stacked', label: 'Stacked', description: 'Centered icon above the title', hint: 'Icon on top, text below' },
];

export const SHELL_LAYOUT_OPTIONS: { id: ShellLayout; label: string; description: string; area: string }[] = [
  {
    id: 'sidebar',
    label: 'Sidebar',
    description: 'Classic left navigation for admin and client areas',
    area: 'Admin & client shell',
  },
  {
    id: 'navbar',
    label: 'Navbar',
    description: 'Top bar with horizontal links; phones still use a drawer',
    area: 'Admin & client shell',
  },
];

export const ADMIN_SIDEBAR_STYLE_OPTIONS: { id: AdminSidebarStyle; label: string; description: string; area: string }[] = [
  { id: 'default', label: 'Classic', description: 'Filled icons on the active page', area: 'Admin dashboard sidebar' },
  { id: 'rail', label: 'Accent rail', description: 'Vertical accent bar beside active links', area: 'Admin dashboard sidebar' },
  { id: 'icons', label: 'Icon forward', description: 'Larger icon tiles, denser visual nav', area: 'Admin dashboard sidebar' },
  { id: 'boxed', label: 'Boxed links', description: 'Each item sits in its own bordered cell', area: 'Admin dashboard sidebar' },
  { id: 'minimal', label: 'Minimal', description: 'Smaller icons, text-first navigation', area: 'Admin dashboard sidebar' },
];

export const CLIENT_SIDEBAR_STYLE_OPTIONS: { id: ClientSidebarStyle; label: string; description: string; area: string }[] = [
  { id: 'default', label: 'Classic', description: 'Flat section groups with dividers', area: 'My Servers & account area' },
  { id: 'floating', label: 'Floating groups', description: 'Each nav group in its own card', area: 'My Servers & account area' },
  { id: 'pill', label: 'Pills', description: 'Rounded pill links with soft active fill', area: 'My Servers & account area' },
  { id: 'underline', label: 'Underline', description: 'Flat list with accent underline on active', area: 'My Servers & account area' },
  { id: 'inset', label: 'Inset tray', description: 'Nav links sit in recessed wells', area: 'My Servers & account area' },
];

export const SERVER_SIDEBAR_STYLE_OPTIONS: { id: ServerSidebarStyle; label: string; description: string; area: string }[] = [
  { id: 'default', label: 'Classic', description: 'Standard console / files / settings nav', area: 'Inside a server (left nav)' },
  { id: 'compact', label: 'Compact pills', description: 'Rounded pill links with dot markers', area: 'Inside a server (left nav)' },
  { id: 'icons', label: 'Icon rail', description: 'Larger icons with tighter labels', area: 'Inside a server (left nav)' },
  { id: 'stacked', label: 'Stacked blocks', description: 'Grouped blocks with stronger separators', area: 'Inside a server (left nav)' },
  { id: 'wide', label: 'Wide', description: 'Taller rows with room for subtitles', area: 'Inside a server (left nav)' },
];

export const SURFACE_RADIUS_OPTIONS: { id: SurfaceRadius; label: string; description: string }[] = [
  { id: 'default', label: 'Default', description: 'Balanced rounded corners' },
  { id: 'soft', label: 'Soft', description: 'Extra rounded cards and inputs' },
  { id: 'sharp', label: 'Sharp', description: 'Tighter corners, more technical feel' },
];

export const SIDEBAR_MATERIAL_OPTIONS: { id: SidebarMaterial; label: string; description: string }[] = [
  { id: 'glass', label: 'Glass', description: 'Translucent gradient sidebar (default)' },
  { id: 'frosted', label: 'Frosted', description: 'Heavy blur over panel background' },
  { id: 'solid', label: 'Solid', description: 'Opaque surface, no blur' },
];

export const CONTENT_DENSITY_OPTIONS: { id: ContentDensity; label: string; description: string }[] = [
  { id: 'comfortable', label: 'Comfortable', description: 'Standard padding and spacing' },
  { id: 'compact', label: 'Compact', description: 'Tighter lists and page gutters' },
  { id: 'spacious', label: 'Spacious', description: 'Extra breathing room around content' },
];

export const MOTION_PREFERENCE_OPTIONS: { id: MotionPreference; label: string; description: string }[] = [
  { id: 'system', label: 'System', description: 'Respect OS reduced-motion setting' },
  { id: 'full', label: 'Full', description: 'Always play ambient animations' },
  { id: 'reduced', label: 'Reduced', description: 'Minimize motion panel-wide' },
];

export const SERVER_LIST_VIEW_OPTIONS: { id: ServerListDefaultView; label: string; description: string }[] = [
  { id: 'grid', label: 'Grid', description: 'Card grid on My Servers (default)' },
  { id: 'list', label: 'List', description: 'Dense table view for new visitors' },
];

export const ADMIN_TABS_STYLE_OPTIONS: { id: AdminTabsStyle; label: string; description: string }[] = [
  { id: 'segmented', label: 'Segmented', description: 'Pill tab bar in a bordered track' },
  { id: 'underline', label: 'Underline', description: 'Clean tabs with bottom accent line' },
  { id: 'pills', label: 'Loose pills', description: 'Separate rounded tabs without a track' },
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
    loginBackground: resolveAtmosphere(data?.loginBackground, DEFAULT_BRANDING_APPEARANCE.loginBackground),
    panelBackground: resolveAtmosphere(data?.panelBackground, DEFAULT_BRANDING_APPEARANCE.panelBackground),
    panelAmbient: typeof data?.panelAmbient === 'boolean' ? data.panelAmbient : DEFAULT_BRANDING_APPEARANCE.panelAmbient,
    serverCardStyle: (() => {
      const stored = data?.serverCardStyle as ServerCardStylePreference | undefined;
      if (stored === 'auto') return 'glass';
      if (isValid(stored, SERVER_CARD_LAYOUT_IDS)) return stored;
      return DEFAULT_BRANDING_APPEARANCE.serverCardStyle;
    })(),
    shellLayout: isValid(data?.shellLayout, SHELL_LAYOUT_IDS)
      ? data.shellLayout
      : DEFAULT_BRANDING_APPEARANCE.shellLayout,
    adminSidebarStyle: isValid(data?.adminSidebarStyle, ADMIN_SIDEBAR_STYLE_IDS)
      ? data.adminSidebarStyle
      : DEFAULT_BRANDING_APPEARANCE.adminSidebarStyle,
    clientSidebarStyle: isValid(data?.clientSidebarStyle, CLIENT_SIDEBAR_STYLE_IDS)
      ? data.clientSidebarStyle
      : DEFAULT_BRANDING_APPEARANCE.clientSidebarStyle,
    serverSidebarStyle: isValid(data?.serverSidebarStyle, SERVER_SIDEBAR_STYLE_IDS)
      ? data.serverSidebarStyle
      : DEFAULT_BRANDING_APPEARANCE.serverSidebarStyle,
    surfaceRadius: isValid(data?.surfaceRadius, SURFACE_RADIUS_IDS)
      ? data.surfaceRadius
      : DEFAULT_BRANDING_APPEARANCE.surfaceRadius,
    sidebarMaterial: isValid(data?.sidebarMaterial, SIDEBAR_MATERIAL_IDS)
      ? data.sidebarMaterial
      : DEFAULT_BRANDING_APPEARANCE.sidebarMaterial,
    contentDensity: isValid(data?.contentDensity, CONTENT_DENSITY_IDS)
      ? data.contentDensity
      : DEFAULT_BRANDING_APPEARANCE.contentDensity,
    motionPreference: isValid(data?.motionPreference, MOTION_PREFERENCE_IDS)
      ? data.motionPreference
      : DEFAULT_BRANDING_APPEARANCE.motionPreference,
    serverListDefaultView: isValid(data?.serverListDefaultView, SERVER_LIST_VIEW_IDS)
      ? data.serverListDefaultView
      : DEFAULT_BRANDING_APPEARANCE.serverListDefaultView,
    adminTabsStyle: isValid(data?.adminTabsStyle, ADMIN_TABS_STYLE_IDS)
      ? data.adminTabsStyle
      : DEFAULT_BRANDING_APPEARANCE.adminTabsStyle,
    loginAmbientLevel: isValid(data?.loginAmbientLevel, LOGIN_AMBIENT_LEVEL_IDS)
      ? data.loginAmbientLevel
      : DEFAULT_BRANDING_APPEARANCE.loginAmbientLevel,
    showHeroStripe: typeof data?.showHeroStripe === 'boolean' ? data.showHeroStripe : DEFAULT_BRANDING_APPEARANCE.showHeroStripe,
  };
}

export function applyAppearanceDataset(root: HTMLElement, appearance: BrandingAppearance) {
  root.dataset.themePreset = appearance.themePreset;
  root.dataset.loginBg = appearance.loginBackground;
  root.dataset.panelBg = appearance.panelBackground;
  root.dataset.shellLayout = appearance.shellLayout;
  root.dataset.surfaceRadius = appearance.surfaceRadius;
  root.dataset.sidebarMaterial = appearance.sidebarMaterial;
  root.dataset.contentDensity = appearance.contentDensity;
  root.dataset.motion = appearance.motionPreference;
  root.dataset.adminTabs = appearance.adminTabsStyle;
  root.dataset.heroStripe = appearance.showHeroStripe ? 'on' : 'off';
}

export function adminSidebarClassName(style: AdminSidebarStyle): string {
  if (style === 'rail') return 'admin-sidebar sidebar-style-rail';
  if (style === 'minimal') return 'admin-sidebar sidebar-style-minimal';
  if (style === 'icons') return 'admin-sidebar sidebar-style-icons';
  if (style === 'boxed') return 'admin-sidebar sidebar-style-boxed';
  return 'admin-sidebar';
}

export function clientSidebarClassName(style: ClientSidebarStyle): string {
  if (style === 'floating') return 'client-sidebar sidebar-style-floating';
  if (style === 'inset') return 'client-sidebar sidebar-style-inset';
  if (style === 'pill') return 'client-sidebar sidebar-style-pill';
  if (style === 'underline') return 'client-sidebar sidebar-style-underline';
  return 'client-sidebar';
}

export function serverSidebarClassName(style: ServerSidebarStyle): string {
  if (style === 'compact') return 'server-sidebar sidebar-style-compact';
  if (style === 'wide') return 'server-sidebar sidebar-style-wide';
  if (style === 'icons') return 'server-sidebar sidebar-style-icons';
  if (style === 'stacked') return 'server-sidebar sidebar-style-stacked';
  return 'server-sidebar';
}

export function sidebarMaterialClassName(material: SidebarMaterial): string {
  return `sidebar-material-${material}`;
}
