import type { CSSProperties } from 'react';
import { PanelName, panelNameGradientStyle, panelNameInitial } from './PanelName';
import { normalizeAppearance, type BrandingAppearance } from '../lib/branding-appearance';
import { surfacePresetStyle } from '../lib/branding-theme-palettes';
import { useTheme } from '../context/ThemeContext';
import { sanitizeImageSrc } from '../lib/safe-url';

interface BrandingPreviewProps {
  panelName: string;
  tagline: string;
  loginMessage: string;
  logoUrl: string;
  accentColor: string;
  secondaryColor: string;
  appearance: Partial<BrandingAppearance>;
}

export function BrandingPreview({
  panelName,
  tagline,
  loginMessage,
  logoUrl,
  accentColor,
  secondaryColor,
  appearance,
}: BrandingPreviewProps) {
  const { themePreset, loginBackground, panelBackground } = normalizeAppearance(appearance);
  const { resolved } = useTheme();
  const presetStyle = surfacePresetStyle(themePreset, resolved);
  const gradient = `linear-gradient(135deg, ${accentColor}, ${secondaryColor || accentColor})`;

  const safeLogo = sanitizeImageSrc(logoUrl);

  return (
    <div className="space-y-3">
      <div
        className="branding-preview-scope overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]"
        style={presetStyle as CSSProperties}
      >
        <p className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          Login preview
        </p>
        <div className="grid min-h-[9rem] grid-cols-[1fr_1.1fr]">
          <div
            className="login-brand-panel login-preview-panel relative overflow-hidden p-3"
            data-login-bg={loginBackground}
          >
            <div className="login-bg-canvas pointer-events-none absolute inset-0" aria-hidden />
            <div className="login-bg-overlay pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative flex items-center gap-2">
              {safeLogo ? (
                <img src={safeLogo} alt="" className="h-7 w-7 rounded-md object-contain ring-1 ring-white/15" />
              ) : (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={panelNameGradientStyle()}
                >
                  {panelNameInitial(panelName)}
                </span>
              )}
              <div className="min-w-0">
                <PanelName name={panelName || 'Panel name'} variant="preview" className="block truncate text-[11px]" />
                <p className="truncate text-[9px] text-white/65">{tagline}</p>
              </div>
            </div>
            <p className="relative mt-3 line-clamp-2 text-[9px] leading-relaxed text-white/70">{loginMessage}</p>
          </div>
          <div
            className={`panel-preview panel-preview--${panelBackground} relative border-l border-[var(--border)] p-3`}
            style={
              {
                '--preview-accent-glow': accentColor,
                '--preview-secondary-glow': secondaryColor || accentColor,
              } as CSSProperties
            }
          >
            <div className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
              <PanelName name={panelName || 'Panel name'} variant="sidebar" className="block text-[10px]" />
              <p className="mt-1 text-[9px] text-[var(--muted)]">Sign in to continue</p>
              <span
                className="mt-2 inline-block rounded-md px-2 py-1 text-[9px] font-medium text-white"
                style={{ background: accentColor }}
              >
                Sign in
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className="rounded-md px-2.5 py-1 text-[10px] font-medium text-white"
          style={{ background: accentColor }}
        >
          Primary
        </span>
        <span
          className="rounded-md px-2.5 py-1 text-[10px] font-medium text-white"
          style={{ background: secondaryColor || accentColor }}
        >
          Secondary
        </span>
        <span className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] text-[var(--muted)]">
          Theme: {themePreset}
        </span>
      </div>
    </div>
  );
}
