import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { SpiritPanelReleaseInfo } from '../../../lib/api';
import { PANEL_PRODUCT, PANEL_VERSION } from '../../../lib/product-meta';
import { loadSpiritPanelRelease } from '../../../lib/spirit-panel-release';
import { Button } from '../../Layout';

export function PanelVersionStatus() {
  const [release, setRelease] = useState<SpiritPanelReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const refresh = (force = false) => {
    setLoading(true);
    void loadSpiritPanelRelease(force)
      .then((data) => {
        setRelease(data);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not check for updates');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh(false);
  }, []);

  const status = release?.status ?? 'unknown';
  const installed = release?.installedVersion ?? PANEL_VERSION;

  return (
    <div className={`ds-set-about-update ds-set-about-update--${status}`} aria-live="polite">
      <div className="ds-set-about-update-head">
        <div className="min-w-0 flex-1">
          <p className="ds-set-about-update-eyebrow">{PANEL_PRODUCT} version</p>
          <p className="ds-set-about-update-title">
            Installed <span className="ds-text-mono">v{installed}</span>
            {release?.latestVersion ? (
              <>
                {' · '}
                Latest <span className="ds-text-mono">v{release.latestVersion}</span>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="ds-set-about-update-refresh"
          onClick={() => refresh(true)}
          disabled={loading}
          aria-label="Refresh version check"
        >
          <RefreshCw className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} />
        </button>
      </div>

      <div className="ds-set-about-update-status">
        {loading ? (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--neutral">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Checking GitHub…
          </span>
        ) : status === 'current' ? (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--good">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Up to date
          </span>
        ) : status === 'behind' ? (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--warn">
            <ArrowUpRight className="h-3 w-3" aria-hidden />
            Update available
          </span>
        ) : status === 'ahead' ? (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--info">
            Newer than latest release
          </span>
        ) : (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--neutral">
            Version unknown
          </span>
        )}
      </div>

      {error ? <p className="ds-set-about-update-error">{error}</p> : null}

      {status === 'behind' && release ? (
        <div className="ds-set-about-update-body">
          <p>
            Run this on the panel host to update to <strong>v{release.latestVersion}</strong>:
          </p>
          <pre className="ds-set-about-update-cmd">
            <code>{release.updateCommand}</code>
          </pre>
          <div className="ds-set-about-update-actions">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(release.updateCommand).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? 'Copied' : 'Copy command'}
            </Button>
            <a
              href={release.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn--primary ds-btn--sm"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Release notes
            </a>
          </div>
        </div>
      ) : null}

      {status === 'current' && release ? (
        <p className="ds-set-about-update-hint">
          You are running the latest published release
          {release.publishedAt
            ? ` (${new Date(release.publishedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })})`
            : ''}
          .
        </p>
      ) : null}
    </div>
  );
}
