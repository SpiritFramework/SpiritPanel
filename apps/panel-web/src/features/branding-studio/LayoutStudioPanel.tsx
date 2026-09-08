import type { CSSProperties, ReactNode } from 'react';
import type { BrandingForm } from '../../components/admin/settings/settings-types';
import type {
  AdminSidebarStyle,
  ClientSidebarStyle,
  ServerCardLayoutStyle,
  ServerSidebarStyle,
} from '../../lib/branding-appearance';
import {
  ADMIN_SIDEBAR_STYLE_OPTIONS,
  ADMIN_TABS_STYLE_OPTIONS,
  CLIENT_SIDEBAR_STYLE_OPTIONS,
  CONTENT_DENSITY_OPTIONS,
  LOGIN_AMBIENT_LEVEL_OPTIONS,
  LOGIN_BACKGROUND_OPTIONS,
  MOTION_PREFERENCE_OPTIONS,
  PANEL_BACKGROUND_OPTIONS,
  SERVER_CARD_STYLE_OPTIONS,
  SERVER_LIST_VIEW_OPTIONS,
  SERVER_SIDEBAR_STYLE_OPTIONS,
  SIDEBAR_MATERIAL_OPTIONS,
  SURFACE_RADIUS_OPTIONS,
} from '../../lib/branding-appearance';
import { Checkbox } from '../../components/Checkbox';
import type { PreviewSurface } from './StudioPreview';

export type LayoutSubSection = 'atmosphere' | 'navigation' | 'cards' | 'finish';

const SUBS: { id: LayoutSubSection; label: string; hint: string }[] = [
  { id: 'atmosphere', label: 'Atmosphere', hint: 'Login & panel backdrops' },
  { id: 'navigation', label: 'Navigation', hint: 'Sidebars by area' },
  { id: 'cards', label: 'Cards', hint: 'Server card layouts' },
  { id: 'finish', label: 'Finish', hint: 'Corners, density, motion' },
];

function VisualCard({
  active,
  onClick,
  label,
  description,
  preview,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
  preview: ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ds-blayout-card${active ? ' is-active' : ''}`}
    >
      <div className="ds-blayout-card__preview">{preview}</div>
      <div className="ds-blayout-card__meta">
        <div className="ds-blayout-card__title-row">
          <strong>{label}</strong>
          {badge ? <em>{badge}</em> : null}
        </div>
        <span>{description}</span>
      </div>
    </button>
  );
}

function ServerCardMock({ style, accent }: { style: ServerCardLayoutStyle; accent: string }) {
  const vars = { '--preview-accent': accent } as CSSProperties;
  return (
    <div className={`branding-mock-card branding-mock-card--${style}`} style={vars} aria-hidden>
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

function SidebarMock({
  prefix,
  style,
}: {
  prefix: 'admin' | 'client' | 'server';
  style: string;
}) {
  return (
    <div
      className={`branding-sidebar-frame branding-sidebar-frame--${prefix} branding-sidebar-frame--${prefix}-${style}`}
      aria-hidden
    >
      <div className="branding-sidebar-frame__nav">
        <span className="branding-sidebar-frame__item branding-sidebar-frame__item--active" />
        <span className="branding-sidebar-frame__item" />
        <span className="branding-sidebar-frame__item" />
        <span className="branding-sidebar-frame__item" />
      </div>
      <div className="branding-sidebar-frame__main">
        <span className="branding-sidebar-frame__bar" />
        <span className="branding-sidebar-frame__block" />
      </div>
    </div>
  );
}

function SegmentGrid<T extends string>({
  value,
  options,
  onChange,
  renderPreview,
}: {
  value: T;
  options: { id: T; label: string; description: string }[];
  onChange: (value: T) => void;
  renderPreview?: (id: T) => ReactNode;
}) {
  return (
    <div className="ds-blayout-segments">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`ds-blayout-segment${value === opt.id ? ' is-active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {renderPreview ? <div className="ds-blayout-segment__preview">{renderPreview(opt.id)}</div> : null}
          <strong>{opt.label}</strong>
          <span>{opt.description}</span>
        </button>
      ))}
    </div>
  );
}

export function LayoutStudioPanel({
  branding,
  onBrandingChange,
  subSection,
  onSubSectionChange,
  onPreviewSurface,
}: {
  branding: BrandingForm;
  onBrandingChange: (next: BrandingForm) => void;
  subSection: LayoutSubSection;
  onSubSectionChange: (next: LayoutSubSection) => void;
  onPreviewSurface?: (surface: PreviewSurface) => void;
}) {
  const gradient = `linear-gradient(135deg, ${branding.accentColor}, ${branding.secondaryColor || branding.accentColor})`;

  function pickSurface(surface: PreviewSurface) {
    onPreviewSurface?.(surface);
  }

  return (
    <div className="ds-blayout">
      <div className="ds-bstudio-panel-head">
        <h3>Layout & polish</h3>
        <p>Pick structures visually — the live preview updates as you choose.</p>
      </div>

      <div className="ds-blayout-subs" role="tablist" aria-label="Layout groups">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={subSection === s.id}
            className={`ds-blayout-sub${subSection === s.id ? ' is-active' : ''}`}
            onClick={() => onSubSectionChange(s.id)}
          >
            <strong>{s.label}</strong>
            <em>{s.hint}</em>
          </button>
        ))}
      </div>

      <div className="ds-blayout-body">
        {subSection === 'atmosphere' ? (
          <div className="ds-blayout-block">
            <div className="ds-blayout-block-head">
              <h4>Login backdrop</h4>
              <p>Animated treatment on the public sign-in page.</p>
            </div>
            <SegmentGrid
              value={branding.loginAmbientLevel}
              options={LOGIN_AMBIENT_LEVEL_OPTIONS}
              onChange={(loginAmbientLevel) => {
                pickSurface('login');
                onBrandingChange({ ...branding, loginAmbientLevel });
              }}
            />
            <div className="ds-blayout-grid ds-blayout-grid--bg">
              {LOGIN_BACKGROUND_OPTIONS.map((opt) => (
                <VisualCard
                  key={opt.id}
                  active={branding.loginBackground === opt.id}
                  onClick={() => {
                    pickSurface('login');
                    onBrandingChange({ ...branding, loginBackground: opt.id });
                  }}
                  label={opt.label}
                  description={opt.description}
                  preview={
                    <div
                      className={`login-preview login-preview--${opt.id} h-full w-full`}
                      style={{ '--preview-gradient': gradient } as CSSProperties}
                    />
                  }
                />
              ))}
            </div>

            <div className="ds-blayout-block-head ds-blayout-block-head--spaced">
              <h4>Panel backdrop</h4>
              <p>Ambient wash behind dashboards and server pages.</p>
            </div>
            <div className="ds-blayout-check">
              <Checkbox
                label="Extra ambient mesh"
                description="Drifting color mesh and grain over the main content area."
                checked={branding.panelAmbient}
                onChange={(panelAmbient) => {
                  pickSurface('client');
                  onBrandingChange({ ...branding, panelAmbient });
                }}
              />
            </div>
            <div className="ds-blayout-grid ds-blayout-grid--bg">
              {PANEL_BACKGROUND_OPTIONS.map((opt) => (
                <VisualCard
                  key={opt.id}
                  active={branding.panelBackground === opt.id}
                  onClick={() => {
                    pickSurface('client');
                    onBrandingChange({ ...branding, panelBackground: opt.id });
                  }}
                  label={opt.label}
                  description={opt.description}
                  preview={
                    <div
                      className={`panel-preview panel-preview--${opt.id} h-full w-full`}
                      style={
                        {
                          '--preview-accent-glow': branding.accentColor,
                          '--preview-secondary-glow': branding.secondaryColor || branding.accentColor,
                        } as CSSProperties
                      }
                    />
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {subSection === 'navigation' ? (
          <div className="ds-blayout-block">
            <div className="ds-blayout-nav-areas">
              <div className="ds-blayout-nav-area">
                <div className="ds-blayout-block-head">
                  <h4>Admin sidebar</h4>
                  <p>Users, servers, nodes, settings</p>
                </div>
                <div className="ds-blayout-grid ds-blayout-grid--nav">
                  {ADMIN_SIDEBAR_STYLE_OPTIONS.map((opt) => (
                    <VisualCard
                      key={opt.id}
                      active={branding.adminSidebarStyle === opt.id}
                      onClick={() => {
                        pickSurface('admin');
                        onBrandingChange({
                          ...branding,
                          adminSidebarStyle: opt.id as AdminSidebarStyle,
                        });
                      }}
                      label={opt.label}
                      description={opt.description}
                      preview={<SidebarMock prefix="admin" style={opt.id} />}
                    />
                  ))}
                </div>
              </div>

              <div className="ds-blayout-nav-area">
                <div className="ds-blayout-block-head">
                  <h4>Client sidebar</h4>
                  <p>My Servers, account, billing</p>
                </div>
                <div className="ds-blayout-grid ds-blayout-grid--nav">
                  {CLIENT_SIDEBAR_STYLE_OPTIONS.map((opt) => (
                    <VisualCard
                      key={opt.id}
                      active={branding.clientSidebarStyle === opt.id}
                      onClick={() => {
                        pickSurface('client');
                        onBrandingChange({
                          ...branding,
                          clientSidebarStyle: opt.id as ClientSidebarStyle,
                        });
                      }}
                      label={opt.label}
                      description={opt.description}
                      preview={<SidebarMock prefix="client" style={opt.id} />}
                    />
                  ))}
                </div>
              </div>

              <div className="ds-blayout-nav-area">
                <div className="ds-blayout-block-head">
                  <h4>Server sidebar</h4>
                  <p>Console, files, schedules</p>
                </div>
                <div className="ds-blayout-grid ds-blayout-grid--nav">
                  {SERVER_SIDEBAR_STYLE_OPTIONS.map((opt) => (
                    <VisualCard
                      key={opt.id}
                      active={branding.serverSidebarStyle === opt.id}
                      onClick={() => {
                        pickSurface('server');
                        onBrandingChange({
                          ...branding,
                          serverSidebarStyle: opt.id as ServerSidebarStyle,
                        });
                      }}
                      label={opt.label}
                      description={opt.description}
                      preview={<SidebarMock prefix="server" style={opt.id} />}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="ds-blayout-block-head ds-blayout-block-head--spaced">
              <h4>Sidebar material</h4>
              <p>How navigation surfaces treat blur and opacity.</p>
            </div>
            <SegmentGrid
              value={branding.sidebarMaterial}
              options={SIDEBAR_MATERIAL_OPTIONS}
              onChange={(sidebarMaterial) => {
                pickSurface('client');
                onBrandingChange({ ...branding, sidebarMaterial });
              }}
              renderPreview={(id) => (
                <span className={`branding-polish-preview branding-polish-preview--material-${id}`} />
              )}
            />

            <div className="ds-blayout-block-head ds-blayout-block-head--spaced">
              <h4>Admin detail tabs</h4>
              <p>User, server, and node detail pages.</p>
            </div>
            <SegmentGrid
              value={branding.adminTabsStyle}
              options={ADMIN_TABS_STYLE_OPTIONS}
              onChange={(adminTabsStyle) => {
                pickSurface('admin');
                onBrandingChange({ ...branding, adminTabsStyle });
              }}
              renderPreview={(id) => (
                <span className={`branding-polish-preview branding-polish-preview--tabs-${id}`} />
              )}
            />
          </div>
        ) : null}

        {subSection === 'cards' ? (
          <div className="ds-blayout-block">
            <div className="ds-blayout-block-head">
              <h4>Server card layout</h4>
              <p>Structure only — all cards still use your panel accent.</p>
            </div>
            <div className="ds-blayout-grid ds-blayout-grid--cards">
              {SERVER_CARD_STYLE_OPTIONS.map((opt) => (
                <VisualCard
                  key={opt.id}
                  active={branding.serverCardStyle === opt.id}
                  onClick={() => {
                    pickSurface('client');
                    onBrandingChange({ ...branding, serverCardStyle: opt.id });
                  }}
                  label={opt.label}
                  description={opt.description}
                  badge={opt.hint}
                  preview={
                    <div className="ds-blayout-card-stage">
                      <ServerCardMock style={opt.id} accent={branding.accentColor} />
                    </div>
                  }
                />
              ))}
            </div>

            <div className="ds-blayout-block-head ds-blayout-block-head--spaced">
              <h4>My Servers default view</h4>
              <p>First visit before a user toggles grid or list.</p>
            </div>
            <SegmentGrid
              value={branding.serverListDefaultView}
              options={SERVER_LIST_VIEW_OPTIONS}
              onChange={(serverListDefaultView) => {
                pickSurface('client');
                onBrandingChange({ ...branding, serverListDefaultView });
              }}
              renderPreview={(id) => (
                <span className={`branding-polish-preview branding-polish-preview--view-${id}`} />
              )}
            />
          </div>
        ) : null}

        {subSection === 'finish' ? (
          <div className="ds-blayout-block">
            <div className="ds-blayout-finish-grid">
              <div>
                <div className="ds-blayout-block-head">
                  <h4>Corner radius</h4>
                  <p>Cards, inputs, and modals.</p>
                </div>
                <SegmentGrid
                  value={branding.surfaceRadius}
                  options={SURFACE_RADIUS_OPTIONS}
                  onChange={(surfaceRadius) => onBrandingChange({ ...branding, surfaceRadius })}
                  renderPreview={(id) => (
                    <span className={`branding-polish-preview branding-polish-preview--radius-${id}`} />
                  )}
                />
              </div>
              <div>
                <div className="ds-blayout-block-head">
                  <h4>Content density</h4>
                  <p>Page padding and table row height.</p>
                </div>
                <SegmentGrid
                  value={branding.contentDensity}
                  options={CONTENT_DENSITY_OPTIONS}
                  onChange={(contentDensity) => onBrandingChange({ ...branding, contentDensity })}
                />
              </div>
              <div>
                <div className="ds-blayout-block-head">
                  <h4>Motion</h4>
                  <p>Ambient backgrounds and login animation.</p>
                </div>
                <SegmentGrid
                  value={branding.motionPreference}
                  options={MOTION_PREFERENCE_OPTIONS}
                  onChange={(motionPreference) => onBrandingChange({ ...branding, motionPreference })}
                />
              </div>
            </div>

            <div className="ds-blayout-check ds-blayout-check--hero">
              <Checkbox
                label="Accent hero stripe"
                description="Thin gradient bar on page heroes, login card, and My Servers header."
                checked={branding.showHeroStripe}
                onChange={(showHeroStripe) => onBrandingChange({ ...branding, showHeroStripe })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
