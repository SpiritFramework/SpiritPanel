import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, ExternalLink } from 'lucide-react';
import type { SpiritPanelReleaseInfo } from '../../../lib/api';
import { PANEL_PRODUCT } from '../../../lib/product-meta';
import { loadSpiritPanelRelease } from '../../../lib/spirit-panel-release';

/**
 * Banner on the admin dashboard — only visible when an update is available.
 */
export function PanelUpdateBanner() {
  const [release, setRelease] = useState<SpiritPanelReleaseInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadSpiritPanelRelease()
      .then((data) => {
        if (!cancelled) {
          setRelease(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not check for updates');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fail soft — don't clutter the dashboard when GitHub is unreachable.
  if (error || !release || release.status !== 'behind') return null;

  return (
    <div className="ds-ad-alert ds-ad-alert--update" role="status">
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <strong>{PANEL_PRODUCT}</strong> update available — you are on{' '}
        <span className="ds-text-mono">v{release.installedVersion}</span>, latest is{' '}
        <span className="ds-text-mono">v{release.latestVersion}</span>.
      </p>
      <a
        href={release.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ds-ad-alert-link"
      >
        View release
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
      <Link to="/admin/settings?tab=about" className="ds-ad-alert-link">
        Update guide
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
