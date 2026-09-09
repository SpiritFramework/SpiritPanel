import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { applyWaitingUpdate, hasWaitingUpdate, subscribeWaitingUpdate } from '../lib/pwa';

/**
 * Global banner when a new service worker is waiting — Reload posts
 * skip-waiting and lets controllerchange refresh the page.
 */
export function PwaUpdateBanner() {
  const [available, setAvailable] = useState(() => hasWaitingUpdate());

  useEffect(() => subscribeWaitingUpdate(() => setAvailable(hasWaitingUpdate())), []);

  if (!available) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center p-3 safe-top">
      <div className="pointer-events-auto w-full max-w-3xl">
        <div className="ds-ad-alert ds-ad-alert--update" role="status">
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            <strong>Update available</strong> — a newer version of the panel is ready.
          </p>
          <button type="button" className="ds-ad-alert-link" onClick={() => applyWaitingUpdate()}>
            Reload
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
