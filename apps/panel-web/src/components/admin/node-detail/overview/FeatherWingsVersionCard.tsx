import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCopy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { compareVersionStatus } from '@spirit/shared';
import { api, type FeatherWingsReleaseInfo } from '../../../../lib/api';

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
  onCopyJoinData,
}: {
  installedVersion: string | null;
  online: boolean;
  onDownloadConfig: () => void;
  onCopyJoinData?: () => void;
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

  function refresh() {
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
  }

  const status = compareVersionStatus(installedVersion, release?.latestVersion);
  const installedLabel = installedVersion ?? (online ? '—' : 'Offline');
  const latestLabel = loading ? '…' : release?.latestVersion ?? '—';

  return (
    <section className={`ds-nd-ov-fw ds-nd-ov-fw--bar ds-nd-ov-fw--${status}`} aria-label="FeatherWings version">
      <div className="ds-nd-ov-fw-bar">
        <div className="ds-nd-ov-fw-bar-identity">
          <span className="ds-nd-ov-fw-icon" aria-hidden>
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="ds-nd-ov-fw-eyebrow">FeatherWings</p>
            <h2 className="ds-nd-ov-fw-title">Daemon</h2>
          </div>
        </div>

        <div className="ds-nd-ov-fw-bar-versions" aria-label="Version comparison">
          <div className="ds-nd-ov-fw-bar-version">
            <span className="ds-nd-ov-fw-version-label">Installed</span>
            <span className={`ds-nd-ov-fw-version-value${!installedVersion ? ' ds-nd-ov-fw-version-value--muted' : ''}`}>
              {installedLabel}
            </span>
          </div>
          <span className="ds-nd-ov-fw-bar-sep" aria-hidden>
            →
          </span>
          <div className="ds-nd-ov-fw-bar-version">
            <span className="ds-nd-ov-fw-version-label">Latest</span>
            <span className={`ds-nd-ov-fw-version-value${!release?.latestVersion ? ' ds-nd-ov-fw-version-value--muted' : ''}`}>
              {latestLabel}
            </span>
          </div>
        </div>

        <div className="ds-nd-ov-fw-bar-status">
          {loading ? (
            <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--neutral">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Checking…
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
            <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--info">Ahead of release</span>
          ) : (
            <span className="ds-nd-ov-fw-badge ds-nd-ov-fw-badge--neutral">
              {online ? 'Unknown' : 'Not connected'}
            </span>
          )}
        </div>

        <div className="ds-nd-ov-fw-bar-actions">
          {status === 'behind' && release ? (
            <a
              href={release.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-nd-tool-btn"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Release
            </a>
          ) : null}
          <button
            type="button"
            className="ds-nd-ov-fw-refresh"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh latest version"
          >
            <RefreshCw className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? <p className="ds-nd-ov-fw-error">{error}</p> : null}

      {status === 'behind' && release ? (
        <div className="ds-nd-ov-fw-update">
          <p className="ds-nd-ov-fw-update-text">
            Running <strong>v{installedVersion}</strong> — update the host to{' '}
            <strong>v{release.latestVersion}</strong>, then restart FeatherWings.
          </p>
          <div className="ds-nd-toolstrip ds-nd-toolstrip--compact" role="group" aria-label="Update helpers">
            {onCopyJoinData ? (
              <button type="button" className="ds-nd-tool-btn" onClick={onCopyJoinData}>
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                Join-data
              </button>
            ) : null}
            <button type="button" className="ds-nd-tool-btn" onClick={onDownloadConfig}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Wings config
            </button>
          </div>
        </div>
      ) : null}

      {!online && !installedVersion ? (
        <p className="ds-nd-ov-fw-hint">
          Connect FeatherWings with join-data or the YAML config so the panel can report the daemon version.
        </p>
      ) : null}
    </section>
  );
}
