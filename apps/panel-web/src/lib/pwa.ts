/**
 * Progressive web app plumbing: service worker registration and the
 * "Install app" prompt.
 *
 * `beforeinstallprompt` can fire before React mounts, so `initInstallPrompt()`
 * runs from `main.tsx` and stashes the event for the UI to use later.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** True when already running as an installed app, so we can hide the button. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari predates the display-mode media query.
    ('standalone' in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone))
  );
}

/**
 * iOS has no install prompt API — installing is a manual Share sheet action,
 * so the UI shows instructions instead of a button.
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS reports as a Mac; touch points disambiguate it.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns true when the user accepted. The event is single-use. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  emit();

  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppress the browser's own mini-infobar so we control placement.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function registerServiceWorker(version: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Caching the shell in dev fights Vite's HMR.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    // The version query makes each release a new worker URL, which is what
    // triggers the update-and-drop-old-caches cycle in sw.js.
    void navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`).catch(() => {
      /* non-fatal: the panel works fine without offline support */
    });
  });
}
