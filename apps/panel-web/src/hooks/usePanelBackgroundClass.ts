import { useBranding } from '../context/BrandingContext';

/** Panel root background class from admin branding settings. */
export function usePanelBackgroundClass() {
  const { branding } = useBranding();
  return `panel-bg-root panel-bg-${branding.panelBackground || 'gradient'}`;
}
