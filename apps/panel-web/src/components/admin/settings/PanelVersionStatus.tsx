import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { SpiritPanelReleaseInfo } from '../../../lib/api';
import { PANEL_PRODUCT, PANEL_VERSION } from '../../../lib/product-meta';
import { loadSpiritPanelRelease } from '../../../lib/spirit-panel-release';
import { Button } from '../../Layout';

function statusCopy(
  status: SpiritPanelReleaseInfo['status'] | 'unknown',
  installed: string,
  latest: string | undefined,
): string {
  if (status === 'current') {
    return `This host matches the latest published ${PANEL_PRODUCT} release on GitHub.`;
  }
  if (status === 'behind' && latest) {
    return `Update available: this host is on v${installed}; GitHub has v${latest}. Run the command below on the panel host (branding and ticket data are preserved).`;
  }
  if (status === 'ahead') {
    return 'This build is newer than the latest GitHub release — common for a local or pre-release build.';
  }
  return 'Could not compare against GitHub yet. Use Refresh, or check network access to api.github.com.';
}

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
  const published = release?.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <section className={`ds-set-about-update ds-set-about-update--${status}`} aria-live="polite">
      <div className="ds-set-about-update-head">
        <div className="min-w-0 flex-1">
          <p className="ds-set-about-update-eyebrow">Updates</p>
          <h3 className="ds-set-about-update-heading">{PANEL_PRODUCT} version</h3>
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

      <div className="ds-set-about-update-versions">
        <div className="ds-set-about-update-cell">
          <span className="ds-set-about-update-cell-label">Installed on this host</span>
          <span className="ds-set-about-update-cell-value ds-text-mono">v{installed}</span>
        </div>
        <div className="ds-set-about-update-cell">
          <span className="ds-set-about-update-cell-label">Latest on GitHub</span>
          <span
            className={`ds-set-about-update-cell-value ds-text-mono${
              !release?.latestVersion ? ' ds-set-about-update-cell-value--muted' : ''
            }`}
          >
            {loading ? 'Checking…' : release?.latestVersion ? `v${release.latestVersion}` : '—'}
          </span>
        </div>
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
            Ahead of latest release
          </span>
        ) : (
          <span className="ds-set-about-update-badge ds-set-about-update-badge--neutral">
            Status unknown
          </span>
        )}
        {published && !loading ? (
          <span className="ds-set-about-update-published">Latest published {published}</span>
        ) : null}
      </div>

      {!loading ? (
        <p className="ds-set-about-update-summary">
          {statusCopy(status, installed, release?.latestVersion)}
        </p>
      ) : null}

      {error ? <p className="ds-set-about-update-error">{error}</p> : null}

      {status === 'behind' && release ? (
        <div className="ds-set-about-update-body">
          <p className="ds-set-about-update-body-label">Run on the panel host</p>
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

      {status !== 'behind' && release?.releaseUrl && !loading ? (
        <div className="ds-set-about-update-foot">
          <a
            href={release.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-set-about-update-link"
          >
            View latest release
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      ) : null}
    </section>
  );
}
