import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  HardDrive,
  Package,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api, type MinecraftPluginProjectResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { isMinecraftServer } from '../../lib/server-eggs';
import {
  displayPluginTags,
  formatPluginDownloads,
  formatRelativePluginDate,
} from '../../lib/minecraft-plugin-format';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { Button, Select } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import {
  MarketplaceBackLink,
  MarketplaceEmptyState,
  MarketplacePage,
} from '../../components/marketplace/MarketplaceChrome';
import { PluginMarkdownAbout } from '../../components/marketplace/PluginMarkdownAbout';

export function MinecraftPluginProjectPage() {
  const { slug = '' } = useParams();
  const resolvedId = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);
  const navigate = useNavigate();

  const [data, setData] = useState<MinecraftPluginProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versionId, setVersionId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!resolvedId || !slug || !isMinecraftServer(server)) return;
    setLoading(true);
    setError('');
    api.client
      .pluginsProject(resolvedId, slug)
      .then((res) => {
        setData(res);
        setVersionId(res.versions[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [resolvedId, slug, server]);

  const selected = useMemo(
    () => data?.versions.find((v) => v.id === versionId) ?? data?.versions[0] ?? null,
    [data, versionId],
  );

  const tags = useMemo(
    () => (data ? displayPluginTags(data.project.categories, 6) : []),
    [data],
  );

  const gallery = useMemo(() => {
    const items = data?.project.gallery ?? [];
    const featured = items.find((g) => g.featured);
    const rest = items.filter((g) => g !== featured);
    return [featured, ...rest]
      .filter(Boolean)
      .map((img) => ({
        ...img!,
        url: sanitizeImageSrc(img!.url) ?? '',
      }))
      .filter((img) => img.url)
      .slice(0, 4) as Array<{
      url: string;
      featured: boolean;
      title: string | null;
    }>;
  }, [data]);

  const iconUrl = sanitizeImageSrc(data?.project.iconUrl);

  async function install() {
    if (!data) return;
    setBusy(true);
    try {
      await api.client.pluginsInstall(resolvedId, {
        projectId: data.project.id,
        versionId: selected?.id ?? null,
        installDependencies: true,
      });
      toast.success(`Installed ${data.project.title} — restart the server to load it`);
      const refreshed = await api.client.pluginsProject(resolvedId, slug);
      setData(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setBusy(false);
    }
  }

  async function uninstall() {
    if (!data?.installed) return;
    setBusy(true);
    try {
      await api.client.pluginsUninstall(
        resolvedId,
        data.installed.id,
        data.installed.source === 'disk' ? data.installed.installPath : undefined,
      );
      toast.success('Removed');
      const refreshed = await api.client.pluginsProject(resolvedId, slug);
      setData(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Uninstall failed');
    } finally {
      setBusy(false);
    }
  }

  if (server.minecraftPluginsEnabled === false) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="Plugins disabled" />
      </ServerPage>
    );
  }

  if (!isMinecraftServer(server)) {
    return (
      <ServerPage>
        <MarketplaceEmptyState icon={Package} title="Minecraft only" />
      </ServerPage>
    );
  }

  return (
    <ServerPage>
      <MarketplacePage className="mc-plugins-page">
        <MarketplaceBackLink to="..">Back to plugins</MarketplaceBackLink>

        {error ? <ServerErrorBanner message={error} /> : null}

        {loading || !data ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="mc-project-layout">
            <div className="mc-project-main">
              <header className="mc-project-hero">
                <div className="mc-card-icon mc-card-icon--xl">
                  {iconUrl ? (
                    <img src={iconUrl} alt="" />
                  ) : (
                    <Package className="h-9 w-9" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mc-project-eyebrow">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {data.project.projectType}
                    <span>·</span>
                    {data.platformLabel}
                    {data.gameVersion ? ` · ${data.gameVersion}` : ''}
                  </div>
                  <h1 className="mc-project-title">{data.project.title}</h1>
                  <p className="mc-project-desc">{data.project.description}</p>
                  <div className="mc-project-stats">
                    <span>
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      {formatPluginDownloads(data.project.downloads)} downloads
                    </span>
                    {data.project.followers > 0 ? (
                      <span>{formatPluginDownloads(data.project.followers)} followers</span>
                    ) : null}
                  </div>
                  {tags.length ? (
                    <div className="mc-card-tags mc-card-tags--lg">
                      {tags.map((tag) => (
                        <span key={tag} className="mc-chip">
                          {tag}
                        </span>
                      ))}
                      {data.project.loaders.slice(0, 4).map((loader) => (
                        <span key={loader} className="mc-chip mc-chip--loader">
                          {loader}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </header>

              {gallery.length ? (
                <div className="mc-gallery">
                  {gallery.map((img) => (
                    <a
                      key={img.url}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mc-gallery-item"
                      title={img.title ?? 'Gallery image'}
                    >
                      <img src={img.url} alt={img.title ?? ''} loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : null}

              {data.project.body?.trim() ? <PluginMarkdownAbout body={data.project.body} /> : null}

              {data.versions.length > 1 ? (
                <section className="mc-version-list">
                  <h2 className="mc-section-title">Compatible versions</h2>
                  <div className="mc-version-rows">
                    {data.versions.slice(0, 8).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`mc-version-row${selected?.id === v.id ? ' mc-version-row--active' : ''}`}
                        onClick={() => setVersionId(v.id)}
                      >
                        <span className="mc-version-num">{v.versionNumber}</span>
                        <span className="mc-chip mc-chip--soft">{v.versionType}</span>
                        <span className="mc-version-meta">
                          {v.loaders.slice(0, 3).join(', ')}
                          {v.datePublished ? ` · ${formatRelativePluginDate(v.datePublished)}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="mc-project-aside">
              <div className="mc-project-install">
                <h2 className="mc-section-title">Install</h2>
                <Select
                  label="Version"
                  value={selected?.id ?? ''}
                  onChange={(e) => setVersionId(e.target.value)}
                  disabled={!data.versions.length || busy}
                >
                  {data.versions.length === 0 ? (
                    <option value="">No compatible versions</option>
                  ) : (
                    data.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.versionNumber} ({v.versionType}) — {v.loaders.join(', ')}
                      </option>
                    ))
                  )}
                </Select>

                {selected?.primaryFilename ? (
                  <p className="mc-install-hint">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden />
                    {selected.primaryFilename}
                  </p>
                ) : null}

                <div className="mc-install-actions">
                {data.installed ? (
                  <>
                    <Button
                      type="button"
                      disabled={busy || !access.canInstallMarketplace}
                      onClick={() => void install()}
                    >
                      {busy ? (
                        'Working…'
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                          {data.installed.source === 'disk' ? 'Reinstall from Modrinth' : 'Reinstall / update'}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || !access.canInstallMarketplace}
                      onClick={() => void uninstall()}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {data.installed.source === 'disk' ? 'Remove file' : 'Uninstall'}
                    </Button>
                    <p className="mc-install-status">
                      {data.installed.source === 'disk' ? 'Found on disk' : `Installed ${data.installed.versionNumber}`}
                      <br />
                      <code>{data.installed.installPath}</code>
                    </p>
                  </>
                ) : (
                  <Button
                    type="button"
                    disabled={busy || !selected || !access.canInstallMarketplace}
                    onClick={() => void install()}
                  >
                    {busy ? 'Installing…' : selected?.onDisk ? 'Replace on-disk file' : 'Install'}
                  </Button>
                )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      window.open(
                        `https://modrinth.com/project/${data.project.slug}`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open on Modrinth
                  </Button>
                </div>

                {!access.canInstallMarketplace ? (
                  <p className="mc-install-hint">You need Marketplace / Plugins install permission.</p>
                ) : (
                  <p className="mc-install-hint">Restart the server after installing so it loads the new JAR.</p>
                )}
              </div>

              <Button type="button" variant="secondary" size="sm" onClick={() => navigate('..')}>
                Done
              </Button>
            </aside>
          </div>
        )}
      </MarketplacePage>
    </ServerPage>
  );
}
