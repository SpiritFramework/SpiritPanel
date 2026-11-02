import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';

/** Panel root structural class — atmosphere itself is rendered by AmbientBackdrop. */
export function usePanelBackgroundClass() {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  return `panel-bg-root panel-bg-${appearance.panelBackground}`;
}
