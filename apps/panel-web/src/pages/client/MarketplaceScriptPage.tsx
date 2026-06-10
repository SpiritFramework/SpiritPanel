import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import {

  ArrowLeft,

  Calendar,

  CheckCircle2,

  CircleDot,

  ExternalLink,

  FileText,

  FolderOpen,

  GitBranch,

  GitFork,

  Github,

  Globe,

  Package,

  Scale,

  Star,

  Tag,

} from 'lucide-react';

import { api, type GithubRepoResolved } from '../../lib/api';
import {
  getMarketplaceCache,
  marketplaceCacheKey,
  setMarketplaceCache,
} from '../../lib/marketplace-cache';

import {

  formatRelativeTime,

  formatStars,

  languageAccent,

  MARKETPLACE_CATEGORY_LABELS,

} from '../../lib/marketplace-format';

import { useMarketplacePaths } from '../../lib/marketplace-paths';

import type { MarketplaceScriptLocationState } from '../../lib/marketplace-script-state';

import { useServer } from '../../context/ServerContext';

import { useToast } from '../../context/ToastContext';

import { getServerAccess } from '../../lib/server-access';

import { isFiveMServer } from '../../lib/server-eggs';

import { Button } from '../../components/Layout';

import { Spinner } from '../../components/ui';

import { MarkdownReadme } from '../../components/MarkdownReadme';

import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';

import { MarketplaceScriptInstallPanel } from './MarketplaceScriptInstallPanel';



function formatDate(iso: string | undefined): string {

  if (!iso) return '—';

  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

}



function StatTile({

  label,

  value,

  icon: Icon,

  accent,

}: {

  label: string;

  value: string;

  icon: typeof Star;

  accent?: string;

}) {

  return (

    <div className="mp-script-stat-tile">

      <span className="mp-script-stat-tile-icon" style={accent ? { color: accent } : undefined}>

        <Icon className="h-4 w-4" />

      </span>

      <div className="min-w-0">

        <p className="mp-script-stat-tile-value">{value}</p>

        <p className="mp-script-stat-tile-label">{label}</p>

      </div>

    </div>

  );

}



export function MarketplaceScriptPage() {

  const navigate = useNavigate();

  const location = useLocation();

  const toast = useToast();

  const { server } = useServer();

  const access = getServerAccess(server);

  const { resolvedId, base, owner, repo } = useMarketplacePaths();

  const preview = (location.state as MarketplaceScriptLocationState | null)?.preview;



  const [resolved, setResolved] = useState<GithubRepoResolved | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');



  const load = useCallback(async () => {

    if (!resolvedId || !owner || !repo) {

      setError('Invalid script URL');

      setLoading(false);

      return;

    }



    setLoading(true);

    setError('');



    try {
      const cacheKey = marketplaceCacheKey(resolvedId, 'resolve', owner, repo);
      const cached = getMarketplaceCache<GithubRepoResolved>(cacheKey);
      const repoData =
        cached ?? (await api.client.marketplaceGithubResolve(resolvedId, `${owner}/${repo}`));

      if (!cached) {
        setMarketplaceCache(cacheKey, repoData, 10 * 60 * 1000);
      }

      setResolved(repoData);
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Could not load script');

      setResolved(null);

    } finally {

      setLoading(false);

    }

  }, [resolvedId, owner, repo]);



  useEffect(() => {

    void load();

  }, [load]);



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



  const displayName = resolved?.name ?? preview?.name ?? repo ?? 'Script';

  const displayOwner = resolved?.owner ?? preview?.owner ?? owner ?? '';

  const displayRepo = resolved?.repo ?? preview?.repo ?? repo ?? '';

  const aboutText =

    resolved?.featuredBlurb ||

    resolved?.description ||

    preview?.blurb ||

    preview?.description ||

    '';

  const category = resolved?.featuredCategory ?? preview?.category;

  const topics = resolved?.topics?.length ? resolved.topics : preview?.topics ?? [];



  return (

    <ServerPage>

      <div className="mp-shell mp-script-shell">

        <Link to={base} className="mp-script-back">

          <ArrowLeft className="h-4 w-4" />

          Back to marketplace

        </Link>



        {loading && !resolved ? (

          <div className="mp-script-loading">

            <header className="mp-script-hero mp-script-hero--loading">

              <div className="mp-hero-glow" />

              <div className="mp-repo-avatar mp-repo-avatar--lg">

                <Github className="h-5 w-5" />

              </div>

              <div className="min-w-0 flex-1">

                <h1 className="mp-script-hero-title">{displayName}</h1>

                <p className="mp-script-hero-slug">

                  {displayOwner}<span>/</span>{displayRepo}

                </p>

                {aboutText && <p className="mp-script-hero-desc">{aboutText}</p>}

              </div>

              <Spinner className="h-6 w-6 text-white/80" />

            </header>

          </div>

        ) : error ? (

          <ServerErrorBanner message={error} />

        ) : resolved ? (

          <>

            <header className="mp-script-hero">

              <div className="mp-hero-glow" />

              <div className="mp-script-hero-grid">

                <div>

                  <div className="mp-script-hero-badges">

                    <span className="mp-topic-chip mp-topic-chip--fivem">FiveM</span>

                    {category && (

                      <span className="mp-cat-badge mp-cat-script">

                        {MARKETPLACE_CATEGORY_LABELS[category] ?? category}

                      </span>

                    )}

                    {resolved.language && (

                      <span className="mp-script-lang-pill">

                        <span

                          className="mp-repo-lang-dot"

                          style={{ background: languageAccent(resolved.language) }}

                        />

                        {resolved.language}

                      </span>

                    )}

                  </div>

                  <div className="mp-script-hero-main">

                    <div className="mp-repo-avatar mp-repo-avatar--lg">

                      <Github className="h-5 w-5" />

                    </div>

                    <div className="min-w-0 flex-1">

                      <h1 className="mp-script-hero-title">{resolved.name}</h1>

                      <p className="mp-script-hero-slug">

                        {resolved.owner}<span>/</span>{resolved.repo}

                      </p>

                      {aboutText && <p className="mp-script-hero-desc">{aboutText}</p>}

                    </div>

                  </div>

                  <div className="mp-script-hero-tags">

                    {(topics.slice(0, 5) ?? []).map((topic) => (

                      <span key={topic} className="mp-topic-chip">

                        {topic}

                      </span>

                    ))}

                  </div>

                </div>

                <div className="mp-script-hero-summary">

                  <div className="mp-script-summary-card">

                    <div className="mp-script-summary-heading">

                      <p className="mp-script-summary-title">Resource snapshot</p>

                      <p className="mp-script-summary-subtitle">Quick install details</p>

                    </div>

                    <dl className="mp-script-summary-list">

                      <div className="mp-script-summary-item">

                        <dt>Owner</dt>

                        <dd>{resolved.owner}</dd>

                      </div>

                      <div className="mp-script-summary-item">

                        <dt>Default branch</dt>

                        <dd>{resolved.defaultBranch}</dd>

                      </div>

                      <div className="mp-script-summary-item">

                        <dt>Latest release</dt>

                        <dd>{resolved.latestReleaseTag ?? 'None'}</dd>

                      </div>

                      <div className="mp-script-summary-item">

                        <dt>Install path</dt>

                        <dd>{resolved.suggested?.installPath ?? 'Standard resources path'}</dd>

                      </div>

                    </dl>

                  </div>

                  <div className="mp-script-stat-grid mp-script-summary-stats">

                    <StatTile label="Stars" value={formatStars(resolved.stars)} icon={Star} accent="#fbbf24" />

                    <StatTile label="Forks" value={formatStars(resolved.forks ?? 0)} icon={GitFork} />

                    <StatTile label="Issues" value={String(resolved.openIssues ?? 0)} icon={CircleDot} />

                  </div>

                  <a

                    href={resolved.githubUrl}

                    target="_blank"

                    rel="noreferrer"

                    className="mp-script-github-btn mp-script-github-btn--hero"

                  >

                    <Github className="h-4 w-4" />

                    View on GitHub

                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />

                  </a>

                </div>

              </div>



              <div className="mp-script-stat-strip">

                <StatTile label="License" value={resolved.license ?? '—'} icon={Scale} />

                <StatTile

                  label="Updated"

                  value={

                    resolved.pushedAt || resolved.updatedAt

                      ? formatRelativeTime(resolved.pushedAt ?? resolved.updatedAt).replace('Updated ', '')

                      : '—'

                  }

                  icon={Calendar}

                />

              </div>

            </header>



            {resolved.existingInstall && (

              <div className="mp-script-installed-banner">

                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />

                <div className="min-w-0 flex-1">

                  <p className="text-sm font-medium text-emerald-300">Already installed on this server</p>

                  <p className="font-mono text-[11px] text-[var(--muted)]">

                    {resolved.existingInstall.installPath} · {resolved.existingInstall.installedRef}

                  </p>

                </div>

                <Button variant="subtle" size="sm" onClick={() => navigate(`${base}?tab=installed`)}>

                  View installed

                </Button>

              </div>

            )}



            <div className="mp-script-body">

              <div className="mp-script-body-main">

                {resolved.readme ? (

                  <section className="mp-script-panel mp-script-panel--readme">

                    <div className="mp-script-panel-header">

                      <h2 className="mp-script-panel-title">

                        <FileText className="h-4 w-4" />

                        Documentation

                      </h2>

                      <a

                        href={resolved.githubUrl}

                        target="_blank"

                        rel="noreferrer"

                        className="mp-script-panel-link"

                      >

                        View on GitHub

                        <ExternalLink className="h-3 w-3" />

                      </a>

                    </div>

                    <div className="mp-readme">

                      <MarkdownReadme source={resolved.readme} />

                    </div>

                  </section>

                ) : resolved.description ? (

                  <section className="mp-script-panel">

                    <h2 className="mp-script-panel-title">About this resource</h2>

                    <p className="mp-script-about-text">{resolved.description}</p>

                  </section>

                ) : null}



                <div className="mp-script-info-grid">
                  <section className="mp-script-panel">
                    <h2 className="mp-script-panel-title">
                      <FolderOpen className="h-4 w-4" />
                      Repository details
                    </h2>
                    <ul className="mp-script-release-list">
                      <li className="mp-script-release-item">
                        <div className="mp-script-meta-label">
                          <GitBranch className="h-3.5 w-3.5" aria-hidden />
                          Default branch
                        </div>
                        <span className="mp-script-meta-value font-mono">{resolved.defaultBranch}</span>
                      </li>
                      <li className="mp-script-release-item">
                        <div className="mp-script-meta-label">
                          <Tag className="h-3.5 w-3.5" aria-hidden />
                          Latest release
                        </div>
                        <span className="mp-script-meta-value font-mono">
                          {resolved.latestReleaseTag ?? 'No published releases'}
                        </span>
                      </li>
                      <li className="mp-script-release-item">
                        <div className="mp-script-meta-label">
                          <Calendar className="h-3.5 w-3.5" aria-hidden />
                          Created
                        </div>
                        <span className="mp-script-meta-value">{formatDate(resolved.createdAt)}</span>
                      </li>
                      <li className="mp-script-release-item">
                        <div className="mp-script-meta-label">
                          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                          Install path
                        </div>
                        <span className="mp-script-meta-value font-mono text-[var(--accent)]">
                          {resolved.suggested?.installPath ?? '—'}
                        </span>
                      </li>
                      {resolved.homepage && (
                        <li className="mp-script-release-item">
                          <div className="mp-script-meta-label">
                            <Globe className="h-3.5 w-3.5" aria-hidden />
                            Homepage
                          </div>
                          <a
                            href={resolved.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="mp-script-meta-link"
                          >
                            {resolved.homepage}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        </li>
                      )}
                    </ul>
                  </section>

                  {(resolved.releases ?? []).length > 0 && (

                    <section className="mp-script-panel">

                      <h2 className="mp-script-panel-title">

                        <Tag className="h-4 w-4" />

                        Releases

                      </h2>

                      <ul className="mp-script-release-list">

                        {(resolved.releases ?? []).map((r) => (

                          <li key={r.tag} className="mp-script-release-item">

                            <div className="min-w-0">

                              <p className="font-mono text-sm font-medium">{r.tag}</p>

                              {r.name && r.name !== r.tag && (

                                <p className="text-xs text-[var(--muted)]">{r.name}</p>

                              )}

                            </div>

                            {r.prerelease && <span className="mp-topic-chip">Pre-release</span>}

                          </li>

                        ))}

                      </ul>

                    </section>

                  )}



                  {topics.length > 0 && (

                    <section className="mp-script-panel">

                      <h2 className="mp-script-panel-title">Topics</h2>

                      <div className="mp-script-topics">

                        {topics.map((t) => (

                          <span key={t} className="mp-topic-chip">

                            {t}

                          </span>

                        ))}

                      </div>

                    </section>

                  )}

                </div>

              </div>



              <aside className="mp-script-body-aside">

                <MarketplaceScriptInstallPanel

                  serverId={resolvedId}

                  resolved={resolved}

                  serverLayout={resolved.layout ?? null}

                  canInstall={access.canInstallMarketplace}

                  onInstalled={handleInstalled}

                />

              </aside>

            </div>

          </>

        ) : null}

      </div>

    </ServerPage>

  );

}

