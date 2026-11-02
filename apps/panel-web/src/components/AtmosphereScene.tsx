import type { CSSProperties } from 'react';
import type { AtmospherePreset, LoginAmbientLevel } from '../lib/branding-appearance';

export type AtmosphereSurface = 'login' | 'panel' | 'preview';

const PARTICLE_COUNT = 14;

function intensityFromAmbient(level: LoginAmbientLevel | undefined): 'off' | 'standard' | 'enhanced' | 'cinematic' {
  if (!level) return 'standard';
  return level;
}

/**
 * Layered animated atmosphere used by login, panel shells, and branding studio cards.
 * Presets are driven by CSS under `.atm--{preset}`; this component only owns the DOM.
 */
export function AtmosphereScene({
  preset,
  surface,
  ambientLevel,
  dense = false,
  className = '',
}: {
  preset: AtmospherePreset;
  surface: AtmosphereSurface;
  ambientLevel?: LoginAmbientLevel;
  /** Panel “extra ambient” toggle — denser motion and stronger glow. */
  dense?: boolean;
  className?: string;
}) {
  const intensity =
    surface === 'login'
      ? intensityFromAmbient(ambientLevel)
      : dense
        ? 'enhanced'
        : 'standard';

  if (preset === 'solid' && surface === 'panel') {
    return null;
  }

  return (
    <div
      className={`atm atm--${preset} atm--${surface} atm--${intensity}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <div className="atm__base" />
      <div className="atm__blob atm__blob--1" />
      <div className="atm__blob atm__blob--2" />
      <div className="atm__blob atm__blob--3" />
      <div className="atm__sheet atm__sheet--1" />
      <div className="atm__sheet atm__sheet--2" />
      <div className="atm__beams" />
      <div className="atm__rings">
        <span />
        <span />
        <span />
      </div>
      <div className="atm__particles">
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <div className="atm__grain" />
      <div className="atm__veil" />
    </div>
  );
}
