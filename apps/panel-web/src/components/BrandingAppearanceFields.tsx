import type { ReactNode } from 'react';
import type {
  AdminSidebarStyle,
  AdminTabsStyle,
  ClientSidebarStyle,
  ContentDensity,
  DefaultThemeMode,
  LoginAmbientLevel,
  LoginBackground,
  MotionPreference,
  PanelBackground,
  ServerCardLayoutStyle,
  ServerListDefaultView,
  ServerSidebarStyle,
  SidebarMaterial,
  SurfaceRadius,
  ThemePreset,
} from '../lib/branding-appearance';
import {
  ADMIN_SIDEBAR_STYLE_OPTIONS,
  ADMIN_TABS_STYLE_OPTIONS,
  CLIENT_SIDEBAR_STYLE_OPTIONS,
  CONTENT_DENSITY_OPTIONS,
  DEFAULT_THEME_MODE_OPTIONS,
  LOGIN_AMBIENT_LEVEL_OPTIONS,
  LOGIN_BACKGROUND_OPTIONS,
  MOTION_PREFERENCE_OPTIONS,
  PANEL_BACKGROUND_OPTIONS,
  SERVER_CARD_STYLE_OPTIONS,
  SERVER_LIST_VIEW_OPTIONS,
  SERVER_SIDEBAR_STYLE_OPTIONS,
  SIDEBAR_MATERIAL_OPTIONS,
  SURFACE_RADIUS_OPTIONS,
  THEME_PRESET_OPTIONS,
} from '../lib/branding-appearance';
import { Checkbox } from './Checkbox';

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

function StylePick<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { id: T; label: string; description: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[var(--text)]">{label}</p>
      {description && <p className="mb-2 text-[10px] text-[var(--muted)]">{description}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${
              value === opt.id
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
  );
}

function AppearanceSection({
  title,
  appliesTo,
  description,
  children,
}: {
  title: string;
  appliesTo: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">{description}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]">
            {appliesTo}
          </span>
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ServerCardMock({
  style,
  accent,
}: {
  style: ServerCardLayoutStyle;
  accent: string;
}) {
  const vars = { '--preview-accent': accent } as React.CSSProperties;
  return (
    <div
      className={`branding-mock-card branding-mock-card--${style}`}
      style={vars}
      aria-hidden
    >
      <div className="branding-mock-card__head">
        <span className="branding-mock-card__icon" />
        <span className="branding-mock-card__lines">
          <span className="branding-mock-card__line branding-mock-card__line--sm" />
          <span className="branding-mock-card__line" />
        </span>
      </div>
      <div className="branding-mock-card__body">
        <span className="branding-mock-card__line branding-mock-card__line--wide" />
        <span className="branding-mock-card__line branding-mock-card__line--md" />
      </div>
    </div>
  );
}

function SidebarAreaPicker<T extends string>({
  areaLabel,
  areaHint,
  value,
  options,
  onChange,
  mockPrefix,
}: {
  areaLabel: string;
  areaHint: string;
  value: T;
  options: { id: T; label: string; description: string }[];
  onChange: (value: T) => void;
  mockPrefix: 'admin' | 'client' | 'server';
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold text-[var(--text)]">{areaLabel}</p>
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{areaHint}</p>
      </div>
      <div
        className={`branding-sidebar-frame branding-sidebar-frame--${mockPrefix} branding-sidebar-frame--${mockPrefix}-${value} mb-3`}
        aria-hidden
      >
        <div className="branding-sidebar-frame__nav">
          <span className="branding-sidebar-frame__item branding-sidebar-frame__item--active" />
          <span className="branding-sidebar-frame__item" />
          <span className="branding-sidebar-frame__item" />
        </div>
        <div className="branding-sidebar-frame__main">
          <span className="branding-sidebar-frame__bar" />
          <span className="branding-sidebar-frame__block" />
        </div>
      </div>
      <div className="grid gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg border px-2.5 py-2 text-left transition ${
              value === opt.id
                ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]'
            }`}
          >
            <p className="text-[11px] font-semibold text-[var(--text)]">{opt.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)]">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PolishTile<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  preview,
}: {
  label: string;
  hint: string;
  value: T;
  options: { id: T; label: string; description: string }[];
  onChange: (value: T) => void;
  preview?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[var(--text)]">{label}</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</p>
        </div>
        {preview}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg border px-2.5 py-2 text-left transition ${
              value === opt.id
                ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]'
            }`}
          >
            <p className="text-[11px] font-semibold">{opt.label}</p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BrandingAppearanceFields({
  themePreset,
  defaultThemeMode,
  loginBackground,
  panelBackground,
  panelAmbient,
  serverCardStyle,
  adminSidebarStyle,
  clientSidebarStyle,
  serverSidebarStyle,
  surfaceRadius,
  sidebarMaterial,
  contentDensity,
  motionPreference,
  serverListDefaultView,
  adminTabsStyle,
  loginAmbientLevel,
  showHeroStripe,
  accentColor,
  secondaryColor,
  onThemePresetChange,
  onDefaultThemeModeChange,
  onLoginBackgroundChange,
  onPanelBackgroundChange,
  onPanelAmbientChange,
  onServerCardStyleChange,
  onAdminSidebarStyleChange,
  onClientSidebarStyleChange,
  onServerSidebarStyleChange,
  onSurfaceRadiusChange,
  onSidebarMaterialChange,
  onContentDensityChange,
  onMotionPreferenceChange,
  onServerListDefaultViewChange,
  onAdminTabsStyleChange,
  onLoginAmbientLevelChange,
  onShowHeroStripeChange,
}: {
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
  accentColor: string;
  secondaryColor: string;
  onThemePresetChange: (value: ThemePreset) => void;
  onDefaultThemeModeChange: (value: DefaultThemeMode) => void;
  onLoginBackgroundChange: (value: LoginBackground) => void;
  onPanelBackgroundChange: (value: PanelBackground) => void;
  onPanelAmbientChange: (value: boolean) => void;
  onServerCardStyleChange: (value: ServerCardLayoutStyle) => void;
  onAdminSidebarStyleChange: (value: AdminSidebarStyle) => void;
  onClientSidebarStyleChange: (value: ClientSidebarStyle) => void;
  onServerSidebarStyleChange: (value: ServerSidebarStyle) => void;
  onSurfaceRadiusChange: (value: SurfaceRadius) => void;
  onSidebarMaterialChange: (value: SidebarMaterial) => void;
  onContentDensityChange: (value: ContentDensity) => void;
  onMotionPreferenceChange: (value: MotionPreference) => void;
  onServerListDefaultViewChange: (value: ServerListDefaultView) => void;
  onAdminTabsStyleChange: (value: AdminTabsStyle) => void;
  onLoginAmbientLevelChange: (value: LoginAmbientLevel) => void;
  onShowHeroStripeChange: (value: boolean) => void;
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
        <div className="mb-4">
          <StylePick
            label="Login ambient layers"
            description="Extra orbs, grain, and shine on top of the background preset."
            value={loginAmbientLevel}
            options={LOGIN_AMBIENT_LEVEL_OPTIONS}
            onChange={onLoginAmbientLevelChange}
          />
        </div>
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
        <div className="mb-4">
          <Checkbox
            label="Extra ambient mesh layer"
            description="Drifting color mesh and grain over the main content area (in addition to the panel background preset)."
            checked={panelAmbient}
            onChange={onPanelAmbientChange}
          />
        </div>
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

      <AppearanceSection
        title="Server cards"
        appliesTo="My Servers · grid & list"
        description="Choose how server cards are laid out. All servers use your panel accent color — layouts only change structure, not per-game colors."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SERVER_CARD_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onServerCardStyleChange(opt.id)}
              className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                serverCardStyle === opt.id
                  ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] ring-2 ring-[var(--accent-muted)]'
                  : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
              }`}
            >
              <div className="flex h-[5.5rem] items-center justify-center bg-[var(--bg)] p-3">
                <ServerCardMock style={opt.id} accent={accentColor} />
              </div>
              <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--text)]">{opt.label}</p>
                  <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted)]">
                    {opt.hint}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-[var(--muted)]">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </AppearanceSection>

      <AppearanceSection
        title="Sidebar layout"
        appliesTo="Admin · Client · Server nav"
        description="Each area of the panel has its own sidebar. Pick a structure for where that navigation lives — these settings do not change your color theme."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <SidebarAreaPicker
            areaLabel="Admin panel"
            areaHint="Users, servers, nodes, settings…"
            value={adminSidebarStyle}
            options={ADMIN_SIDEBAR_STYLE_OPTIONS}
            onChange={onAdminSidebarStyleChange}
            mockPrefix="admin"
          />
          <SidebarAreaPicker
            areaLabel="Client area"
            areaHint="My Servers, account, billing…"
            value={clientSidebarStyle}
            options={CLIENT_SIDEBAR_STYLE_OPTIONS}
            onChange={onClientSidebarStyleChange}
            mockPrefix="client"
          />
          <SidebarAreaPicker
            areaLabel="Server shell"
            areaHint="Console, files, schedules…"
            value={serverSidebarStyle}
            options={SERVER_SIDEBAR_STYLE_OPTIONS}
            onChange={onServerSidebarStyleChange}
            mockPrefix="server"
          />
        </div>
      </AppearanceSection>

      <AppearanceSection
        title="Interface polish"
        appliesTo="Panel-wide"
        description="Fine-tune spacing, corners, motion, and small UI details. Grouped by what they affect."
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Shape & surfaces</p>
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <PolishTile
            label="Corner radius"
            hint="Cards, inputs, and modals"
            value={surfaceRadius}
            options={SURFACE_RADIUS_OPTIONS}
            onChange={onSurfaceRadiusChange}
            preview={
              <span
                className={`branding-polish-preview branding-polish-preview--radius-${surfaceRadius}`}
                aria-hidden
              />
            }
          />
          <PolishTile
            label="Sidebar material"
            hint="Blur and opacity behind nav"
            value={sidebarMaterial}
            options={SIDEBAR_MATERIAL_OPTIONS}
            onChange={onSidebarMaterialChange}
            preview={
              <span
                className={`branding-polish-preview branding-polish-preview--material-${sidebarMaterial}`}
                aria-hidden
              />
            }
          />
        </div>

        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Layout & lists</p>
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <PolishTile
            label="Content density"
            hint="Page padding and table row height"
            value={contentDensity}
            options={CONTENT_DENSITY_OPTIONS}
            onChange={onContentDensityChange}
          />
          <PolishTile
            label="My Servers default view"
            hint="First visit before user toggles grid/list"
            value={serverListDefaultView}
            options={SERVER_LIST_VIEW_OPTIONS}
            onChange={onServerListDefaultViewChange}
            preview={
              <span
                className={`branding-polish-preview branding-polish-preview--view-${serverListDefaultView}`}
                aria-hidden
              />
            }
          />
        </div>

        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Motion & admin details</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <PolishTile
            label="Motion"
            hint="Ambient backgrounds and login animation"
            value={motionPreference}
            options={MOTION_PREFERENCE_OPTIONS}
            onChange={onMotionPreferenceChange}
          />
          <PolishTile
            label="Admin detail tabs"
            hint="User, server, and node detail pages"
            value={adminTabsStyle}
            options={ADMIN_TABS_STYLE_OPTIONS}
            onChange={onAdminTabsStyleChange}
            preview={
              <span
                className={`branding-polish-preview branding-polish-preview--tabs-${adminTabsStyle}`}
                aria-hidden
              />
            }
          />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
          <Checkbox
            label="Accent hero stripe"
            description="Thin gradient bar on page heroes, login card, and My Servers header."
            checked={showHeroStripe}
            onChange={onShowHeroStripeChange}
          />
        </div>
      </AppearanceSection>
    </div>
  );
}
