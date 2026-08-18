import { useNavigate } from 'react-router-dom';
import { Download, Github, Package } from 'lucide-react';
import { useMarketplaceScriptResolved } from '../../hooks/useMarketplaceScriptResolved';
import { useMarketplacePaths } from '../../lib/marketplace-paths';
import { useServer } from '../../context/ServerContext';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import {
  MarketplaceBackLink,
  MarketplaceEmptyState,
  MarketplacePage,
} from '../../components/marketplace/MarketplaceChrome';
import { MarketplaceScriptInstallPanel } from './MarketplaceScriptInstallPanel';

export function MarketplaceScriptInstallPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { server } = useServer();
  const access = getServerAccess(server);
  const { base, scriptPath } = useMarketplacePaths();
  const { resolvedId, resolved, loading, error, displayName, displayOwner, displayRepo } =
    useMarketplaceScriptResolved();

  const detailPath = displayOwner && displayRepo ? scriptPath(displayOwner, displayRepo) : base;

  async function handleInstalled() {
    toast.success('Resource installed');
    navigate(`${base}?tab=installed`);
  }

  if (server.marketplaceEnabled === false) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="Marketplace disabled" />
      </ServerPage>
    );
  }

  if (!isFiveMServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="FiveM only" />
      </ServerPage>
    );
  }

  return (
    <ServerPage>
      <MarketplacePage>
        <MarketplaceBackLink to={detailPath}>Back to script details</MarketplaceBackLink>

        {loading && !resolved ? (
          <div className="fm-install-loading">
            <Spinner className="h-6 w-6 text-[var(--accent)]" />
            <p className="text-xs text-[var(--muted)]">Loading install options…</p>
          </div>
        ) : error ? (
          <ServerErrorBanner message={error} />
        ) : resolved ? (
          <>
            <header className="fm-script-hero">
              <div className="fm-script-hero-glow" aria-hidden />
              <div className="fm-script-hero-inner">
                <div className="fm-script-headline">
                  <div className="fm-repo-avatar fm-repo-avatar--lg">
                    <Github className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="fm-install-eyebrow">
                      <Download className="h-3 w-3" aria-hidden />
                      One-click install
                    </p>
                    <h1 className="fm-script-title">{displayName}</h1>
                    <p className="fm-script-repo">
                      {displayOwner}
                      <span>/</span>
                      {displayRepo}
                    </p>
                    <p className="fm-script-lead">
                      Downloads the release, extracts files to your server, and optionally patches{' '}
                      <code className="font-mono text-[0.9em]">server.cfg</code>.
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
      </MarketplacePage>
    </ServerPage>
  );
}
