import { useMemo, type ReactNode } from 'react';
import { Headphones, Mail, Server, Shield, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelBranding } from '../lib/panel-settings';
import { DEFAULT_FOOTER_TEXT, PANEL_AUTHOR } from '../lib/product-meta';
import { sanitizeImageSrc, sanitizeLinkHref } from '../lib/safe-url';
import { usePanelBackgroundClass } from '../hooks/usePanelBackgroundClass';
import { PanelName, panelNameGradientStyle, panelNameInitial } from './PanelName';

const FEATURES = [
  { icon: Server, label: 'Deploy & manage game servers' },
  { icon: Terminal, label: 'Live console and file access' },
  { icon: Shield, label: 'Secure panel for your community' },
];

export function AuthLayout({
  branding,
  children,
}: {
  branding: PanelBranding;
  children: ReactNode;
}) {
  const companyLabel = branding.general.companyName || PANEL_AUTHOR;

  const brandGradient = useMemo(
    () =>
      `linear-gradient(135deg, ${branding.accentColor} 0%, ${branding.secondaryColor || branding.accentColor} 100%)`,
    [branding.accentColor, branding.secondaryColor],
  );
  const panelBgClass = usePanelBackgroundClass();

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside
        className="login-brand-panel relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden p-10 lg:p-12 xl:w-[40%] md:flex"
        data-login-bg={branding.loginBackground || 'gradient'}
      >
        <div className="login-bg-canvas pointer-events-none absolute inset-0" aria-hidden />
        <div className="login-bg-overlay pointer-events-none absolute inset-0" aria-hidden />
        <div className="login-dot-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

        <div className="relative">
          <BrandBlock
            logoUrl={branding.logoUrl}
            panelName={branding.panelName}
            tagline={branding.tagline}
            large
            gradient={brandGradient}
          />
        </div>

        <div className="relative space-y-6">
          <p className="max-w-sm text-sm leading-relaxed text-white/75">{branding.loginMessage}</p>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <SupportFooter general={branding.general} companyLabel={companyLabel} onDark />
      </aside>

      <main className={`${panelBgClass} flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6`}>
        <div className="w-full max-w-[440px]">
          <div className="mb-6 md:hidden">
            <BrandBlock
              logoUrl={branding.logoUrl}
              panelName={branding.panelName}
              tagline={branding.tagline}
              gradient={brandGradient}
            />
          </div>

          {children}

          <div className="mt-6 md:hidden">
            <SupportFooter general={branding.general} companyLabel={companyLabel} />
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="login-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="login-card-accent" />
      <div className="p-6 sm:p-7">{children}</div>
    </div>
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
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <div className="auth-field-input-wrap">
        <Icon className="auth-field-icon h-4 w-4" />
        <input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="auth-field-input"
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
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-sm ${
        warning
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }`}
    >
      {message}
    </div>
  );
}

function BrandBlock({
  logoUrl,
  panelName,
  tagline,
  large,
  gradient,
}: {
  logoUrl: string;
  panelName: string;
  tagline: string;
  large?: boolean;
  gradient: string;
}) {
  const safeLogo = sanitizeImageSrc(logoUrl);
  return (
    <div className={`flex items-center gap-3.5 ${large ? 'flex-col items-start gap-4 sm:flex-row sm:items-center' : ''}`}>
      {safeLogo ? (
        <img
          src={safeLogo}
          alt=""
          className={`shrink-0 rounded-2xl object-contain ring-1 ring-white/15 ${large ? 'h-16 w-16 bg-black/20 p-1.5' : 'h-12 w-12 bg-[var(--surface)] p-1'}`}
        />
      ) : (
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl text-white ring-1 ring-white/15 ${large ? 'h-16 w-16 text-xl font-bold' : 'h-12 w-12 text-base font-bold'}`}
          style={panelNameGradientStyle()}
        >
          {panelNameInitial(panelName)}
        </div>
      )}
      <div className={large ? 'min-w-0' : 'min-w-0 text-left'}>
        <PanelName
          name={panelName}
          variant={large ? 'hero' : 'compact'}
          as={large ? 'h1' : 'span'}
          className={large ? 'block' : 'block truncate'}
        />
        <p className={`mt-1.5 truncate ${large ? 'text-sm text-white/70' : 'text-xs text-[var(--muted)]'}`}>
          {tagline}
        </p>
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
      <div className={`space-y-1 text-xs ${onDark ? 'text-white/45' : 'text-[var(--muted)]'}`}>
        <p>© {new Date().getFullYear()} {companyLabel}</p>
        <p className="text-[10px] opacity-80">{DEFAULT_FOOTER_TEXT}</p>
      </div>
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
