import { RefreshCw, ServerCrash } from 'lucide-react';

/** Shown when the panel API is unreachable (502/503) — not a login issue. */
export function ServiceUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] p-6">
      <div className="ds-empty max-w-md w-full border-solid">
        <div className="ds-empty-icon">
          <ServerCrash className="ds-icon ds-icon--md" aria-hidden />
        </div>
        <h1 className="ds-empty-title">Panel API unavailable</h1>
        <p className="ds-empty-description">
          The game panel cannot reach its backend right now. This is usually temporary — the API service may be
          restarting, or nginx cannot connect to it on the server.
        </p>
        <p className="ds-empty-description mt-3 text-[11px] opacity-80">
          If you manage this host: confirm <code className="text-[var(--text)]">panel-api</code> is running and{' '}
          <code className="text-[var(--text)]">/api/health</code> returns OK.
        </p>
        <button
          type="button"
          className="ds-btn ds-btn--primary ds-btn--md mt-5"
          onClick={onRetry}
        >
          <RefreshCw className="ds-icon" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
