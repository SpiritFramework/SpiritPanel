import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  HardDrive,
  Package,
  RefreshCw,
  RotateCcw,
  Users,
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
import { Spinner, StatusPill } from '../../components/ui';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceChrome';
import { PluginMarkdownAbout } from '../../components/marketplace/PluginMarkdownAbout';

function versionOptionLabel(v: {
  versionNumber: string;
  versionType: string;
  loaders: string[];
}): string {
  const loaders = v.loaders.filter(Boolean).slice(0, 3).join(', ');
  const type = v.versionType?.trim();
  const bits = [v.versionNumber];
  if (type) bits.push(type);
  if (loaders) bits.push(loaders);
  return bits.join(' · ');
}

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

  const statusLabel = data?.installed
    ? data.installed.source === 'disk'
      ? 'On disk'
      : `Installed v${data.installed.versionNumber || '?'}`
    : 'Not installed';

  return (
    <ServerPage>
      <div className="ds-srv-plugins-shell mc-plugins-page">
        <header className="ds-srv-plugins-detail-header">
          <div className="ds-srv-plugins-header-accent" aria-hidden />

          <div className="ds-srv-plugins-detail-header-body">
            <Link to=".." className="ds-srv-plugins-detail-back">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to catalog
            </Link>

            {loading || !data ? (
              <div className="ds-srv-plugins-detail-loading">
                <Spinner />
                <p>Loading project…</p>
              </div>
            ) : (
              <div className="ds-srv-plugins-detail-header-main">
                <div className="ds-srv-plugins-detail-identity">
                  <div className="ds-srv-plugins-detail-icon" aria-hidden>
                    {iconUrl ? (
                      <img src={iconUrl} alt="" />
                    ) : (
                      <Package className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ds-srv-plugins-header-title-row">
                      <h1 className="ds-srv-plugins-detail-title truncate">{data.project.title}</h1>
                      <StatusPill
                        label={statusLabel}
                        tone={data.installed ? 'success' : 'neutral'}
                        compact
                      />
                    </div>
                    <p className="ds-srv-plugins-detail-meta truncate">
                      {data.project.projectType
                        ? data.project.projectType.charAt(0).toUpperCase() + data.project.projectType.slice(1)
                        : 'Project'}
                      {' · '}
                      {data.platformLabel}
                      {data.gameVersion ? ` · ${data.gameVersion}` : ''}
                      {' · '}
                      Modrinth
                    </p>
                    <p className="ds-srv-plugins-detail-desc">{data.project.description}</p>
                    <div className="ds-srv-plugins-detail-stats">
                      <span>
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        {formatPluginDownloads(data.project.downloads)} downloads
                      </span>
                      {data.project.followers > 0 ? (
                        <span>
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {formatPluginDownloads(data.project.followers)} followers
                        </span>
                      ) : null}
                    </div>
                    {tags.length || data.project.loaders.length ? (
                      <div className="ds-srv-plugins-detail-tags">
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
                </div>

                <div className="ds-srv-plugins-detail-header-actions">
                  <button
                    type="button"
                    className="ds-srv-plugins-action-btn"
                    onClick={() =>
                      window.open(
                        `https://modrinth.com/project/${data.project.slug}`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    <span className="ds-srv-plugins-action-label">Modrinth</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {error ? (
          <div className="ds-srv-plugins-panel">
            <ServerErrorBanner message={error} />
          </div>
        ) : null}

        {!loading && data ? (
          <div className="ds-srv-plugins-detail-body">
            <div className="ds-srv-plugins-detail-main">
              {gallery.length ? (
                <div className="ds-srv-plugins-gallery">
                  {gallery.map((img) => (
                    <a
                      key={img.url}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ds-srv-plugins-gallery-item"
                      title={img.title ?? 'Gallery image'}
                    >
                      <img src={img.url} alt={img.title ?? ''} loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : null}

              {data.project.body?.trim() ? <PluginMarkdownAbout body={data.project.body} /> : null}

              {data.versions.length > 1 ? (
                <section className="ds-srv-plugins-versions">
                  <div className="ds-srv-plugins-versions-head">
                    <h2 className="ds-srv-plugins-versions-title">Compatible versions</h2>
                    <span className="ds-srv-plugins-versions-count">{data.versions.length}</span>
                  </div>
                  <div className="ds-srv-plugins-version-rows">
                    {data.versions.slice(0, 8).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`ds-srv-plugins-version-row${selected?.id === v.id ? ' ds-srv-plugins-version-row--active' : ''}`}
                        onClick={() => setVersionId(v.id)}
                      >
                        <span className="ds-srv-plugins-version-num">{v.versionNumber}</span>
                        <span className="mc-chip mc-chip--soft">{v.versionType}</span>
                        <span className="ds-srv-plugins-version-meta">
                          {v.loaders.filter(Boolean).slice(0, 3).join(', ') || '—'}
                          {v.datePublished ? ` · ${formatRelativePluginDate(v.datePublished)}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="ds-srv-plugins-detail-aside">
              <div className="ds-srv-plugins-install">
                <div className="ds-srv-plugins-install-head">
                  <h2 className="ds-srv-plugins-install-title">Install</h2>
                  {data.installed ? (
                    <StatusPill
                      label={data.installed.source === 'disk' ? 'On disk' : 'Installed'}
                      tone="success"
                      compact
                    />
                  ) : (
                    <StatusPill label="Ready" tone="neutral" compact />
                  )}
                </div>

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
                        {versionOptionLabel(v)}
                      </option>
                    ))
                  )}
                </Select>

                {selected?.primaryFilename ? (
                  <p className="ds-srv-plugins-install-file">
                    <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{selected.primaryFilename}</span>
                  </p>
                ) : null}

                <div className="ds-srv-plugins-install-actions">
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
                            {data.installed.source === 'disk'
                              ? 'Reinstall from Modrinth'
                              : 'Reinstall / update'}
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
                      <p className="ds-srv-plugins-install-status">
                        {data.installed.source === 'disk'
                          ? 'Found on disk'
                          : `Installed ${data.installed.versionNumber}`}
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
                </div>

                {!access.canInstallMarketplace ? (
                  <p className="ds-srv-plugins-install-hint">
                    You need Marketplace / Plugins install permission.
                  </p>
                ) : (
                  <p className="ds-srv-plugins-install-hint">
                    Restart the server after installing so it loads the new file.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="ds-srv-plugins-action-btn ds-srv-plugins-detail-done"
                onClick={() => navigate('..')}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Back to catalog
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </ServerPage>
  );
}
