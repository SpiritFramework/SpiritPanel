import { z } from 'zod';
import { prisma } from './prisma.js';
import {
  PANEL_PRODUCT,
  PANEL_TAGLINE,
} from './product-meta.js';
import { isSafeHttpUrl, isSafeImageSrc } from './safe-url.js';
import { isDiscordWebhookUrl } from './discord-webhook.js';
import type { BrandingAssetKind } from './branding-assets.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Branding field each uploadable asset kind writes to. */
export function brandingAssetField(
  kind: BrandingAssetKind,
): 'logoUrl' | 'faviconUrl' | 'appIconUrl' {
  if (kind === 'logo') return 'logoUrl';
  if (kind === 'favicon') return 'faviconUrl';
  return 'appIconUrl';
}

/** Empty, panel asset path, or http(s) URL. */
export function isValidBrandingAssetUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return isSafeImageSrc(trimmed);
}

const brandingAssetUrl = z
  .string()
  .max(512)
  .refine(isValidBrandingAssetUrl, { message: 'Must be empty, a path starting with /, or an http(s) URL' });

const themePreset = z.enum([
  'default', 'midnight', 'ocean', 'forest', 'sunset', 'rose', 'mono',
  'lavender', 'crimson', 'arctic', 'neon', 'copper', 'slate', 'grape', 'mint', 'sand', 'void', 'cherry',
]);
const defaultThemeMode = z.enum(['system', 'light', 'dark']);
const loginBackground = z.enum([
  'gradient', 'orbs', 'mesh', 'grid', 'aurora', 'minimal', 'waves', 'stars', 'beams', 'ripple', 'prism', 'spotlight',
  'horizon', 'ember', 'fog', 'circuit', 'dawn', 'void',
]);
const panelBackground = z.enum([
  'gradient', 'subtle', 'grid', 'orbs', 'none', 'aurora', 'waves', 'stars', 'mesh', 'shimmer', 'bokeh', 'prism',
  'horizon', 'ember', 'fog', 'circuit', 'dawn', 'halo',
]);
const serverCardStyle = z.enum([
  'auto', 'banner', 'stripe', 'glass', 'edge', 'neon', 'minimal', 'stacked', 'poster', 'split', 'outline', 'tile',
]);
const adminSidebarStyle = z.enum(['default', 'rail', 'minimal', 'icons', 'boxed']);
const clientSidebarStyle = z.enum(['default', 'floating', 'inset', 'pill', 'underline']);
const serverSidebarStyle = z.enum(['default', 'compact', 'wide', 'icons', 'stacked']);
const surfaceRadius = z.enum(['default', 'soft', 'sharp']);
const sidebarMaterial = z.enum(['glass', 'solid', 'frosted']);
const contentDensity = z.enum(['comfortable', 'compact', 'spacious']);
const motionPreference = z.enum(['system', 'full', 'reduced']);
const serverListDefaultView = z.enum(['grid', 'list']);
const adminTabsStyle = z.enum(['segmented', 'underline', 'pills']);
const loginAmbientLevel = z.enum(['off', 'standard', 'enhanced', 'cinematic']);

export const brandingSchema = z.object({
  panelName: z.string().min(1).max(64),
  tagline: z.string().max(120),
  accentColor: hexColor,
  secondaryColor: hexColor.optional(),
  logoUrl: brandingAssetUrl,
  faviconUrl: brandingAssetUrl,
  appIconUrl: brandingAssetUrl.optional(),
  loginMessage: z.string().max(200),
  themePreset: themePreset.optional(),
  defaultThemeMode: defaultThemeMode.optional(),
  loginBackground: loginBackground.optional(),
  panelBackground: panelBackground.optional(),
  panelAmbient: z.boolean().optional(),
  serverCardStyle: serverCardStyle.optional(),
  adminSidebarStyle: adminSidebarStyle.optional(),
  clientSidebarStyle: clientSidebarStyle.optional(),
  serverSidebarStyle: serverSidebarStyle.optional(),
  surfaceRadius: surfaceRadius.optional(),
  sidebarMaterial: sidebarMaterial.optional(),
  contentDensity: contentDensity.optional(),
  motionPreference: motionPreference.optional(),
  serverListDefaultView: serverListDefaultView.optional(),
  adminTabsStyle: adminTabsStyle.optional(),
  loginAmbientLevel: loginAmbientLevel.optional(),
  showHeroStripe: z.boolean().optional(),
});

export const generalSchema = z.object({
  companyName: z.string().max(120),
  supportEmail: z.string().max(120),
  supportUrl: z
    .string()
    .max(512)
    .refine((value) => !value.trim() || isSafeHttpUrl(value), {
      message: 'Support URL must use http or https',
    }),
  footerText: z.string().max(200),
});

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500),
  allowAdminLogin: z.boolean(),
});

export const announcementSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(120),
  message: z.string().max(1000),
  tone: z.enum(['info', 'warning', 'success']),
  showOnServers: z.boolean(),
  showOnConsole: z.boolean(),
  dismissible: z.boolean(),
  revision: z.string().max(64).optional(),
});

export const securitySchema = z.object({
  minPasswordLength: z.number().int().min(8).max(128),
  /** When true, root admins may access any server without ownership (support mode). */
  adminServerSupport: z.boolean().default(true),
  /** Reject commonly used / placeholder passwords on registration and password changes. */
  blockWeakPasswords: z.boolean().default(true),
});

export const registrationSchema = z.object({
  enabled: z.boolean(),
});

export const marketplaceSchema = z.object({
  enabled: z.boolean(),
  allowGithubInstalls: z.boolean().default(true),
});

export const minecraftPluginsSchema = z.object({
  enabled: z.boolean(),
  allowModrinthInstalls: z.boolean().default(true),
});

export const ticketsSchema = z
  .object({
    enabled: z.boolean(),
    allowServerTickets: z.boolean().default(true),
    requireServer: z.boolean().default(false),
    maxOpenPerUser: z.number().int().min(1).max(50).default(10),
    discordWebhookEnabled: z.boolean().default(false),
    discordWebhookUrl: z.string().max(512).default(''),
  })
  .superRefine((data, ctx) => {
    const url = data.discordWebhookUrl.trim();
    if (url && !isDiscordWebhookUrl(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid Discord webhook URL (https://discord.com/api/webhooks/…)',
        path: ['discordWebhookUrl'],
      });
    }
  });

export const smtpSchema = z.object({
  enabled: z.boolean(),
  host: z.string().max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().max(255),
  password: z.string().max(512).optional().default(''),
  fromAddress: z.string().max(255),
  fromName: z.string().max(255),
});

export const emailTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  heading: z.string().min(1).max(200),
  bodyHtml: z.string().max(12000),
  buttonLabel: z.string().max(64).optional(),
  enabled: z.boolean(),
});

export const EMAIL_TEMPLATE_IDS = [
  'password_reset',
  'welcome',
  'smtp_test',
  'account_suspended',
  'account_restored',
  'password_changed',
  'subuser_added',
  'server_suspended',
  'server_unsuspended',
  'server_created',
  'server_deployed',
  'server_install_failed',
] as const;

export const emailTemplatesSettingsSchema = z.object({
  password_reset: emailTemplateSchema,
  welcome: emailTemplateSchema,
  smtp_test: emailTemplateSchema,
  account_suspended: emailTemplateSchema,
  account_restored: emailTemplateSchema,
  password_changed: emailTemplateSchema,
  subuser_added: emailTemplateSchema,
  server_suspended: emailTemplateSchema,
  server_unsuspended: emailTemplateSchema,
  server_created: emailTemplateSchema,
  server_deployed: emailTemplateSchema,
  server_install_failed: emailTemplateSchema,
});

export const turnstileSchema = z.object({
  enabled: z.boolean(),
  siteKey: z.string().max(128),
  secretKey: z.string().max(512).optional().default(''),
});

export const discordAuthSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().max(128).default(''),
  clientSecret: z.string().max(128).optional().default(''),
});

export const cloudflareDnsSchema = z.object({
  enabled: z.boolean(),
  apiToken: z.string().max(255).optional().default(''),
  zoneId: z.string().max(64).default(''),
  baseDomain: z.string().max(253).default(''),
  reservedSlugs: z.array(z.string().max(63)).max(200).default([]),
});

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

export interface EmailTemplate {
  subject: string;
  heading: string;
  bodyHtml: string;
  buttonLabel?: string;
  enabled: boolean;
}

export interface EmailTemplatesSettings {
  password_reset: EmailTemplate;
  welcome: EmailTemplate;
  smtp_test: EmailTemplate;
  account_suspended: EmailTemplate;
  account_restored: EmailTemplate;
  password_changed: EmailTemplate;
  subuser_added: EmailTemplate;
  server_suspended: EmailTemplate;
  server_unsuspended: EmailTemplate;
  server_created: EmailTemplate;
  server_deployed: EmailTemplate;
  server_install_failed: EmailTemplate;
}

export interface TurnstileSettings {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
}

export interface DiscordAuthSettings {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

export interface CloudflareDnsSettings {
  enabled: boolean;
  apiToken: string;
  zoneId: string;
  baseDomain: string;
  reservedSlugs: string[];
}

export interface BrandingSettings {
  panelName: string;
  tagline: string;
  accentColor: string;
  secondaryColor?: string;
  logoUrl: string;
  faviconUrl: string;
  /** Square PWA/install icon generated from the logo or favicon. */
  appIconUrl?: string;
  loginMessage: string;
  themePreset?: 'default' | 'midnight' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'mono'
    | 'lavender' | 'crimson' | 'arctic' | 'neon' | 'copper' | 'slate' | 'grape' | 'mint' | 'sand' | 'void' | 'cherry';
  defaultThemeMode?: 'system' | 'light' | 'dark';
  loginBackground?: 'gradient' | 'orbs' | 'mesh' | 'grid' | 'aurora' | 'minimal'
    | 'waves' | 'stars' | 'beams' | 'ripple' | 'prism' | 'spotlight'
    | 'horizon' | 'ember' | 'fog' | 'circuit' | 'dawn' | 'void';
  panelBackground?: 'gradient' | 'subtle' | 'grid' | 'orbs' | 'none'
    | 'aurora' | 'waves' | 'stars' | 'mesh' | 'shimmer' | 'bokeh' | 'prism'
    | 'horizon' | 'ember' | 'fog' | 'circuit' | 'dawn' | 'halo';
  panelAmbient?: boolean;
  serverCardStyle?: 'auto' | 'banner' | 'stripe' | 'glass' | 'edge' | 'neon' | 'minimal' | 'stacked'
    | 'poster' | 'split' | 'outline' | 'tile';
  adminSidebarStyle?: 'default' | 'rail' | 'minimal' | 'icons' | 'boxed';
  clientSidebarStyle?: 'default' | 'floating' | 'inset' | 'pill' | 'underline';
  serverSidebarStyle?: 'default' | 'compact' | 'wide' | 'icons' | 'stacked';
  surfaceRadius?: 'default' | 'soft' | 'sharp';
  sidebarMaterial?: 'glass' | 'solid' | 'frosted';
  contentDensity?: 'comfortable' | 'compact' | 'spacious';
  motionPreference?: 'system' | 'full' | 'reduced';
  serverListDefaultView?: 'grid' | 'list';
  adminTabsStyle?: 'segmented' | 'underline' | 'pills';
  loginAmbientLevel?: 'off' | 'standard' | 'enhanced' | 'cinematic';
  showHeroStripe?: boolean;
}

export interface GeneralSettings {
  companyName: string;
  supportEmail: string;
  supportUrl: string;
  footerText: string;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  allowAdminLogin: boolean;
}

export interface AnnouncementSettings {
  enabled: boolean;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'success';
  showOnServers: boolean;
  showOnConsole: boolean;
  dismissible: boolean;
  revision: string;
}

export interface SecuritySettings {
  minPasswordLength: number;
  adminServerSupport: boolean;
  blockWeakPasswords: boolean;
}

export interface MarketplaceSettings {
  enabled: boolean;
  allowGithubInstalls: boolean;
}

export interface MinecraftPluginsSettings {
  enabled: boolean;
  allowModrinthInstalls: boolean;
}

export interface TicketsSettings {
  enabled: boolean;
  allowServerTickets: boolean;
  requireServer: boolean;
  maxOpenPerUser: number;
  discordWebhookEnabled: boolean;
  discordWebhookUrl: string;
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  panelName: PANEL_PRODUCT,
  tagline: PANEL_TAGLINE,
  accentColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  logoUrl: '',
  faviconUrl: '',
  appIconUrl: '',
  loginMessage: 'Sign in to manage your game servers',
  themePreset: 'default',
  defaultThemeMode: 'dark',
  loginBackground: 'gradient',
  panelBackground: 'gradient',
  panelAmbient: true,
  serverCardStyle: 'glass',
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

export const DEFAULT_GENERAL: GeneralSettings = {
  companyName: '',
  supportEmail: '',
  supportUrl: '',
  footerText: '',
};

export const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  enabled: false,
  message: 'The panel is temporarily down for maintenance. Please check back soon.',
  allowAdminLogin: true,
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: false,
  title: 'Announcement',
  message: '',
  tone: 'info',
  showOnServers: true,
  showOnConsole: true,
  dismissible: true,
  revision: '',
};

export const DEFAULT_SECURITY: SecuritySettings = {
  minPasswordLength: 8,
  adminServerSupport: true,
  blockWeakPasswords: true,
};

export const DEFAULT_MARKETPLACE: MarketplaceSettings = {
  enabled: true,
  allowGithubInstalls: true,
};

export const DEFAULT_MINECRAFT_PLUGINS: MinecraftPluginsSettings = {
  enabled: true,
  allowModrinthInstalls: true,
};

export const DEFAULT_TICKETS: TicketsSettings = {
  enabled: true,
  allowServerTickets: true,
  requireServer: false,
  maxOpenPerUser: 10,
  discordWebhookEnabled: false,
  discordWebhookUrl: '',
};

export const DEFAULT_SMTP: SmtpSettings = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromAddress: '',
  fromName: PANEL_PRODUCT,
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesSettings = {
  password_reset: {
    enabled: true,
    subject: 'Reset your {{panelName}} password',
    heading: 'Reset your password',
    buttonLabel: 'Reset password',
    bodyHtml:
      '<p>Hi {{username}},</p><p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p><p style="color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email.</p>',
  },
  welcome: {
    enabled: false,
    subject: 'Welcome to {{panelName}}',
    heading: 'Welcome aboard',
    buttonLabel: 'Open panel',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your account is ready. You can sign in any time to manage your game servers, files, and console.</p><p>If you have questions, our support team is here to help.</p>',
  },
  smtp_test: {
    enabled: true,
    subject: '{{panelName}} SMTP test',
    heading: 'SMTP test successful',
    bodyHtml:
      '<p>This is a test email from your <strong>{{panelName}}</strong> installation.</p><p>If you are reading this, outbound email delivery is configured correctly.</p>',
  },
  account_suspended: {
    enabled: true,
    subject: 'Your {{panelName}} account has been suspended',
    heading: 'Account suspended',
    buttonLabel: 'Contact support',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your account has been suspended and you will not be able to sign in until an administrator restores it.</p><p>If you believe this was a mistake, please contact our support team.</p>',
  },
  account_restored: {
    enabled: true,
    subject: 'Your {{panelName}} account has been restored',
    heading: 'Account restored',
    buttonLabel: 'Sign in',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Good news — your account has been restored and you can sign in again.</p>',
  },
  password_changed: {
    enabled: true,
    subject: 'Your {{panelName}} password was changed',
    heading: 'Password changed',
    buttonLabel: 'Open panel',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your password was recently changed. If you did not make this change, contact support immediately.</p>',
  },
  subuser_added: {
    enabled: true,
    subject: 'You have access to {{serverName}} on {{panelName}}',
    heading: 'Server access granted',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>{{ownerUsername}} has granted you access to the server <strong>{{serverName}}</strong>.</p><p>You can manage this server from your panel dashboard.</p>',
  },
  server_suspended: {
    enabled: true,
    subject: '{{serverName}} has been suspended',
    heading: 'Server suspended',
    buttonLabel: 'View servers',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been suspended by an administrator.</p><p>The server will not start until it is unsuspended. Contact support if you have questions.</p>',
  },
  server_unsuspended: {
    enabled: true,
    subject: '{{serverName}} has been restored',
    heading: 'Server restored',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been unsuspended and is available again.</p>',
  },
  server_created: {
    enabled: true,
    subject: '{{serverName}} is being set up on {{panelName}}',
    heading: 'Server provisioning started',
    buttonLabel: 'View server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Your server <strong>{{serverName}}</strong> has been created and is now installing. We will email you when it is ready to use.</p><p style="color:#64748b;font-size:13px;">Egg: {{eggName}} · Node: {{nodeName}}</p>',
  },
  server_deployed: {
    enabled: true,
    subject: '{{serverName}} is ready on {{panelName}}',
    heading: 'Your server is ready',
    buttonLabel: 'Open server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Great news — <strong>{{serverName}}</strong> has finished installing and is ready to use.</p><p>Connect at <strong>{{serverAddress}}</strong> once you start the server from the panel.</p><p style="color:#64748b;font-size:13px;">Egg: {{eggName}} · Node: {{nodeName}}</p>',
  },
  server_install_failed: {
    enabled: true,
    subject: '{{serverName}} installation failed',
    heading: 'Server installation failed',
    buttonLabel: 'View server',
    bodyHtml:
      '<p>Hi {{username}},</p><p>Unfortunately, installation for <strong>{{serverName}}</strong> did not complete successfully.</p><p>Please open the server in the panel to review logs and try reinstalling, or contact support if you need help.</p>',
  },
};

export const DEFAULT_TURNSTILE: TurnstileSettings = {
  enabled: false,
  siteKey: '',
  secretKey: '',
};

export const DEFAULT_DISCORD_AUTH: DiscordAuthSettings = {
  enabled: false,
  clientId: '',
  clientSecret: '',
};

export const DEFAULT_CLOUDFLARE_DNS: CloudflareDnsSettings = {
  enabled: false,
  apiToken: '',
  zoneId: '',
  baseDomain: '',
  reservedSlugs: [
    'panel',
    'www',
    'api',
    'mail',
    'ftp',
    'admin',
    'wings',
    'ns1',
    'ns2',
    'mx',
    'status',
    'cdn',
    'static',
    'assets',
    'billing',
    'support',
    'help',
    'remote',
    'daemon',
    'sftp',
    'client',
    'app',
    'vpn',
    'proxy',
  ],
};

async function readSetting<T extends object>(key: string, defaults: T): Promise<T> {
  const row = await prisma.panelSetting.findUnique({ where: { key } });
  if (!row?.value || typeof row.value !== 'object') return defaults;
  return { ...defaults, ...(row.value as Partial<T>) };
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  return readSetting('branding', DEFAULT_BRANDING);
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  return readSetting('general', DEFAULT_GENERAL);
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  return readSetting('maintenance', DEFAULT_MAINTENANCE);
}

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  return readSetting('announcement', DEFAULT_ANNOUNCEMENT);
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  return readSetting('security', DEFAULT_SECURITY);
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  return readSetting('smtp', DEFAULT_SMTP);
}

export async function getEmailTemplatesSettings(): Promise<EmailTemplatesSettings> {
  return readSetting('email_templates', DEFAULT_EMAIL_TEMPLATES);
}

export async function getTurnstileSettings(): Promise<TurnstileSettings> {
  return readSetting('turnstile', DEFAULT_TURNSTILE);
}

export async function getDiscordAuthSettings(): Promise<DiscordAuthSettings> {
  const raw = await readSetting('discord_auth', DEFAULT_DISCORD_AUTH);
  return {
    enabled: Boolean(raw.enabled),
    clientId: typeof raw.clientId === 'string' ? raw.clientId.trim() : '',
    clientSecret: typeof raw.clientSecret === 'string' ? raw.clientSecret : '',
  };
}

export async function isDiscordLoginEnabled(): Promise<boolean> {
  const settings = await getDiscordAuthSettings();
  return Boolean(settings.enabled && settings.clientId && settings.clientSecret);
}

export async function getCloudflareDnsSettings(): Promise<CloudflareDnsSettings> {
  const raw = await readSetting('cloudflare_dns', DEFAULT_CLOUDFLARE_DNS);
  const reserved = Array.isArray(raw.reservedSlugs)
    ? raw.reservedSlugs
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_CLOUDFLARE_DNS.reservedSlugs;
  return {
    enabled: Boolean(raw.enabled),
    apiToken: typeof raw.apiToken === 'string' ? raw.apiToken : '',
    zoneId: typeof raw.zoneId === 'string' ? raw.zoneId.trim() : '',
    baseDomain: typeof raw.baseDomain === 'string' ? raw.baseDomain.trim().toLowerCase() : '',
    reservedSlugs: reserved.length > 0 ? [...new Set(reserved)] : DEFAULT_CLOUDFLARE_DNS.reservedSlugs,
  };
}

export async function getRegistrationEnabled(): Promise<boolean> {
  const row = await prisma.panelSetting.findUnique({ where: { key: 'registration_enabled' } });
  if (!row?.value) return false;
  const parsed = registrationSchema.safeParse(row.value);
  return parsed.success ? parsed.data.enabled : false;
}

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  const raw = await readSetting('marketplace', DEFAULT_MARKETPLACE);
  return {
    enabled: Boolean(raw.enabled),
    allowGithubInstalls: raw.allowGithubInstalls !== false,
  };
}

export async function isMarketplaceEnabled(): Promise<boolean> {
  /** @deprecated Prefer isFivemMarketplaceActive() from plugins/manager — panel_plugins is source of truth. */
  const settings = await getMarketplaceSettings();
  return settings.enabled;
}

export async function isMarketplaceGithubInstallsAllowed(): Promise<boolean> {
  /** @deprecated Prefer isFivemGithubInstallsAllowed() from plugins/manager. */
  const settings = await getMarketplaceSettings();
  return settings.enabled && settings.allowGithubInstalls;
}

export async function getMinecraftPluginsSettings(): Promise<MinecraftPluginsSettings> {
  const raw = await readSetting('minecraft_plugins', DEFAULT_MINECRAFT_PLUGINS);
  return {
    enabled: Boolean(raw.enabled),
    allowModrinthInstalls: raw.allowModrinthInstalls !== false,
  };
}

/** @deprecated Prefer isMinecraftPluginsActive() from plugins/manager — panel_plugins is source of truth. */
export async function isMinecraftPluginsEnabled(): Promise<boolean> {
  const settings = await getMinecraftPluginsSettings();
  return settings.enabled;
}

/** @deprecated Prefer isMinecraftModrinthInstallsAllowed() from plugins/manager. */
export async function isMinecraftModrinthInstallsAllowed(): Promise<boolean> {
  const settings = await getMinecraftPluginsSettings();
  return settings.enabled && settings.allowModrinthInstalls;
}

export async function getTicketsSettings(): Promise<TicketsSettings> {
  const raw = await readSetting('tickets', DEFAULT_TICKETS);
  return {
    enabled: Boolean(raw.enabled),
    allowServerTickets: raw.allowServerTickets !== false,
    requireServer: Boolean(raw.requireServer),
    maxOpenPerUser: raw.maxOpenPerUser ?? DEFAULT_TICKETS.maxOpenPerUser,
    discordWebhookEnabled: Boolean(raw.discordWebhookEnabled),
    discordWebhookUrl: typeof raw.discordWebhookUrl === 'string' ? raw.discordWebhookUrl : '',
  };
}

export async function isTicketsEnabled(): Promise<boolean> {
  const settings = await getTicketsSettings();
  return settings.enabled;
}

export async function assertTicketsEnabledForClients(): Promise<void> {
  const enabled = await isTicketsEnabled();
  if (!enabled) {
    const err = new Error('Support tickets are currently disabled');
    (err as { statusCode?: number }).statusCode = 403;
    throw err;
  }
}

export async function getPublicPanelConfig() {
  const [branding, general, maintenance, announcement, registrationEnabled, security, turnstile, tickets, discordAuth] =
    await Promise.all([
    getBrandingSettings(),
    getGeneralSettings(),
    getMaintenanceSettings(),
    getAnnouncementSettings(),
    getRegistrationEnabled(),
    getSecuritySettings(),
    getTurnstileSettings(),
    getTicketsSettings(),
    getDiscordAuthSettings(),
  ]);

  const turnstileActive = turnstile.enabled && Boolean(turnstile.siteKey) && Boolean(turnstile.secretKey);

  return {
    ...branding,
    general,
    maintenance: {
      enabled: maintenance.enabled,
      message: maintenance.message,
    },
    announcement: {
      enabled: announcement.enabled,
      title: announcement.title,
      message: announcement.message,
      tone: announcement.tone,
      showOnServers: announcement.showOnServers,
      showOnConsole: announcement.showOnConsole,
      dismissible: announcement.dismissible,
      revision: announcement.revision,
    },
    registrationEnabled,
    minPasswordLength: security.minPasswordLength,
    ticketsEnabled: tickets.enabled,
    turnstileEnabled: turnstileActive,
    turnstileSiteKey: turnstileActive ? turnstile.siteKey : '',
    discordLoginEnabled: Boolean(discordAuth.enabled && discordAuth.clientId && discordAuth.clientSecret),
  };
}

export async function upsertPanelSetting(key: string, value: unknown) {
  await prisma.panelSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export async function getMinPasswordLength(): Promise<number> {
  const security = await getSecuritySettings();
  return security.minPasswordLength;
}

export async function isAdminServerSupportEnabled(): Promise<boolean> {
  const security = await getSecuritySettings();
  return security.adminServerSupport;
}

export async function isWeakPasswordBlockingEnabled(): Promise<boolean> {
  const security = await getSecuritySettings();
  return security.blockWeakPasswords;
}
