import {
  DEFAULT_BRANDING_APPEARANCE,
  type AdminSidebarStyle,
  type AdminTabsStyle,
  type ClientSidebarStyle,
  type ContentDensity,
  type DefaultThemeMode,
  type LoginAmbientLevel,
  type LoginBackground,
  type MotionPreference,
  type PanelBackground,
  type ServerCardLayoutStyle,
  type ServerListDefaultView,
  type ServerSidebarStyle,
  type SidebarMaterial,
  type SurfaceRadius,
  type ThemePreset,
} from './branding-appearance';
import {
  PANEL_PRODUCT,
  PANEL_TAGLINE,
} from './product-meta';

export interface PanelGeneralSettings {  companyName: string;
  supportEmail: string;
  supportUrl: string;
  footerText: string;
}

export interface PanelMaintenanceSettings {
  enabled: boolean;
  message: string;
  allowAdminLogin: boolean;
}

export interface PanelAnnouncementSettings {
  enabled: boolean;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'success';
  showOnServers: boolean;
  showOnConsole: boolean;
  dismissible: boolean;
  revision: string;
}

export interface PanelSecuritySettings {
  minPasswordLength: number;
  adminServerSupport?: boolean;
  blockWeakPasswords?: boolean;
}

export interface PanelMarketplaceSettings {
  enabled: boolean;
  allowGithubInstalls: boolean;
}

export const DEFAULT_MARKETPLACE: PanelMarketplaceSettings = {
  enabled: true,
  allowGithubInstalls: true,
};

export interface PanelMinecraftPluginsSettings {
  enabled: boolean;
  allowModrinthInstalls: boolean;
}

export const DEFAULT_MINECRAFT_PLUGINS: PanelMinecraftPluginsSettings = {
  enabled: true,
  allowModrinthInstalls: true,
};

export interface PanelTicketsSettings {
  enabled: boolean;
  allowServerTickets: boolean;
  requireServer: boolean;
  maxOpenPerUser: number;
  discordWebhookEnabled: boolean;
  discordWebhookUrl: string;
  discordWebhookUrlSet?: boolean;
}

export const DEFAULT_TICKETS: PanelTicketsSettings = {
  enabled: true,
  allowServerTickets: true,
  requireServer: false,
  maxOpenPerUser: 10,
  discordWebhookEnabled: false,
  discordWebhookUrl: '',
};

export interface PanelBranding {
  panelName: string;
  tagline: string;
  accentColor: string;
  secondaryColor?: string;
  logoUrl: string;
  faviconUrl: string;
  loginMessage: string;
  themePreset: ThemePreset;
  defaultThemeMode: DefaultThemeMode;
  loginBackground: LoginBackground;
  panelBackground: PanelBackground;
  panelAmbient: boolean;
  serverCardStyle: ServerCardLayoutStyle;
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
  general: PanelGeneralSettings;
  maintenance: {
    enabled: boolean;
    message: string;
  };
  announcement: PanelAnnouncementSettings;
  registrationEnabled: boolean;
  ticketsEnabled: boolean;
  minPasswordLength: number;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
}

export const DEFAULT_ANNOUNCEMENT: PanelAnnouncementSettings = {
  enabled: false,
  title: 'Announcement',
  message: '',
  tone: 'info',
  showOnServers: true,
  showOnConsole: true,
  dismissible: true,
  revision: '',
};

export const DEFAULT_PANEL_BRANDING: PanelBranding = {
  panelName: PANEL_PRODUCT,
  tagline: PANEL_TAGLINE,
  accentColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  logoUrl: '',
  faviconUrl: '',
  loginMessage: 'Sign in to manage your game servers',
  ...DEFAULT_BRANDING_APPEARANCE,
  general: {
    companyName: '',
    supportEmail: '',
    supportUrl: '',
    footerText: '',
  },
  maintenance: {
    enabled: false,
    message: 'The panel is temporarily down for maintenance. Please check back soon.',
  },
  announcement: DEFAULT_ANNOUNCEMENT,
  registrationEnabled: false,
  ticketsEnabled: true,
  minPasswordLength: 8,
  turnstileEnabled: false,
  turnstileSiteKey: '',
};

export const DEFAULT_GENERAL: PanelGeneralSettings = DEFAULT_PANEL_BRANDING.general;

export const DEFAULT_MAINTENANCE: PanelMaintenanceSettings = {
  enabled: false,
  message: 'The panel is temporarily down for maintenance. Please check back soon.',
  allowAdminLogin: true,
};

export const DEFAULT_SECURITY: PanelSecuritySettings = {
  minPasswordLength: 8,
  adminServerSupport: true,
  blockWeakPasswords: true,
};
