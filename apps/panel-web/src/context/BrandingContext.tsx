import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_PANEL_BRANDING, type PanelBranding } from '../lib/panel-settings';
import { PANEL_AUTHOR } from '../lib/product-meta';
import { BRANDING_DEFAULT_THEME_EVENT, BRANDING_THEME_RESOLVED_EVENT, normalizeAppearance } from '../lib/branding-appearance';
import { applySurfacePreset } from '../lib/branding-theme-palettes';

interface BrandingContextValue {
  branding: PanelBranding;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

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

function setFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url || '/favicon.ico';
}

function applyBranding(config: PanelBranding) {
  const root = document.documentElement;
  const accent = config.accentColor;
  const secondary = config.secondaryColor || accent;

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', lightenHex(accent, 0.15));
  root.style.setProperty('--accent-muted', hexToRgba(accent, 0.15));
  root.style.setProperty('--accent-glow', hexToRgba(accent, 0.35));
  root.style.setProperty('--accent-secondary', secondary);
  root.style.setProperty('--accent-secondary-glow', hexToRgba(secondary, 0.25));

  const appearance = normalizeAppearance(config);
  root.dataset.themePreset = appearance.themePreset;
  root.dataset.loginBg = appearance.loginBackground;
  root.dataset.panelBg = appearance.panelBackground;

  const resolvedTheme = root.dataset.theme === 'light' ? 'light' : 'dark';
  applySurfacePreset(appearance.themePreset, resolvedTheme);

  const titleParts = [config.panelName];
  titleParts.push(config.general.companyName || PANEL_AUTHOR);
  document.title = titleParts.join(' · ');

  setFavicon(config.faviconUrl);

  if (typeof window !== 'undefined' && !window.localStorage.getItem('spirit-theme')) {
    window.dispatchEvent(
      new CustomEvent(BRANDING_DEFAULT_THEME_EVENT, {
        detail: appearance.defaultThemeMode,
      }),
    );
  }
}

function mergeBranding(data: Partial<PanelBranding>): PanelBranding {
  return {
    ...DEFAULT_PANEL_BRANDING,
    ...data,
    ...normalizeAppearance(data),
    general: { ...DEFAULT_PANEL_BRANDING.general, ...data.general },
    maintenance: { ...DEFAULT_PANEL_BRANDING.maintenance, ...data.maintenance },
    announcement: { ...DEFAULT_PANEL_BRANDING.announcement, ...data.announcement },
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<PanelBranding>(DEFAULT_PANEL_BRANDING);

  async function refreshBranding() {
    try {
      const res = await fetch('/api/auth/branding');
      if (!res.ok) return;
      const data = mergeBranding((await res.json()) as Partial<PanelBranding>);
      setBranding(data);
      applyBranding(data);
    } catch {
      applyBranding(DEFAULT_PANEL_BRANDING);
    }
  }

  useEffect(() => {
    refreshBranding();
  }, []);

  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  useEffect(() => {
    const handler = () => {
      const mode = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      applySurfacePreset(normalizeAppearance(branding).themePreset, mode);
    };
    window.addEventListener(BRANDING_THEME_RESOLVED_EVENT, handler);
    return () => window.removeEventListener(BRANDING_THEME_RESOLVED_EVENT, handler);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}

export type { PanelBranding };
