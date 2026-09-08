import {
  DEFAULT_BRANDING_APPEARANCE,
  type BrandingAppearance,
} from '../../../lib/branding-appearance';

export interface BrandingForm extends BrandingAppearance {
  panelName: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  /** Square install/app icon rendered from the logo or favicon. */
  appIconUrl: string;
  loginMessage: string;
}

export const DEFAULT_BRANDING_FORM: BrandingForm = {
  panelName: 'Spirit-Panel',
  tagline: 'Game server panel',
  accentColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  logoUrl: '',
  faviconUrl: '',
  appIconUrl: '',
  loginMessage: 'Sign in to manage your game servers',
  ...DEFAULT_BRANDING_APPEARANCE,
};

export interface SmtpForm {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export const DEFAULT_SMTP_FORM: SmtpForm = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromAddress: '',
  fromName: 'Spirit-Panel',
};
