import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  CircleDot,
  Download,
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
import { sanitizeLinkHref } from '../../lib/safe-url';
import {
  formatRelativeTime,
  formatStars,
  languageAccent,
  MARKETPLACE_CATEGORY_LABELS,
} from '../../lib/marketplace-format';
import { useMarketplacePaths } from '../../lib/marketplace-paths';
import { useMarketplaceScriptResolved } from '../../hooks/useMarketplaceScriptResolved';
import { useServer } from '../../context/ServerContext';
import { getServerAccess } from '../../lib/server-access';
import { isFiveMServer } from '../../lib/server-eggs';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { MarkdownReadme } from '../../components/MarkdownReadme';
import { ServerErrorBanner, ServerPage } from '../../components/server/ServerPage';
import {
  MarketplaceBackLink,
  MarketplaceEmptyState,
  MarketplacePage,
} from '../../components/marketplace/MarketplaceChrome';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function HeroStat({
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
    <div className="fm-script-stat" role="listitem">
      <span className="fm-script-stat-icon" style={accent ? { color: accent } : undefined}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="fm-script-stat-value">{value}</p>
        <p className="fm-script-stat-label">{label}</p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
  mono,
  accent,
  href,
}: {
  label: string;
  value: string;
  icon: typeof GitBranch;
  mono?: boolean;
  accent?: boolean;
  href?: string;
}) {
  const safeHref = href ? sanitizeLinkHref(href) : null;
  return (
    <div className="fm-detail-row">
      <div className="fm-detail-label">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      {safeHref ? (
        <a href={safeHref} target="_blank" rel="noopener noreferrer" className="fm-detail-link">
          <span className={`fm-detail-value${mono ? ' fm-detail-value--mono' : ''}`}>{value}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </a>
      ) : (
        <p
          className={`fm-detail-value${mono ? ' fm-detail-value--mono' : ''}${accent ? ' fm-detail-value--accent' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function MarketplaceScriptPage() {
  const navigate = useNavigate();
  const { server } = useServer();
  const access = getServerAccess(server);
  const { base, scriptInstallPath } = useMarketplacePaths();
  const { resolved, loading, error, preview, displayName, displayOwner, displayRepo, reload } =
    useMarketplaceScriptResolved();

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

  const aboutText =
    resolved?.featuredBlurb || resolved?.description || preview?.blurb || preview?.description || '';
  const category = resolved?.featuredCategory ?? preview?.category;
  const topics: string[] = resolved?.topics?.length ? resolved.topics : (preview?.topics ?? []);

  const updatedLabel =
    resolved?.pushedAt || resolved?.updatedAt
      ? formatRelativeTime(resolved.pushedAt ?? resolved.updatedAt).replace('Updated ', '')
      : '—';

  const installPath =
    resolved && access.canInstallMarketplace && !resolved.existingInstall
      ? scriptInstallPath(resolved.owner, resolved.repo)
      : null;

  const externalGithubUrl = resolved ? sanitizeLinkHref(resolved.githubUrl) : null;

  return (
    <ServerPage>
      <MarketplacePage>
        <MarketplaceBackLink to={base}>Back to marketplace</MarketplaceBackLink>

        {loading && !resolved ? (
          <header className="fm-script-hero">
            <div className="fm-script-hero-glow" aria-hidden />
            <div className="fm-script-hero-inner">
              <div className="fm-script-hero-top">
                <div className="fm-script-headline">
                  <div className="fm-repo-avatar fm-repo-avatar--lg">
                    <Github className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="fm-script-title">{displayName}</h1>
                    <p className="fm-script-repo">
                      {displayOwner}
                      <span>/</span>
                      {displayRepo}
                    </p>
                    {aboutText ? <p className="fm-script-lead">{aboutText}</p> : null}
                  </div>
                </div>
                <Spinner className="h-7 w-7 shrink-0" />
              </div>
            </div>
          </header>
        ) : error ? (
          <div className="space-y-3">
            <ServerErrorBanner message={error} />
            <Button type="button" size="sm" variant="secondary" onClick={() => reload()}>
              Retry
            </Button>
          </div>
        ) : resolved ? (
          <>
            <header className="fm-script-hero">
              <div className="fm-script-hero-glow" aria-hidden />
              <div className="fm-script-hero-inner">
                <div className="fm-script-hero-top">
                  <div className="min-w-0 flex-1">
                    <div className="fm-script-badges">
                      <span className="fm-chip fm-chip--fivem">FiveM</span>
                      {category ? (
                        <span className="fm-chip fm-chip--cat fm-chip--cat-script">
                          {MARKETPLACE_CATEGORY_LABELS[category] ?? category}
                        </span>
                      ) : null}
                      {resolved.language ? (
                        <span className="fm-chip">
                          <span
                            className="fm-repo-lang-dot mr-1 inline-block align-middle"
                            style={{ background: languageAccent(resolved.language) }}
                          />
                          {resolved.language}
                        </span>
                      ) : null}
                    </div>

                    <div className="fm-script-headline">
                      <div className="fm-repo-avatar fm-repo-avatar--lg">
                        <Github className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="fm-script-title">{resolved.name}</h1>
                        <p className="fm-script-repo">
                          {resolved.owner}
                          <span>/</span>
                          {resolved.repo}
                        </p>
                        {aboutText ? <p className="fm-script-lead">{aboutText}</p> : null}
                      </div>
                    </div>

                    {topics.length > 0 ? (
                      <div className="fm-script-topics">
                        {topics.map((topic) => (
                          <span key={topic} className="fm-chip">
                            {topic}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="fm-script-actions">
                    {installPath ? (
                      <Link to={installPath} className="fm-btn-primary">
                        <Download className="h-4 w-4" aria-hidden />
                        Install to server
                      </Link>
                    ) : null}
                    {externalGithubUrl ? (
                      <a
                        href={externalGithubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fm-btn-ghost"
                      >
                        <Github className="h-4 w-4" aria-hidden />
                        GitHub
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="fm-script-stats" role="list">
                  <HeroStat label="Stars" value={formatStars(resolved.stars)} icon={Star} accent="#fbbf24" />
                  <HeroStat label="Forks" value={formatStars(resolved.forks ?? 0)} icon={GitFork} />
                  <HeroStat label="Issues" value={String(resolved.openIssues ?? 0)} icon={CircleDot} />
                  <HeroStat label="License" value={resolved.license ?? '—'} icon={Scale} />
                  <HeroStat label="Updated" value={updatedLabel} icon={Calendar} />
                  <HeroStat label="Branch" value={resolved.defaultBranch} icon={GitBranch} />
                </div>
              </div>
            </header>

            {resolved.existingInstall ? (
              <div className="fm-script-banner">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="fm-script-banner-title">Already installed on this server</p>
                  <p className="fm-script-banner-path">
                    {resolved.existingInstall.installPath} · {resolved.existingInstall.installedRef}
                  </p>
                </div>
                <Button variant="subtle" size="sm" onClick={() => navigate(`${base}?tab=installed`)}>
                  View installed
                </Button>
              </div>
            ) : null}

            {!access.canInstallMarketplace && !resolved.existingInstall ? (
              <p className="fm-script-permission">
                You don&apos;t have permission to install marketplace resources on this server.
              </p>
            ) : null}

            <div className="fm-script-content">
              {resolved.readme ? (
                <section className="fm-panel">
                  <header className="fm-panel-head">
                    <div>
                      <h2 className="fm-panel-title">
                        <FileText className="h-4 w-4" aria-hidden />
                        Documentation
                      </h2>
                      <p className="fm-panel-desc">README from the repository</p>
                    </div>
                    {externalGithubUrl ? (
                      <a
                        href={externalGithubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fm-panel-link"
                      >
                        Open on GitHub
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </header>
                  <div className="fm-panel-body fm-panel-body--readme">
                    <div className="fm-readme">
                      <MarkdownReadme
                        source={resolved.readme}
                        github={{
                          owner: resolved.owner,
                          repo: resolved.repo,
                          branch: resolved.defaultBranch,
                        }}
                      />
                    </div>
                  </div>
                </section>
              ) : resolved.description ? (
                <section className="fm-panel">
                  <header className="fm-panel-head">
                    <div>
                      <h2 className="fm-panel-title">About this resource</h2>
                      <p className="fm-panel-desc">Repository description</p>
                    </div>
                  </header>
                  <div className="fm-panel-body">
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{resolved.description}</p>
                  </div>
                </section>
              ) : null}

              <section className="fm-panel">
                <header className="fm-panel-head">
                  <div>
                    <h2 className="fm-panel-title">
                      <FolderOpen className="h-4 w-4" aria-hidden />
                      Repository details
                    </h2>
                    <p className="fm-panel-desc">Install paths, releases, and metadata</p>
                  </div>
                  {installPath ? (
                    <Link to={installPath} className="fm-panel-link">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Install this script
                    </Link>
                  ) : null}
                </header>
                <div className="fm-panel-body">
                  <div className="fm-detail-grid">
                    <DetailRow label="Owner" value={resolved.owner} icon={Github} mono />
                    <DetailRow label="Default branch" value={resolved.defaultBranch} icon={GitBranch} mono />
                    <DetailRow
                      label="Latest release"
                      value={resolved.latestReleaseTag ?? 'No published releases'}
                      icon={Tag}
                      mono
                    />
                    <DetailRow
                      label="Install path"
                      value={resolved.suggested?.installPath ?? '—'}
                      icon={FolderOpen}
                      mono
                      accent
                    />
                    <DetailRow label="Created" value={formatDate(resolved.createdAt)} icon={Calendar} />
                    {resolved.homepage ? (
                      <DetailRow
                        label="Homepage"
                        value={resolved.homepage}
                        icon={Globe}
                        href={resolved.homepage}
                      />
                    ) : null}
                  </div>
                </div>
              </section>

              {(resolved.releases ?? []).length > 0 ? (
                <section className="fm-panel">
                  <header className="fm-panel-head">
                    <div>
                      <h2 className="fm-panel-title">
                        <Tag className="h-4 w-4" aria-hidden />
                        Releases
                      </h2>
                      <p className="fm-panel-desc">
                        {(resolved.releases ?? []).length} published version
                        {(resolved.releases ?? []).length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </header>
                  <div className="fm-panel-body">
                    <ul className="fm-releases">
                      {(resolved.releases ?? []).map((release) => (
                        <li key={release.tag} className="fm-release">
                          <div className="min-w-0">
                            <p className="fm-release-tag">{release.tag}</p>
                            {release.name && release.name !== release.tag ? (
                              <p className="fm-release-name">{release.name}</p>
                            ) : null}
                          </div>
                          {release.prerelease ? <span className="fm-chip">Pre-release</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </MarketplacePage>
    </ServerPage>
  );
}
