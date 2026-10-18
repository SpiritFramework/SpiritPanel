import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
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
import { sanitizeLinkHref } from '../../../lib/safe-url';
import {
  formatRelativeTime,
  formatStars,
  languageAccent,
  MARKETPLACE_CATEGORY_LABELS,
} from '../../../lib/marketplace-format';
import { useMarketplacePaths } from '../../../lib/marketplace-paths';
import { useMarketplaceScriptResolved } from '../../../hooks/useMarketplaceScriptResolved';
import { useServer } from '../../../context/ServerContext';
import { getServerAccess } from '../../../lib/server-access';
import { isFiveMServer } from '../../../lib/server-eggs';
import { Button } from '../../../components/Layout';
import { Spinner, StatusPill } from '../../../components/ui';
import { MarkdownReadme } from '../../../components/MarkdownReadme';
import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';
import { MarketplaceEmptyState } from '../components/Layout';
import { GithubRepoAvatar } from '../components/GithubRepoAvatar';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatHomepageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}

export function ScriptDetailPage() {
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
  const branches = resolved?.branches?.length
    ? resolved.branches
    : resolved?.defaultBranch
      ? [resolved.defaultBranch]
      : [];

  const updatedLabel =
    resolved?.pushedAt || resolved?.updatedAt
      ? formatRelativeTime(resolved.pushedAt ?? resolved.updatedAt).replace('Updated ', '')
      : '—';

  const installPath =
    resolved && access.canInstallMarketplace && !resolved.existingInstall
      ? scriptInstallPath(resolved.owner, resolved.repo)
      : null;

  const externalGithubUrl = resolved ? sanitizeLinkHref(resolved.githubUrl) : null;
  const statusLabel = resolved?.existingInstall
    ? 'Installed'
    : installPath
      ? 'Ready to install'
      : loading
        ? 'Loading'
        : 'View only';

  return (
    <ServerPage>
      <div className="ds-srv-plugins-shell fm-script-page">
        <header className="ds-srv-plugins-detail-header">
          <div className="ds-srv-plugins-header-accent" aria-hidden />

          <div className="ds-srv-plugins-detail-header-body">
            <Link to={`${base}?tab=github`} className="ds-srv-plugins-detail-back">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to GitHub
            </Link>

            {loading && !resolved ? (
              <div className="ds-srv-plugins-detail-loading">
                <Spinner />
                <p>Loading script…</p>
              </div>
            ) : error && !resolved ? (
              <div className="ds-srv-plugins-detail-loading">
                <ServerErrorBanner message={error} />
                <Button type="button" size="sm" variant="secondary" onClick={() => reload()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="ds-srv-plugins-detail-header-main">
                <div className="ds-srv-plugins-detail-identity">
                  <div className="ds-srv-plugins-detail-icon" aria-hidden>
                    <GithubRepoAvatar
                      owner={displayOwner}
                      avatarUrl={resolved?.ownerAvatarUrl ?? preview?.ownerAvatarUrl}
                      size="lg"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ds-srv-plugins-header-title-row">
                      <h1 className="ds-srv-plugins-detail-title truncate">{displayName}</h1>
                      <StatusPill
                        label={statusLabel}
                        tone={resolved?.existingInstall ? 'success' : installPath ? 'info' : 'neutral'}
                        compact
                      />
                    </div>
                    <p className="ds-srv-plugins-detail-meta truncate">
                      <span className="font-mono">
                        {displayOwner}/{displayRepo}
                      </span>
                      {' · '}
                      GitHub resource
                      {category ? ` · ${MARKETPLACE_CATEGORY_LABELS[category] ?? category}` : ''}
                    </p>
                    {aboutText ? <p className="ds-srv-plugins-detail-desc">{aboutText}</p> : null}
                    <div className="ds-srv-plugins-detail-stats">
                      <span>
                        <Star className="h-3.5 w-3.5" aria-hidden />
                        {formatStars(resolved?.stars ?? preview?.stars ?? 0)} stars
                      </span>
                      <span>
                        <GitFork className="h-3.5 w-3.5" aria-hidden />
                        {formatStars(resolved?.forks ?? 0)} forks
                      </span>
                      <span>
                        <GitBranch className="h-3.5 w-3.5" aria-hidden />
                        {resolved?.defaultBranch ?? '—'}
                        {branches.length > 1 ? ` · ${branches.length} branches` : ''}
                      </span>
                      {resolved?.language ? (
                        <span>
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: languageAccent(resolved.language) }}
                            aria-hidden
                          />
                          {resolved.language}
                        </span>
                      ) : null}
                      <span>
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        Updated {updatedLabel}
                      </span>
                    </div>
                    {topics.length || category ? (
                      <div className="ds-srv-plugins-detail-tags">
                        <span className="mc-chip">FiveM</span>
                        {category ? (
                          <span className="mc-chip">{MARKETPLACE_CATEGORY_LABELS[category] ?? category}</span>
                        ) : null}
                        {topics.slice(0, 8).map((topic) => (
                          <span key={topic} className="mc-chip mc-chip--soft">
                            {topic}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="ds-srv-plugins-detail-header-actions">
                  {installPath ? (
                    <Link to={installPath} className="ds-btn ds-btn--primary ds-btn--sm">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Install
                    </Link>
                  ) : null}
                  {externalGithubUrl ? (
                    <a
                      href={externalGithubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-srv-plugins-action-btn"
                    >
                      <Github className="h-3.5 w-3.5" aria-hidden />
                      <span className="ds-srv-plugins-action-label">GitHub</span>
                      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </header>

        {error && resolved ? (
          <div className="ds-srv-plugins-panel">
            <ServerErrorBanner message={error} />
          </div>
        ) : null}

        {!loading && resolved ? (
          <div className="ds-srv-plugins-detail-body">
            <div className="ds-srv-plugins-detail-main">
              {resolved.existingInstall ? (
                <div className="fm-script-banner">
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

              {resolved.readme ? (
                <section className="fm-panel">
                  <header className="fm-panel-head">
                    <div className="min-w-0">
                      <h2 className="fm-panel-title">
                        <FileText className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                        Documentation
                      </h2>
                      <p className="fm-panel-desc">README from the repository</p>
                    </div>
                    {externalGithubUrl ? (
                      <a
                        href={externalGithubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-btn ds-btn--ghost ds-btn--sm"
                      >
                        Open on GitHub
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </header>
                  <div className="fm-panel-body prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownReadme
                      source={resolved.readme}
                      github={{
                        owner: resolved.owner,
                        repo: resolved.repo,
                        branch: resolved.defaultBranch,
                      }}
                    />
                  </div>
                </section>
              ) : resolved.description ? (
                <section className="fm-panel">
                  <header className="fm-panel-head">
                    <h2 className="fm-panel-title">About this resource</h2>
                  </header>
                  <div className="fm-panel-body">
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{resolved.description}</p>
                  </div>
                </section>
              ) : null}

              {(resolved.releases ?? []).length > 0 ? (
                <section className="ds-srv-plugins-versions">
                  <div className="ds-srv-plugins-versions-head">
                    <h2 className="ds-srv-plugins-versions-title">Releases</h2>
                    <span className="ds-srv-plugins-versions-count">{resolved.releases.length}</span>
                  </div>
                  <div className="ds-srv-plugins-version-rows">
                    {resolved.releases.map((release) => (
                      <div key={release.tag} className="ds-srv-plugins-version-row ds-srv-plugins-version-row--static">
                        <span className="ds-srv-plugins-version-num">{release.tag}</span>
                        {release.prerelease ? <span className="mc-chip mc-chip--soft">Pre-release</span> : null}
                        {release.name && release.name !== release.tag ? (
                          <span className="ds-srv-plugins-version-meta">{release.name}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {branches.length > 1 ? (
                <section className="ds-srv-plugins-versions">
                  <div className="ds-srv-plugins-versions-head">
                    <h2 className="ds-srv-plugins-versions-title">Branches</h2>
                    <span className="ds-srv-plugins-versions-count">{branches.length}</span>
                  </div>
                  <div className="fm-script-branch-chips">
                    {branches.map((branch) => {
                      const isDefault = branch.toLowerCase() === resolved.defaultBranch.toLowerCase();
                      return (
                        <span
                          key={branch}
                          className={`mc-chip${isDefault ? '' : ' mc-chip--soft'}`}
                          title={isDefault ? 'Default branch' : undefined}
                        >
                          <GitBranch className="h-3 w-3" aria-hidden />
                          {branch}
                          {isDefault ? ' · default' : ''}
                        </span>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="ds-srv-plugins-detail-aside">
              <div className="ds-srv-plugins-install">
                <div className="ds-srv-plugins-install-head">
                  <h2 className="ds-srv-plugins-install-title">Install</h2>
                  <StatusPill
                    label={resolved.existingInstall ? 'Installed' : installPath ? 'Ready' : 'Locked'}
                    tone={resolved.existingInstall ? 'success' : installPath ? 'neutral' : 'warning'}
                    compact
                  />
                </div>

                <dl className="fm-script-aside-list">
                  <div>
                    <dt>Suggested path</dt>
                    <dd className="font-mono">{resolved.suggested?.installPath ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Default ref</dt>
                    <dd className="font-mono">{resolved.suggested?.githubRef ?? resolved.defaultBranch}</dd>
                  </div>
                  <div>
                    <dt>Latest release</dt>
                    <dd className="font-mono">{resolved.latestReleaseTag ?? 'None published'}</dd>
                  </div>
                </dl>

                {installPath ? (
                  <Link to={installPath} className="ds-btn ds-btn--primary w-full justify-center">
                    <Download className="h-4 w-4" aria-hidden />
                    Install to server
                  </Link>
                ) : resolved.existingInstall ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate(`${base}?tab=installed`)}
                  >
                    Manage installed
                  </Button>
                ) : null}

                <p className="ds-srv-plugins-install-hint">
                  Choose a release or branch on the next step
                  {branches.length > 1 ? ` (${branches.length} branches available)` : ''}.
                </p>
              </div>

              <section className="fm-panel">
                <header className="fm-panel-head">
                  <h2 className="fm-panel-title">
                    <FolderOpen className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                    Repository
                  </h2>
                </header>
                <div className="fm-panel-body fm-script-aside-rows">
                  <DetailMeta label="Owner" value={resolved.owner} icon={Github} mono />
                  <DetailMeta label="Default branch" value={resolved.defaultBranch} icon={GitBranch} mono />
                  <DetailMeta label="Stars" value={formatStars(resolved.stars)} icon={Star} />
                  <DetailMeta label="Forks" value={formatStars(resolved.forks ?? 0)} icon={GitFork} />
                  <DetailMeta label="Open issues" value={String(resolved.openIssues ?? 0)} icon={CircleDot} />
                  <DetailMeta label="License" value={resolved.license ?? '—'} icon={Scale} />
                  <DetailMeta label="Created" value={formatDate(resolved.createdAt)} icon={Calendar} />
                  {resolved.homepage ? (
                    <DetailMeta
                      label="Homepage"
                      value={formatHomepageLabel(resolved.homepage)}
                      icon={Globe}
                      href={resolved.homepage}
                    />
                  ) : null}
                  <DetailMeta
                    label="Suggested path"
                    value={resolved.suggested?.installPath ?? '—'}
                    icon={FolderOpen}
                    mono
                  />
                  <DetailMeta
                    label="Latest release"
                    value={resolved.latestReleaseTag ?? 'No published releases'}
                    icon={Tag}
                    mono={Boolean(resolved.latestReleaseTag)}
                  />
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </ServerPage>
  );
}

function DetailMeta({
  label,
  value,
  icon: Icon,
  mono,
  href,
}: {
  label: string;
  value: string;
  icon: typeof Github;
  mono?: boolean;
  href?: string;
}) {
  const safeHref = href ? sanitizeLinkHref(href) : null;
  return (
    <div className="fm-detail-row">
      <div className="fm-detail-label">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </div>
      {safeHref ? (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`fm-detail-link${mono ? ' fm-detail-value--mono' : ''}`}
          title={value}
        >
          <span className="min-w-0 truncate">{value}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </a>
      ) : (
        <p className={`fm-detail-value${mono ? ' fm-detail-value--mono' : ''}`} title={value}>
          {value}
        </p>
      )}
    </div>
  );
}
