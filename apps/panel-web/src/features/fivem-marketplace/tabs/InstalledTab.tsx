import { Link } from 'react-router-dom';
import { ExternalLink, Layers, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import type { MarketplaceInstallEntry } from '../../../lib/api';
import { Button } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';
import { GithubRepoAvatar } from '../components/GithubRepoAvatar';

export function InstalledTab({
  items,
  canInstall,
  busyId,
  catalogPath,
  scriptPath,
  onCatalogUninstall,
  onCatalogUpdate,
  onGithubUninstall,
  onGithubUpdate,
  onBrowse,
  allowBrowse,
}: {
  items: MarketplaceInstallEntry[];
  canInstall: boolean;
  busyId: string | null;
  catalogPath: (id: string) => string;
  scriptPath: (owner: string, repo: string) => string;
  onCatalogUninstall: (id: string, name: string) => void;
  onCatalogUpdate: (id: string, name: string) => void;
  onGithubUninstall: (id: string, name: string) => void;
  onGithubUpdate: (id: string, name: string) => void;
  onBrowse: () => void;
  allowBrowse: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="ds-card ds-card-body py-12 text-center">
        <Layers className="mx-auto h-8 w-8 text-[var(--muted)]" />
        <h3 className="mt-2.5 text-sm font-semibold">Nothing installed</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Browse the catalog or GitHub to add resources.</p>
        {allowBrowse ? (
          <Button className="mt-3" size="sm" onClick={onBrowse}>
            <TrendingUp className="h-3.5 w-3.5" />
            Browse
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ds-marketplace-installed" role="list" aria-label="Installed resources">
      {items.map((item) => {
        const isGithub = item.source === 'github';
        const busy = isGithub ? busyId === `github:${item.id}` : busyId === `catalog:${item.pluginId}`;
        const detailTo = isGithub
          ? scriptPath(item.githubOwner, item.githubRepo)
          : catalogPath(item.slug);

        return (
          <article key={item.id} className="ds-marketplace-installed__row" role="listitem">
            <div className="ds-marketplace-installed__main">
              {isGithub ? (
                <GithubRepoAvatar owner={item.githubOwner} size="sm" className="shrink-0" />
              ) : (
                <span className="ds-marketplace-installed__mark" aria-hidden>
                  <Layers className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="ds-marketplace-installed__title-row">
                  <Link to={detailTo} className="ds-marketplace-installed__name">
                    {item.name}
                  </Link>
                  <span className="ds-tag ds-tag--muted">{isGithub ? 'GitHub' : 'Catalog'}</span>
                </div>
                <p className="ds-marketplace-installed__meta">
                  {item.installPath} · {item.installedRef}
                </p>
              </div>
            </div>
            <div className="ds-marketplace-installed__actions">
              <Link to={detailTo} className="ds-btn ds-btn--ghost ds-btn--sm" title="Details">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Details</span>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                disabled={!canInstall || busy}
                onClick={() =>
                  isGithub ? onGithubUpdate(item.id, item.name) : onCatalogUpdate(item.pluginId, item.name)
                }
              >
                {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Update</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!canInstall || busy}
                onClick={() =>
                  isGithub ? onGithubUninstall(item.id, item.name) : onCatalogUninstall(item.pluginId, item.name)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
