import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Database, Headphones, LogIn, Mail, Server, Shield, Terminal, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelBranding } from '../lib/panel-settings';
import { sanitizeImageSrc, sanitizeLinkHref } from '../lib/safe-url';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';
import { normalizeAppearance } from '../lib/branding-appearance';
import { PanelName, panelNameGradientStyle, panelNameInitial } from './PanelName';
import { AuthorAttribution } from './AuthorAttribution';

const FEATURES = [
  {
    icon: Server,
    title: 'Deploy servers',
    description: 'Launch and manage game servers from a single dashboard.',
  },
  {
    icon: Terminal,
    title: 'Full control',
    description: 'Console, files, schedules, and backups — all in one place.',
  },
  {
    icon: Shield,
    title: 'Built for teams',
    description: 'Secure access with subusers, roles, and activity logs.',
  },
] as const;

const CAPABILITIES = [
  { icon: Terminal, label: 'Console' },
  { icon: Database, label: 'Backups' },
  { icon: Server, label: 'Files' },
] as const;

export function AuthLayout({
  branding,
  children,
}: {
  branding: PanelBranding;
  children: ReactNode;
}) {
  const companyLabel = branding.general.companyName.trim() || branding.panelName;
  const panelBgClass = usePanelBackgroundClass();
  const appearance = normalizeAppearance(branding);

  return (
    <div className="ds-auth-layout">
      <aside
        className="login-brand-panel ds-auth-hero"
        data-login-bg={appearance.loginBackground}
        data-login-ambient={appearance.loginAmbientLevel}
      >
        <div className="login-bg-canvas pointer-events-none absolute inset-0" aria-hidden />
        <div className="login-bg-ambient" aria-hidden>
          <span className="login-ambient-orb login-ambient-orb--1" />
          <span className="login-ambient-orb login-ambient-orb--2" />
          <span className="login-ambient-orb login-ambient-orb--3" />
        </div>
        <div className="login-bg-overlay pointer-events-none absolute inset-0" aria-hidden />
        <div className="login-bg-grain" aria-hidden />
        <div className="login-shine-sweep" aria-hidden />
        <div className="login-dot-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-transparent to-black/10" />

        <div className="ds-auth-hero-inner">
          <AuthHeroBrand
            logoUrl={branding.logoUrl}
            panelName={branding.panelName}
            tagline={branding.tagline}
          />

          <div className="ds-auth-hero-content">
            <div className="ds-auth-hero-intro">
              <p className="ds-auth-hero-eyebrow">Control panel</p>
              <h2 className="ds-auth-hero-headline">{branding.loginMessage}</h2>
              <div className="ds-auth-hero-capabilities">
                {CAPABILITIES.map(({ icon: Icon, label }) => (
                  <span key={label} className="ds-auth-hero-cap">
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="ds-auth-hero-panel">
              <p className="ds-auth-hero-panel-label">Everything you need</p>
              <ul className="ds-auth-feature-list">
                {FEATURES.map(({ icon: Icon, title, description }, index) => (
                  <li key={title} className="ds-auth-feature-card">
                    <span className="ds-auth-feature-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="ds-auth-feature-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="ds-auth-feature-copy">
                      <span className="ds-auth-feature-title">{title}</span>
                      <span className="ds-auth-feature-desc">{description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ds-auth-hero-footer">
            <SupportFooter general={branding.general} companyLabel={companyLabel} onDark />
            <AuthorAttribution variant="sidebar" onDark className="mt-4 opacity-90" />
          </div>
        </div>
      </aside>

      <main className={`ds-auth-main ${panelBgClass}`}>
        <div className="ds-auth-main-inner">
          <div className="ds-auth-mobile-brand">
            <AuthBrandBlock
              logoUrl={branding.logoUrl}
              panelName={branding.panelName}
              tagline={branding.tagline}
            />
          </div>

          {children}

          <div className="ds-auth-attribution">
            <AuthorAttribution variant="auth" />
          </div>

          <div className="ds-auth-support-mobile">
            <SupportFooter general={branding.general} companyLabel={companyLabel} />
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthTabs({
  active,
  registrationEnabled,
}: {
  active: 'login' | 'signup';
  registrationEnabled: boolean;
}) {
  if (!registrationEnabled) return null;

  return (
    <nav className="ds-auth-tabs" aria-label="Account">
      <Link
        to="/login"
        className={`ds-auth-tab ${active === 'login' ? 'ds-auth-tab--active' : ''}`}
        aria-current={active === 'login' ? 'page' : undefined}
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </Link>
      <Link
        to="/signup"
        className={`ds-auth-tab ${active === 'signup' ? 'ds-auth-tab--active' : ''}`}
        aria-current={active === 'signup' ? 'page' : undefined}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Create account
      </Link>
    </nav>
  );
}

export function AuthMaintenanceBanner({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="ds-auth-banner" role="status">
      <Shield className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="ds-auth-banner-title">{title}</p>
        <p className="ds-auth-banner-text">{message}</p>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="ds-auth-shell">
      <div className="ds-auth-shell-accent" aria-hidden />
      <div className="ds-auth-shell-body">{children}</div>
    </div>
  );
}

/** @deprecated Use AuthShell — kept for forgot/reset password pages */
export const AuthCard = AuthShell;

export function AuthHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <header className="ds-auth-header">
      <span className="ds-auth-header-icon">
        <Icon className="h-5 w-5" />
      </span>
      <div className="ds-auth-header-text">
        <p className="ds-auth-eyebrow">{eyebrow}</p>
        <h1 className="ds-auth-title">{title}</h1>
        <p className="ds-auth-description">{description}</p>
      </div>
    </header>
  );
}

export function AuthField({
  label,
  icon: Icon,
  trailing,
  value,
  onChange,
  ...props
}: {
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="ds-auth-field">
      <span className="ds-auth-label">{label}</span>
      <div className="ds-auth-input-wrap">
        <Icon className="ds-auth-input-icon" />
        <input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ds-auth-input"
        />
        {trailing}
      </div>
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  const warning =
    message.toLowerCase().includes('suspended') || message.toLowerCase().includes('maintenance');

  return (
    <div className={`ds-auth-alert ${warning ? 'ds-auth-alert--warning' : 'ds-auth-alert--error'}`} role="alert">
      {message}
    </div>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className="ds-auth-footer">{children}</div>;
}

function AuthHeroBrand({
  logoUrl,
  panelName,
  tagline,
}: {
  logoUrl: string;
  panelName: string;
  tagline: string;
}) {
  const safeLogo = sanitizeImageSrc(logoUrl);

  return (
    <div className="ds-auth-hero-brand">
      <div className="ds-auth-hero-logo-wrap">
        <span className="ds-auth-hero-logo-glow" aria-hidden />
        {safeLogo ? (
          <div className="ds-auth-hero-logo">
            <img src={safeLogo} alt="" />
          </div>
        ) : (
          <div className="ds-auth-hero-logo" style={panelNameGradientStyle()}>
            <span className="ds-auth-hero-logo-fallback">{panelNameInitial(panelName)}</span>
          </div>
        )}
      </div>
      <div className="ds-auth-hero-brand-copy">
        <PanelName name={panelName} variant="hero" as="h1" className="block" />
        {tagline.trim() && <span className="ds-auth-hero-badge">{tagline}</span>}
      </div>
    </div>
  );
}

function AuthBrandBlock({
  logoUrl,
  panelName,
  tagline,
  large,
}: {
  logoUrl: string;
  panelName: string;
  tagline: string;
  large?: boolean;
}) {
  const safeLogo = sanitizeImageSrc(logoUrl);

  if (large) {
    return <AuthHeroBrand logoUrl={logoUrl} panelName={panelName} tagline={tagline} />;
  }

  return (
    <div className="ds-auth-hero-brand items-center">
      {safeLogo ? (
        <div className="ds-auth-hero-logo !h-12 !w-12 !rounded-xl">
          <img src={safeLogo} alt="" />
        </div>
      ) : (
        <div className="ds-auth-hero-logo !h-12 !w-12 !rounded-xl" style={panelNameGradientStyle()}>
          <span className="ds-auth-hero-logo-fallback !text-base">{panelNameInitial(panelName)}</span>
        </div>
      )}
      <div className="min-w-0">
        <PanelName name={panelName} variant="compact" as="span" className="block truncate" />
        {tagline.trim() && <span className="ds-auth-hero-badge !mt-1.5 !text-[0.625rem]">{tagline}</span>}
      </div>
    </div>
  );
}

function SupportFooter({
  general,
  companyLabel,
  onDark,
}: {
  general: { footerText: string; supportUrl: string; supportEmail: string };
  companyLabel: string;
  onDark?: boolean;
}) {
  const hasLinks = sanitizeLinkHref(general.supportUrl) || general.supportEmail;
  const hasContent = general.footerText || hasLinks;

  if (!hasContent) {
    return (
      <p className={`text-xs ${onDark ? 'text-white/45' : 'text-[var(--muted)]'}`}>
        © {new Date().getFullYear()} {companyLabel}
      </p>
    );
  }

  return (
    <div className={`space-y-2 text-xs ${onDark ? 'text-white/60' : 'text-[var(--muted)]'}`}>
      {general.footerText && <p className="max-w-sm leading-relaxed">{general.footerText}</p>}
      {hasLinks && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {sanitizeLinkHref(general.supportUrl) && (
            <a
              href={sanitizeLinkHref(general.supportUrl)!}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 transition ${onDark ? 'hover:text-white' : 'hover:accent-text'}`}
            >
              <Headphones className="h-3.5 w-3.5" />
              Support
            </a>
          )}
          {general.supportEmail && (
            <a
              href={`mailto:${general.supportEmail}`}
              className={`inline-flex items-center gap-1 transition ${onDark ? 'hover:text-white' : 'hover:accent-text'}`}
            >
              <Mail className="h-3.5 w-3.5" />
              {general.supportEmail}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
