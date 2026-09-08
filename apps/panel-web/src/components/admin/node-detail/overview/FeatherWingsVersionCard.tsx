import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Download, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { compareVersionStatus } from '../../../../lib/version-compare';
import { api, type FeatherWingsReleaseInfo } from '../../../../lib/api';
import { Button } from '../../../Layout';

let releaseCache: FeatherWingsReleaseInfo | null = null;
let releasePromise: Promise<FeatherWingsReleaseInfo> | null = null;

function loadFeatherWingsRelease(): Promise<FeatherWingsReleaseInfo> {
  if (releaseCache) return Promise.resolve(releaseCache);
  if (!releasePromise) {
    releasePromise = api.admin.featherWingsRelease().then((data: FeatherWingsReleaseInfo) => {
      releaseCache = data;
      return data;
    });
  }
  return releasePromise;
}

export function FeatherWingsVersionCard({
  installedVersion,
  online,
  onDownloadConfig,
}: {
  installedVersion: string | null;
  online: boolean;
  onDownloadConfig: () => void;
}) {
  const [release, setRelease] = useState<FeatherWingsReleaseInfo | null>(releaseCache);
  const [loading, setLoading] = useState(!releaseCache);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(!releaseCache);
    void loadFeatherWingsRelease()
      .then((data) => {
        if (!cancelled) {
          setRelease(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not check latest version');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const status = compareVersionStatus(installedVersion, release?.latestVersion);
  const published = release?.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <section className={`ds-nd-ov-fw ds-nd-ov-fw--${status}`} aria-label="FeatherWings version">
      <div className="ds-nd-ov-fw-head">
        <div className="ds-nd-ov-fw-icon" aria-hidden>
          <Sparkles className="ds-icon ds-icon--sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="ds-nd-ov-fw-eyebrow">FeatherWings</p>
          <h2 className="ds-nd-ov-fw-title">Daemon version</h2>
        </div>
        <button
          type="button"
          className="ds-nd-ov-fw-refresh"
          onClick={() => {
            releaseCache = null;
            releasePromise = null;
            setLoading(true);
            void api.admin
              .featherWingsRelease()
              .then((data) => {
                releaseCache = data;
                releasePromise = Promise.resolve(data);
                setRelease(data);
                setError('');
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Refresh failed'))
              .finally(() => setLoading(false));
          }}
          disabled={loading}
          aria-label="Refresh latest version"
        >
          <RefreshCw className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} />
        </button>
      </div>

      <div className="ds-nd-ov-fw-versions">
        <VersionCell label="Installed" value={installedVersion ?? (online ? '—' : 'Unreachable')} muted={!installedVersion} />
        <VersionCell
          label="Latest"
          value={loading ? 'Checking…' : release?.latestVersion ?? '—'}
          muted={!release?.latestVersion}
        />
      </div>

      <div className="ds-nd-ov-fw-status-row">
        {loading ? (
          <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--neutral">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Checking GitHub…
          </span>
        ) : status === 'current' ? (
          <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--good">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Up to date
          </span>
        ) : status === 'behind' ? (
          <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--warn">
            <ArrowUpRight className="h-3 w-3" aria-hidden />
            Update available
          </span>
        ) : status === 'ahead' ? (
          <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--info">Newer than latest release</span>
        ) : (
          <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--neutral">
            {online ? 'Version unknown' : 'Connect Wings to compare'}
          </span>
        )}
        {published ? <span className="ds-nd-ov-fw-published">Latest published {published}</span> : null}
      </div>

      {error ? <p className="ds-nd-ov-fw-error">{error}</p> : null}

      {status === 'behind' && release ? (
        <div className="ds-nd-ov-fw-update">
          <p className="ds-nd-ov-fw-update-text">
            This node is running <strong>v{installedVersion}</strong>. Update to{' '}
            <strong>v{release.latestVersion}</strong> on the host, then restart FeatherWings.
          </p>
          <div className="ds-nd-ov-fw-actions">
            <a
              href={release.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn--primary ds-btn--sm"
            >
              <ExternalLink className="ds-icon ds-icon--sm" aria-hidden />
              View release
            </a>
            <Button type="button" variant="secondary" size="sm" onClick={onDownloadConfig}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Wings config
            </Button>
          </div>
        </div>
      ) : null}

      {!online && !installedVersion ? (
        <p className="ds-nd-ov-fw-hint">
          Install FeatherWings on this host and use the downloaded config so the panel can report the running version.
        </p>
      ) : null}
    </section>
  );
}

function VersionCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="ds-nd-ov-fw-version-cell">
      <span className="ds-nd-ov-fw-version-label">{label}</span>
      <span className={`ds-nd-ov-fw-version-value${muted ? ' ds-nd-ov-fw-version-value--muted' : ''}`}>{value}</span>
    </div>
  );
}
