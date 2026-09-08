import { useState, useSyncExternalStore } from 'react';
import { Download, Share } from 'lucide-react';
import {
  canPromptInstall,
  isIosDevice,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from '../lib/pwa';

const FOOTER_ITEM_CLASS =
  'nav-item group mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]';

/**
 * Offers to install the panel as an app.
 *
 * Renders nothing when already installed, or when the browser has not offered
 * an install (unsupported browser, or criteria not yet met). iOS has no install
 * API, so it gets Share-sheet instructions instead.
 */
export function InstallAppButton() {
  const installable = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const [showIosHint, setShowIosHint] = useState(false);

  if (isStandalone()) return null;

  if (!installable) {
    if (!isIosDevice()) return null;
    return (
      <div>
        <button type="button" onClick={() => setShowIosHint((open) => !open)} className={FOOTER_ITEM_CLASS}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)]">
            <Share className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-medium">Install app</span>
        </button>
        {showIosHint ? (
          <p className="mx-1 mb-1 rounded-lg bg-[var(--bg-elevated)] px-2 py-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
            Tap <strong className="font-semibold text-[var(--text)]">Share</strong>, then{' '}
            <strong className="font-semibold text-[var(--text)]">Add to Home Screen</strong>.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void promptInstall()} className={FOOTER_ITEM_CLASS}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)]">
        <Download className="h-3.5 w-3.5" />
      </span>
      <span className="text-[13px] font-medium">Install app</span>
    </button>
  );
}
