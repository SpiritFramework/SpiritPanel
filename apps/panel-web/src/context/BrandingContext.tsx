import { applyBrandingToElement } from '../lib/apply-branding';
import {
  applyAppearanceDataset,
  BRANDING_DEFAULT_THEME_EVENT,
  BRANDING_THEME_RESOLVED_EVENT,
  normalizeAppearance,
} from '../lib/branding-appearance';
import { applySurfacePreset } from '../lib/branding-theme-palettes';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { isServiceUnavailable } from '../lib/api-errors';
import { DEFAULT_PANEL_BRANDING, type PanelBranding } from '../lib/panel-settings';
import { PANEL_AUTHOR } from '../lib/product-meta';
import { sanitizeImageSrc } from '../lib/safe-url';

interface BrandingContextValue {
  branding: PanelBranding;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * API endpoints that resolve to the branded asset, falling back to the bundled
 * icons. Used as the default so an unbranded deploy is not swapped onto a
 * different URL than the one `index.html` already loaded.
 */
const DEFAULT_FAVICON = '/api/auth/branding/favicon';
const DEFAULT_APPLE_TOUCH_ICON = '/api/auth/branding/app-icon';

function setLinkIcon(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

function setFavicon(url: string) {
  setLinkIcon('icon', sanitizeImageSrc(url) ?? DEFAULT_FAVICON);
}

/**
 * iOS ignores the web manifest when adding to the home screen and reads this
 * link instead, so the app icon has to be mirrored here to be branded there.
 */
function setAppleTouchIcon(appIconUrl: string) {
  setLinkIcon('apple-touch-icon', sanitizeImageSrc(appIconUrl) ?? DEFAULT_APPLE_TOUCH_ICON);
}

/**
 * Keeps the browser/OS chrome colour matching the active theme preset. The
 * static value in index.html only covers first paint.
 */
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (!bg) return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bg;
}

function applyBranding(config: PanelBranding) {
  const root = document.documentElement;
  applyBrandingToElement(root, config, root.dataset.theme === 'light' ? 'light' : 'dark');

  const appearance = normalizeAppearance(config);
  const titleParts = [config.panelName];
  titleParts.push(config.general.companyName || PANEL_AUTHOR);
  document.title = titleParts.join(' · ');
  setFavicon(config.faviconUrl);
  setAppleTouchIcon(config.appIconUrl);
  syncThemeColor();

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

  const refreshBranding = useCallback(async () => {
    try {
      const data = mergeBranding((await api.branding()) as Partial<PanelBranding>);
      setBranding(data);
      applyBranding(data);
    } catch (err) {
      applyBranding(DEFAULT_PANEL_BRANDING);
      if (!isServiceUnavailable(err)) {
        /* non-fatal: keep defaults */
      }
    }
  }, []);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  useEffect(() => {
    const handler = () => {
      const mode = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      applySurfacePreset(normalizeAppearance(branding).themePreset, mode);
      syncThemeColor();
    };
    window.addEventListener(BRANDING_THEME_RESOLVED_EVENT, handler);
    return () => window.removeEventListener(BRANDING_THEME_RESOLVED_EVENT, handler);
  }, [branding]);

  const value = useMemo(
    () => ({ branding, refreshBranding }),
    [branding, refreshBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
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

// Re-export for callers that previously imported dataset helpers via context path accidentally.
export { applyAppearanceDataset };
