import type { ReactNode } from 'react';
import type {
  DefaultThemeMode,
  LoginBackground,
  PanelBackground,
  ThemePreset,
} from '../lib/branding-appearance';
import {
  DEFAULT_THEME_MODE_OPTIONS,
  LOGIN_BACKGROUND_OPTIONS,
  PANEL_BACKGROUND_OPTIONS,
  THEME_PRESET_OPTIONS,
} from '../lib/branding-appearance';

function OptionCard({
  active,
  onClick,
  label,
  description,
  preview,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
  preview: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
        active
          ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] ring-2 ring-[var(--accent-muted)]'
          : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
      }`}
    >
      <div className="relative h-20 overflow-hidden bg-[var(--bg-elevated)]">{preview}</div>
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
        <p className="text-xs font-semibold text-[var(--text)]">{label}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)]">{description}</p>
      </div>
    </button>
  );
}

export function BrandingAppearanceFields({
  themePreset,
  defaultThemeMode,
  loginBackground,
  panelBackground,
  accentColor,
  secondaryColor,
  onThemePresetChange,
  onDefaultThemeModeChange,
  onLoginBackgroundChange,
  onPanelBackgroundChange,
}: {
  themePreset: ThemePreset;
  defaultThemeMode: DefaultThemeMode;
  loginBackground: LoginBackground;
  panelBackground: PanelBackground;
  accentColor: string;
  secondaryColor: string;
  onThemePresetChange: (value: ThemePreset) => void;
  onDefaultThemeModeChange: (value: DefaultThemeMode) => void;
  onLoginBackgroundChange: (value: LoginBackground) => void;
  onPanelBackgroundChange: (value: PanelBackground) => void;
}) {
  const gradient = `linear-gradient(135deg, ${accentColor}, ${secondaryColor || accentColor})`;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text)]">Color theme</p>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Surface palette applied across the panel. Accent colors above still control buttons and highlights.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {THEME_PRESET_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={themePreset === opt.id}
              onClick={() => onThemePresetChange(opt.id)}
              label={opt.label}
              description={opt.description}
              preview={
                <div className="flex h-full flex-col">
                  <div
                    className="h-12 w-full"
                    style={{
                      background:
                        opt.id === 'default'
                          ? `linear-gradient(135deg, ${opt.swatch[1]}, ${opt.swatch[0]})`
                          : `linear-gradient(160deg, ${opt.swatch[2]} 0%, ${opt.swatch[0]} 55%, ${opt.swatch[1]}33 100%)`,
                    }}
                  />
                  <div className="flex flex-1 items-end gap-1 p-2">
                    {opt.swatch.map((color) => (
                      <span key={color} className="h-4 flex-1 rounded-sm ring-1 ring-black/10" style={{ background: color }} />
                    ))}
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text)]">Default light / dark mode</p>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Used for new visitors who have not picked a theme. Users can still override with the toggle in the sidebar.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DEFAULT_THEME_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onDefaultThemeModeChange(opt.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                defaultThemeMode === opt.id
                  ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
              }`}
            >
              <p className="text-xs font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text)]">Login page background</p>
        <p className="mb-3 text-xs text-[var(--muted)]">Animated backdrop on the branded login sidebar.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LOGIN_BACKGROUND_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={loginBackground === opt.id}
              onClick={() => onLoginBackgroundChange(opt.id)}
              label={opt.label}
              description={opt.description}
              preview={
                <div
                  className={`login-preview login-preview--${opt.id} h-full w-full`}
                  style={{ '--preview-gradient': gradient } as React.CSSProperties}
                />
              }
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text)]">Panel background</p>
        <p className="mb-3 text-xs text-[var(--muted)]">Ambient background behind dashboard and server pages.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PANEL_BACKGROUND_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              active={panelBackground === opt.id}
              onClick={() => onPanelBackgroundChange(opt.id)}
              label={opt.label}
              description={opt.description}
              preview={
                <div
                  className={`panel-preview panel-preview--${opt.id} h-full w-full`}
                  style={
                    {
                      '--preview-accent-glow': accentColor,
                      '--preview-secondary-glow': secondaryColor || accentColor,
                    } as React.CSSProperties
                  }
                />
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
