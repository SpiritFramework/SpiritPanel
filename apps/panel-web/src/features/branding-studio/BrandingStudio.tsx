import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Sparkles,
  Type,
} from 'lucide-react';
import type { BrandingForm } from '../../components/admin/settings/settings-types';
import type { PanelGeneralSettings } from '../../lib/panel-settings';
import { THEME_PALETTES, ACCENT_PALETTE_PRESETS } from '../../lib/branding-theme-palettes';
import type { ThemePreset } from '../../lib/branding-appearance';
import { DEFAULT_THEME_MODE_OPTIONS, THEME_PRESET_OPTIONS } from '../../lib/branding-appearance';
import { applyBrandingToElement } from '../../lib/apply-branding';
import { BrandingColorPanel } from '../../components/BrandingColorPanel';
import { BrandingAppIconField, BrandingAssetField } from '../../components/BrandingFields';
import type { BrandingAssetKind } from '../../lib/api';
import { Input, Textarea } from '../../components/Layout';
import { PanelName } from '../../components/PanelName';
import { StudioPreview } from './StudioPreview';
import { LayoutStudioPanel, type LayoutSubSection } from './LayoutStudioPanel';

export type StudioSection = 'look' | 'colors' | 'identity' | 'layout' | 'assets';

const SECTIONS: { id: StudioSection; label: string; hint: string; icon: typeof Palette }[] = [
  { id: 'look', label: 'Look', hint: 'Theme surfaces', icon: Sparkles },
  { id: 'colors', label: 'Colors', hint: 'Accent palette', icon: Palette },
  { id: 'identity', label: 'Identity', hint: 'Name & support', icon: Type },
  { id: 'layout', label: 'Layout', hint: 'Chrome & polish', icon: LayoutTemplate },
  { id: 'assets', label: 'Assets', hint: 'Logo & favicon', icon: ImageIcon },
];

export function BrandingStudio({
  branding,
  general,
  onBrandingChange,
  onGeneralChange,
  onUploadAsset,
  onApplyAssetUrl,
  onRemoveAsset,
  onGenerateAppIcon,
  onUploadAppIcon,
}: {
  branding: BrandingForm;
  general: PanelGeneralSettings;
  onBrandingChange: (next: BrandingForm) => void;
  onGeneralChange: (next: PanelGeneralSettings) => void;
  onUploadAsset: (kind: BrandingAssetKind, file: File) => Promise<void>;
  onApplyAssetUrl: (kind: BrandingAssetKind, url: string) => Promise<void>;
  onRemoveAsset: (kind: BrandingAssetKind) => Promise<void>;
  onGenerateAppIcon: (source: 'logo' | 'favicon') => Promise<void>;
  onUploadAppIcon: (file: File) => Promise<void>;
}) {
  const [section, setSection] = useState<StudioSection>('look');
  const [layoutSub, setLayoutSub] = useState<LayoutSubSection>('cards');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('dark');
  const [previewSurface, setPreviewSurface] = useState<'login' | 'client' | 'admin' | 'server'>('login');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    applyBrandingToElement(el, branding, previewMode);
  }, [branding, previewMode]);

  function applyTheme(preset: ThemePreset, withAccents: boolean) {
    if (preset === 'default') {
      onBrandingChange({ ...branding, themePreset: 'default' });
      return;
    }
    const palette = THEME_PALETTES[preset];
    if (!palette) {
      onBrandingChange({ ...branding, themePreset: preset });
      return;
    }
    if (withAccents) {
      const match = ACCENT_PALETTE_PRESETS.find(
        (p) => p.primary.toLowerCase() === palette.accent.toLowerCase(),
      );
      onBrandingChange({
        ...branding,
        themePreset: preset,
        accentColor: palette.accent,
        secondaryColor: match?.secondary ?? palette.accent,
      });
    } else {
      onBrandingChange({ ...branding, themePreset: preset });
    }
  }

  return (
    <div className="ds-bstudio">
      <header className="ds-bstudio-hero">
        <div>
          <p className="ds-bstudio-kicker">Branding studio</p>
          <h2 className="ds-bstudio-title">Design how your panel looks</h2>
          <p className="ds-bstudio-sub">
            Pick a look, tune colors, and preview Login, Client, Admin, and Server before you save.
          </p>
        </div>
        <div className="ds-bstudio-hero-swatch" aria-hidden>
          <span style={{ background: branding.accentColor }} />
          <span style={{ background: branding.secondaryColor || branding.accentColor }} />
        </div>
      </header>

      <nav className="ds-bstudio-nav" aria-label="Branding sections">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`ds-bstudio-nav-btn${section === item.id ? ' is-active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="ds-bstudio-grid">
        <div className="ds-bstudio-editor">
          {section === 'look' ? (
            <section className="ds-bstudio-panel">
              <div className="ds-bstudio-panel-head">
                <h3>Theme look</h3>
                <p>Surface presets for the whole panel. Accents are optional.</p>
              </div>
              <div className="ds-bstudio-theme-grid">
                {THEME_PRESET_OPTIONS.map((opt) => {
                  const active = branding.themePreset === opt.id;
                  return (
                    <div key={opt.id} className={`ds-bstudio-theme-card${active ? ' is-active' : ''}`}>
                      <button
                        type="button"
                        className="ds-bstudio-theme-swatch"
                        onClick={() => applyTheme(opt.id, false)}
                        title="Apply surfaces only"
                      >
                        <span style={{ background: opt.swatch[2] }} />
                        <span style={{ background: opt.swatch[0] }} />
                        <span style={{ background: opt.swatch[1] }} />
                      </button>
                      <div className="ds-bstudio-theme-meta">
                        <strong>{opt.label}</strong>
                        <span>{opt.description}</span>
                      </div>
                      <div className="ds-bstudio-theme-actions">
                        <button type="button" onClick={() => applyTheme(opt.id, false)}>
                          Surfaces
                        </button>
                        {opt.id !== 'default' ? (
                          <button type="button" onClick={() => applyTheme(opt.id, true)}>
                            + Accents
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="ds-bstudio-mode-block">
                <p className="ds-bstudio-mode-label">Default light / dark mode</p>
                <p className="ds-bstudio-mode-hint">For new visitors who have not picked a theme yet.</p>
                <div className="ds-bstudio-mode-grid">
                  {DEFAULT_THEME_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`ds-bstudio-mode-card${branding.defaultThemeMode === opt.id ? ' is-active' : ''}`}
                      onClick={() => onBrandingChange({ ...branding, defaultThemeMode: opt.id })}
                    >
                      <strong>{opt.label}</strong>
                      <span>{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {section === 'colors' ? (
            <section className="ds-bstudio-panel">
              <div className="ds-bstudio-panel-head">
                <h3>Colors</h3>
                <p>Accent and secondary colors used across buttons, links, and glows.</p>
              </div>
              <BrandingColorPanel
                accentColor={branding.accentColor}
                secondaryColor={branding.secondaryColor}
                onAccentChange={(accentColor) => onBrandingChange({ ...branding, accentColor })}
                onSecondaryChange={(secondaryColor) => onBrandingChange({ ...branding, secondaryColor })}
                onApplyPair={(accentColor, secondaryColor) =>
                  onBrandingChange({ ...branding, accentColor, secondaryColor })
                }
              />
            </section>
          ) : null}

          {section === 'identity' ? (
            <section className="ds-bstudio-panel">
              <div className="ds-bstudio-panel-head">
                <h3>Identity</h3>
                <p>Names and messaging shown on login, sidebars, and emails.</p>
              </div>
              <div className="ds-bstudio-stack">
                <Input
                  label="Panel name"
                  value={branding.panelName}
                  onChange={(e) => onBrandingChange({ ...branding, panelName: e.target.value })}
                />
                <div className="ds-bstudio-inline-preview">
                  <p>Sidebar mark</p>
                  <PanelName name={branding.panelName || 'Panel name'} variant="sidebar" />
                </div>
                <Input
                  label="Sidebar tagline"
                  value={branding.tagline}
                  onChange={(e) => onBrandingChange({ ...branding, tagline: e.target.value })}
                  placeholder="Game server panel"
                />
                <Input
                  label="Login message"
                  value={branding.loginMessage}
                  onChange={(e) => onBrandingChange({ ...branding, loginMessage: e.target.value })}
                />
                <div className="ds-bstudio-divider">
                  <Building2 className="h-3.5 w-3.5" />
                  Company & support
                </div>
                <Input
                  label="Company name"
                  value={general.companyName}
                  onChange={(e) => onGeneralChange({ ...general, companyName: e.target.value })}
                  placeholder="Your hosting brand"
                />
                <Input
                  label="Support email"
                  type="email"
                  value={general.supportEmail}
                  onChange={(e) => onGeneralChange({ ...general, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                />
                <Input
                  label="Support URL"
                  value={general.supportUrl}
                  onChange={(e) => onGeneralChange({ ...general, supportUrl: e.target.value })}
                  placeholder="https://help.example.com"
                />
                <Textarea
                  label="Login footer text"
                  value={general.footerText}
                  onChange={(e) => onGeneralChange({ ...general, footerText: e.target.value })}
                  rows={2}
                  placeholder="Optional text shown below the login form"
                />
              </div>
            </section>
          ) : null}

          {section === 'layout' ? (
            <section className="ds-bstudio-panel ds-bstudio-panel--layout">
              <LayoutStudioPanel
                branding={branding}
                onBrandingChange={onBrandingChange}
                subSection={layoutSub}
                onSubSectionChange={setLayoutSub}
                onPreviewSurface={setPreviewSurface}
              />
            </section>
          ) : null}

          {section === 'assets' ? (
            <section className="ds-bstudio-panel">
              <div className="ds-bstudio-panel-head">
                <h3>Assets</h3>
                <p>Logo, favicon, and app icon save immediately when changed or cleared.</p>
              </div>
              <div className="ds-bstudio-assets">
                <BrandingAssetField
                  label="Logo"
                  hint="PNG, JPG, or WebP · max 512 KB · saved immediately"
                  kind="logo"
                  url={branding.logoUrl}
                  onUpload={(file) => onUploadAsset('logo', file)}
                  onApplyUrl={(url) => onApplyAssetUrl('logo', url)}
                  onRemove={() => onRemoveAsset('logo')}
                />
                <BrandingAssetField
                  label="Favicon"
                  hint="PNG, ICO, or WebP · max 256 KB · saved immediately"
                  kind="favicon"
                  url={branding.faviconUrl}
                  onUpload={(file) => onUploadAsset('favicon', file)}
                  onApplyUrl={(url) => onApplyAssetUrl('favicon', url)}
                  onRemove={() => onRemoveAsset('favicon')}
                />
                <BrandingAppIconField
                  url={branding.appIconUrl}
                  logoUrl={branding.logoUrl}
                  faviconUrl={branding.faviconUrl}
                  onGenerate={onGenerateAppIcon}
                  onUpload={onUploadAppIcon}
                  onRemove={() => onRemoveAsset('appicon')}
                />
              </div>
              <p className="ds-bstudio-asset-note">
                <ImageIcon className="h-3.5 w-3.5" />
                Identity, colors, and layout still use the page Save button.
              </p>
            </section>
          ) : null}
        </div>

        <StudioPreview
          ref={previewRef}
          branding={branding}
          general={general}
          mode={previewMode}
          surface={previewSurface}
          onModeChange={setPreviewMode}
          onSurfaceChange={setPreviewSurface}
        />
      </div>
    </div>
  );
}
