import { useNavigate } from 'react-router-dom';
import { Download, Package } from 'lucide-react';
import { useMarketplaceScriptResolved } from '../../../hooks/useMarketplaceScriptResolved';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { useServer } from '../../../context/ServerContext';
import { useToast } from '../../../context/ToastContext';
import { getServerAccess } from '../../../lib/server-access';
import { isFiveMServer } from '../../../lib/server-eggs';
import { Spinner } from '../../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';
import {
  MarketplaceBackLink,
  MarketplaceEmptyState,
  ResourceHero,
} from '../components/Layout';
import { GithubRepoAvatar } from '../components/GithubRepoAvatar';
import { ScriptInstallPanel } from '../components/ScriptInstallPanel';

export function ScriptInstallPage() {
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
      <div className="ds-page ds-stack">
        <MarketplaceBackLink to={detailPath}>Back to script details</MarketplaceBackLink>

        {loading && !resolved ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-[var(--muted)]">Loading install options…</p>
          </div>
        ) : error ? (
          <ServerErrorBanner message={error} />
        ) : resolved ? (
          <>
            <ResourceHero
              eyebrow={
                <span className="inline-flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  One-click install
                </span>
              }
              title={displayName}
              subtitle={`${displayOwner}/${displayRepo}`}
              description="Downloads the release, extracts files to your server, and optionally patches server.cfg."
              icon={
                <GithubRepoAvatar
                  owner={displayOwner}
                  avatarUrl={resolved?.ownerAvatarUrl}
                  size="lg"
                />
              }
            />

            <ScriptInstallPanel
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
