import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';

/** Subtle animated mesh behind main panel content (dashboard, servers, server shell). */
export function AmbientBackdrop({ variant = 'panel' }: { variant?: 'panel' | 'dense' }) {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const panelBg = appearance.panelBackground;

  if (!appearance.panelAmbient) return null;

  return (
    <div
      className={`ambient-backdrop ambient-backdrop--${variant}`}
      data-panel-bg={panelBg}
      aria-hidden
    >
      <div className="ambient-backdrop-mesh" />
      <div className="ambient-backdrop-glow" />
      <div className="ambient-backdrop-grain" />
    </div>
  );
}
