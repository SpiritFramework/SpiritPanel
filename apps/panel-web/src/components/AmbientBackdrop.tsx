import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';
import { AtmosphereScene } from './AtmosphereScene';

/** Animated atmosphere behind main panel content (dashboard, servers, server shell). */
export function AmbientBackdrop({ variant = 'panel' }: { variant?: 'panel' | 'dense' }) {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);

  if (appearance.panelBackground === 'solid') return null;

  return (
    <AtmosphereScene
      preset={appearance.panelBackground}
      surface="panel"
      dense={appearance.panelAmbient || variant === 'dense'}
      className="ambient-backdrop"
    />
  );
}
