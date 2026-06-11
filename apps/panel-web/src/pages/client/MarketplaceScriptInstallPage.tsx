import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Github, Package } from 'lucide-react';
import { useMarketplaceScriptResolved } from '../../hooks/useMarketplaceScriptResolved';
import { useMarketplacePaths } from '../../lib/marketplace-paths';
import { useServer } from '../../context/ServerContext';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import { MarketplaceScriptInstallPanel } from './MarketplaceScriptInstallPanel';

export function MarketplaceScriptInstallPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { server } = useServer();
  const access = getServerAccess(server);
  const { base, scriptPath } = useMarketplacePaths();
  const { resolvedId, resolved, loading, error, displayName, displayOwner, displayRepo } =
    useMarketplaceScriptResolved();

  const detailPath =
    displayOwner && displayRepo ? scriptPath(displayOwner, displayRepo) : base;

  async function handleInstalled() {
    toast.success('Resource installed');
    navigate(`${base}?tab=installed`);
  }

  if (server.marketplaceEnabled === false) {
    return (
      <ServerPage>
        <div className="mp-empty-state">
          <Package className="h-10 w-10 text-[var(--muted)]" />
          <p className="mt-3 font-medium">Marketplace disabled</p>
        </div>
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <div className="mp-empty-state">
          <p className="font-medium">FiveM only</p>
        </div>
      </ServerPage>
    );
  }

  return (
    <ServerPage className="mp-install-page-root">
      <div className="mp-shell mp-script-install-page">
        <Link to={detailPath} className="mp-script-back">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to script details
        </Link>

        {loading && !resolved ? (
          <div className="mp-script-install-page-loading">
            <Spinner className="h-6 w-6 text-[var(--accent)]" />
            <p className="text-xs text-[var(--muted)]">Loading install options…</p>
          </div>
        ) : error ? (
          <ServerErrorBanner message={error} />
        ) : resolved ? (
          <>
            <header className="mp-script-hero">
              <div className="mp-hero-glow" aria-hidden />
              <div className="mp-script-hero-top">
                <div className="mp-script-hero-headline">
                  <div className="mp-repo-avatar mp-repo-avatar--lg">
                    <Github className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mp-script-install-eyebrow">
                      <Download className="h-3 w-3" aria-hidden />
                      One-click install
                    </p>
                    <h1 className="mp-script-hero-name">{displayName}</h1>
                    <p className="mp-script-hero-repo">
                      {displayOwner}
                      <span>/</span>
                      {displayRepo}
                    </p>
                    <p className="mp-script-hero-lead">
                      Downloads the release, extracts files to your server, and optionally patches{' '}
                      <code>server.cfg</code>.
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <MarketplaceScriptInstallPanel
              serverId={resolvedId}
              resolved={resolved}
              serverLayout={resolved.layout ?? null}
              canInstall={access.canInstallMarketplace}
              onInstalled={handleInstalled}
            />
          </>
        ) : null}
      </div>
    </ServerPage>
  );
}
