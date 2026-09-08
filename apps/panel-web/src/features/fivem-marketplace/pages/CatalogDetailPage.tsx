import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Github,
  Package,
  RefreshCw,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import { api, type MarketplaceCatalogDetailResponse } from '../../../lib/api';
import { useServer } from '../../../context/ServerContext';
import { useServerRouteId } from '../../../hooks/useServerRouteId';
import { useToast } from '../../../context/ToastContext';
import { getServerAccess } from '../../../lib/server-access';
import { isFiveMServer } from '../../../lib/server-eggs';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { MARKETPLACE_CATEGORY_LABELS } from '../../../lib/marketplace-format';
import { sanitizeImageSrc, sanitizeLinkHref } from '../../../lib/safe-url';
import { Button } from '../../../components/Layout';
import { Spinner } from '../../../components/ui';
import { MarkdownReadme } from '../../../components/MarkdownReadme';
import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';
import {
  DetailPanel,
  DetailRow,
  MarketplaceBackLink,
  MarketplaceEmptyState,
  ResourceHero,
  StatusBanner,
} from '../components/Layout';

export function CatalogDetailPage() {
  const { pluginId = '' } = useParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);
  const navigate = useNavigate();
  const { base, scriptPath } = useMarketplacePaths();

  const [data, setData] = useState<MarketplaceCatalogDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!resolvedId || !pluginId || !isFiveMServer(server)) return;
    setLoading(true);
    setError('');
    api.client
      .marketplaceCatalogDetail(resolvedId, pluginId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load resource'))
      .finally(() => setLoading(false));
  }, [resolvedId, pluginId, server]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: 'install' | 'uninstall' | 'update') {
    if (!data) return;
    setBusy(true);
    try {
      if (action === 'install') await api.client.marketplaceInstall(resolvedId, data.plugin.id);
      if (action === 'uninstall') await api.client.marketplaceUninstall(resolvedId, data.plugin.id);
      if (action === 'update') await api.client.marketplaceUpdate(resolvedId, data.plugin.id);
      const refreshed = await api.client.marketplaceCatalogDetail(resolvedId, pluginId);
      setData(refreshed);
      toast.success(
        action === 'install'
          ? `Installed ${data.plugin.name}`
          : action === 'update'
            ? `Updated ${data.plugin.name}`
            : `Removed ${data.plugin.name}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
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
        <MarketplaceEmptyState icon={Package} title="FiveM only" description="This page is for FiveM servers." />
      </ServerPage>
    );
  }

  const plugin = data?.plugin;
  const github = data?.github;
  const iconUrl = sanitizeImageSrc(plugin?.iconUrl);
  const githubUrl = plugin ? sanitizeLinkHref(plugin.githubUrl) : null;
  const readme = github?.readme;

  return (
    <ServerPage>
      <div className="ds-page ds-stack">
        <MarketplaceBackLink to={`${base}?tab=catalog`}>Back to host catalog</MarketplaceBackLink>

        {error && plugin ? <ServerErrorBanner message={error} /> : null}

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="h-9 w-9" />
          </div>
        ) : error && !plugin ? (
          <div className="ds-card ds-card-body py-12 text-center">
            <p className="text-sm text-[var(--muted)]">{error}</p>
            <Button className="mt-4" size="sm" variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : !plugin ? (
          <div className="ds-card ds-card-body py-12 text-center text-sm text-[var(--muted)]">Resource not found.</div>
        ) : (
          <>
            <ResourceHero
              eyebrow={
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  Host catalog
                </span>
              }
              title={plugin.name}
              subtitle={`${plugin.githubOwner}/${plugin.githubRepo}`}
              description={plugin.description}
              icon={
                iconUrl ? (
                  <img src={iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <Package className="h-7 w-7" />
                )
              }
              badges={
                <>
                  <span className="ds-tag">{MARKETPLACE_CATEGORY_LABELS[plugin.category] ?? plugin.category}</span>
                  {plugin.featured ? <span className="ds-tag">Featured</span> : null}
                  {plugin.installed ? <span className="ds-tag ds-tag--success">Installed</span> : null}
                  {plugin.tags.map((tag) => (
                    <span key={tag} className="ds-tag ds-tag--muted max-w-full truncate">
                      {tag}
                    </span>
                  ))}
                </>
              }
              actions={
                <>
                  {plugin.installed ? (
                    <>
                      <Button variant="secondary" size="sm" disabled={!access.canInstallMarketplace || busy} onClick={() => void runAction('update')}>
                        {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Update
                      </Button>
                      <Button variant="secondary" size="sm" disabled={!access.canInstallMarketplace || busy} onClick={() => void runAction('uninstall')}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </>
                  ) : access.canInstallMarketplace ? (
                    <Button size="sm" disabled={busy} onClick={() => void runAction('install')}>
                      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                      Install to server
                    </Button>
                  ) : null}
                  {githubUrl ? (
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn--ghost ds-btn--sm">
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  ) : null}
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => navigate(scriptPath(plugin.githubOwner, plugin.githubRepo))}
                  >
                    View source repo
                  </Button>
                </>
              }
            />

            {plugin.installed ? (
              <StatusBanner
                tone="success"
                title="Installed on this server"
                detail={`${plugin.installPath} · ${plugin.cfgResource}`}
                action={
                  <Button variant="subtle" size="sm" onClick={() => navigate(`${base}?tab=installed`)}>
                    View all installed
                  </Button>
                }
              />
            ) : null}

            {!access.canInstallMarketplace && !plugin.installed ? (
              <p className="text-sm text-[var(--muted)]">
                You don&apos;t have permission to install marketplace resources on this server.
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <div className="ds-stack">
                {readme ? (
                  <DetailPanel title="Documentation" description="README from the source repository" icon={FileText}>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownReadme
                        source={readme}
                        github={{
                          owner: plugin.githubOwner,
                          repo: plugin.githubRepo,
                          branch: github?.defaultBranch ?? 'main',
                        }}
                      />
                    </div>
                  </DetailPanel>
                ) : (
                  <DetailPanel title="About this resource" icon={Sparkles}>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{plugin.description}</p>
                  </DetailPanel>
                )}
              </div>

              <aside className="ds-stack">
                <DetailPanel title="Install details" description="How this resource is deployed" icon={FolderOpen}>
                  <DetailRow label="Install path" value={plugin.installPath} icon={FolderOpen} mono />
                  <DetailRow label="server.cfg resource" value={plugin.cfgResource} icon={FileText} mono />
                  <DetailRow label="GitHub ref" value={plugin.githubRef} icon={Github} mono />
                  {github?.stars !== undefined ? (
                    <DetailRow label="GitHub stars" value={String(github.stars)} icon={Sparkles} />
                  ) : null}
                  {github?.license ? (
                    <DetailRow label="License" value={github.license} icon={FileText} />
                  ) : null}
                  {github?.updatedAt ? (
                    <DetailRow
                      label="Last updated"
                      value={new Date(github.updatedAt).toLocaleDateString()}
                      icon={Calendar}
                    />
                  ) : null}
                </DetailPanel>

                {plugin.dependencies.length > 0 ? (
                  <DetailPanel title="Dependencies" description="Installed automatically before this resource">
                    <ul className="ds-stack ds-stack--tight">
                      {plugin.dependencies.map((dep) => (
                        <li key={dep}>
                          <Link
                            to={`${base}/catalog/${encodeURIComponent(dep)}`}
                            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--surface-hover)]"
                          >
                            <CheckCircle2 className="h-4 w-4 text-[var(--muted)]" />
                            {dep}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </DetailPanel>
                ) : null}
              </aside>
            </div>
          </>
        )}
      </div>
    </ServerPage>
  );
}
