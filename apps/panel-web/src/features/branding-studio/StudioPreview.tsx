import { forwardRef } from 'react';
import type { BrandingForm } from '../../components/admin/settings/settings-types';
import type { PanelGeneralSettings } from '../../lib/panel-settings';
import { SERVER_CARD_STYLE_OPTIONS } from '../../lib/branding-appearance';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { sanitizeImageSrc } from '../../lib/safe-url';

export type PreviewSurface = 'login' | 'client' | 'admin' | 'server';

type StudioPreviewProps = {
  branding: BrandingForm;
  general: PanelGeneralSettings;
  mode: 'light' | 'dark';
  surface: PreviewSurface;
  onModeChange: (mode: 'light' | 'dark') => void;
  onSurfaceChange: (surface: PreviewSurface) => void;
};

const SURFACES: { id: PreviewSurface; label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'client', label: 'Client' },
  { id: 'admin', label: 'Admin' },
  { id: 'server', label: 'Server' },
];

export const StudioPreview = forwardRef<HTMLDivElement, StudioPreviewProps>(function StudioPreview(
  { branding, general, mode, surface, onModeChange, onSurfaceChange },
  ref,
) {
  const brand = branding.panelName.trim() || general.companyName.trim() || 'Spirit Panel';
  const logo = sanitizeImageSrc(branding.logoUrl);
  const cardLabel =
    SERVER_CARD_STYLE_OPTIONS.find((o) => o.id === branding.serverCardStyle)?.label ?? 'Cards';

  return (
    <div className="ds-bstudio-preview">
      <div className="ds-bstudio-preview-toolbar">
        <div className="ds-bstudio-preview-tabs" role="tablist" aria-label="Preview surface">
          {SURFACES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={surface === s.id}
              className={`ds-bstudio-preview-tab${surface === s.id ? ' is-active' : ''}`}
              onClick={() => onSurfaceChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="ds-bstudio-preview-modes" role="group" aria-label="Preview theme mode">
          {(['dark', 'light'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`ds-bstudio-preview-mode${mode === m ? ' is-active' : ''}`}
              onClick={() => onModeChange(m)}
            >
              {m === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={ref}
        className={`ds-bstudio-preview-root ds-bstudio-preview-root--${surface}`}
        data-branding-preview="true"
      >
        {surface === 'login' ? (
          <div
            className="ds-bstudio-mock-login login-brand-panel"
            data-login-bg={branding.loginBackground}
            data-login-ambient={branding.loginAmbientLevel}
          >
            <div className="login-bg-canvas pointer-events-none absolute inset-0" aria-hidden />
            <div className="login-bg-overlay pointer-events-none absolute inset-0" aria-hidden />
            <div className="ds-bstudio-mock-login__panel">
              {logo ? (
                <img src={logo} alt="" className="ds-bstudio-mock-login__logo" />
              ) : (
                <div className="ds-bstudio-mock-login__mark" style={panelNameGradientStyle()}>
                  {panelNameInitial(brand)}
                </div>
              )}
              <PanelName name={brand} variant="preview" className="ds-bstudio-mock-login__title" />
              {branding.tagline ? <p className="ds-bstudio-mock-login__tag">{branding.tagline}</p> : null}
              <p className="ds-bstudio-mock-login__msg">{branding.loginMessage}</p>
              <div className="ds-bstudio-mock-login__field" />
              <div className="ds-bstudio-mock-login__field" />
              <div className="ds-bstudio-mock-login__btn">Sign in</div>
              {general.footerText ? <p className="ds-bstudio-mock-login__foot">{general.footerText}</p> : null}
            </div>
          </div>
        ) : null}

        {surface === 'client' || surface === 'admin' ? (
          <div
            className={`ds-bstudio-mock-app panel-preview panel-preview--${branding.panelBackground}`}
            data-panel-ambient={branding.panelAmbient ? 'on' : 'off'}
          >
            <aside
              className={`ds-bstudio-mock-sidebar ds-bstudio-mock-sidebar--${
                surface === 'admin' ? branding.adminSidebarStyle : branding.clientSidebarStyle
              }`}
              data-sidebar-material={branding.sidebarMaterial}
            >
              <div className="ds-bstudio-mock-sidebar__brand">
                {logo ? (
                  <img src={logo} alt="" />
                ) : (
                  <span style={panelNameGradientStyle()}>{panelNameInitial(brand)}</span>
                )}
                <span>{brand}</span>
              </div>
              <div className="ds-bstudio-mock-sidebar__nav">
                <span className="is-active" />
                <span />
                <span />
                <span />
              </div>
            </aside>
            <main className="ds-bstudio-mock-main">
              <header className="ds-bstudio-mock-topbar">
                <span className="ds-bstudio-mock-topbar__title">
                  {surface === 'admin' ? 'Administration' : 'Your servers'}
                </span>
                <span className="ds-bstudio-mock-topbar__chip" />
              </header>
              {surface === 'admin' ? (
                <div className={`ds-bstudio-mock-tabs ds-bstudio-mock-tabs--${branding.adminTabsStyle}`}>
                  <span className="is-active">Overview</span>
                  <span>Users</span>
                  <span>Nodes</span>
                </div>
              ) : null}
              <div className="ds-bstudio-mock-grid">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`ds-bstudio-mock-card branding-mock-card branding-mock-card--${branding.serverCardStyle}`}
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
                ))}
              </div>
              <p className="ds-bstudio-mock-caption">{cardLabel}</p>
            </main>
          </div>
        ) : null}

        {surface === 'server' ? (
          <div className={`ds-bstudio-mock-app panel-preview panel-preview--${branding.panelBackground}`}>
            <aside
              className={`ds-bstudio-mock-sidebar ds-bstudio-mock-sidebar--${branding.serverSidebarStyle}`}
              data-sidebar-material={branding.sidebarMaterial}
            >
              <div className="ds-bstudio-mock-sidebar__brand">
                {logo ? <img src={logo} alt="" /> : <span style={panelNameGradientStyle()}>S</span>}
                <span>Server</span>
              </div>
              <div className="ds-bstudio-mock-sidebar__nav">
                <span className="is-active" />
                <span />
                <span />
                <span />
                <span />
              </div>
            </aside>
            <main className="ds-bstudio-mock-main">
              <header className="ds-bstudio-mock-topbar">
                <span className="ds-bstudio-mock-topbar__title">Console</span>
                <span className="ds-bstudio-mock-btn">Start</span>
              </header>
              <div className="ds-bstudio-mock-console">
                <span />
                <span />
                <span />
              </div>
            </main>
          </div>
        ) : null}
      </div>
    </div>
  );
});
