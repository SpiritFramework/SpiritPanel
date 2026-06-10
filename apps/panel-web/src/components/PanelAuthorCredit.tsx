import { PANEL_AUTHOR, PANEL_PRODUCT } from '../lib/product-meta.js';

/** Subtle software attribution in sidebars (hosters can override branding separately). */
export function PanelAuthorCredit({ className = '' }: { className?: string }) {
  return (
    <p className={`px-1 text-[10px] leading-snug text-[var(--muted)] ${className}`}>
      {PANEL_PRODUCT} by {PANEL_AUTHOR}
    </p>
  );
}
