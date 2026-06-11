import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
    <div className="mp-script-stat">
      <span className="mp-script-stat-icon" style={accent ? { color: accent } : undefined}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="mp-script-stat-body">
        <p className="mp-script-stat-value">{value}</p>
        <p className="mp-script-stat-label">{label}</p>
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
  return (
    <div className="mp-script-detail-row">
      <div className="mp-script-detail-label">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mp-script-detail-link">
          <span className="mp-script-detail-value">{value}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </a>
      ) : (
        <p
          className={`mp-script-detail-value${mono ? ' mp-script-detail-value--mono' : ''}${accent ? ' mp-script-detail-value--accent' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function ScriptHeroSkeleton({
  displayName,
  displayOwner,
  displayRepo,
  aboutText,
}: {
  displayName: string;
  displayOwner: string;
  displayRepo: string;
  aboutText: string;
}) {
  return (
    <header className="mp-script-hero mp-script-hero--loading">
      <div className="mp-hero-glow" aria-hidden />
      <div className="mp-script-hero-top">
        <div className="mp-repo-avatar mp-repo-avatar--lg">
          <Github className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mp-script-hero-name">{displayName}</h1>
          <p className="mp-script-hero-repo">
            {displayOwner}
            <span>/</span>
            {displayRepo}
          </p>
          {aboutText ? <p className="mp-script-hero-lead">{aboutText}</p> : null}
        </div>
        <Spinner className="h-7 w-7 shrink-0 text-white/70" />
      </div>
    </header>
  );
}

export function MarketplaceScriptPage() {
  const navigate = useNavigate();
  const { server } = useServer();
  const access = getServerAccess(server);
  const { base, scriptInstallPath } = useMarketplacePaths();
  const {
    resolved,
    loading,
    error,
    preview,
    displayName,
    displayOwner,
    displayRepo,
  } = useMarketplaceScriptResolved();

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

  return (
    <ServerPage>
      <div className="mp-shell mp-script-shell">
        <Link to={base} className="mp-script-back">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to marketplace
        </Link>

        {loading && !resolved ? (
          <ScriptHeroSkeleton
            displayName={displayName}
            displayOwner={displayOwner}
            displayRepo={displayRepo}
            aboutText={aboutText}
          />
        ) : error ? (
          <ServerErrorBanner message={error} />
        ) : resolved ? (
          <>
            <header className="mp-script-hero">
              <div className="mp-hero-glow" aria-hidden />
              <div className="mp-script-hero-top">
                <div className="mp-script-hero-identity">
                  <div className="mp-script-hero-badges">
                    <span className="mp-topic-chip mp-topic-chip--fivem">FiveM</span>
                    {category ? (
                      <span className="mp-cat-badge mp-cat-script">
                        {MARKETPLACE_CATEGORY_LABELS[category] ?? category}
                      </span>
                    ) : null}
                    {resolved.language ? (
                      <span className="mp-script-lang-pill">
                        <span
                          className="mp-repo-lang-dot"
                          style={{ background: languageAccent(resolved.language) }}
                        />
                        {resolved.language}
                      </span>
                    ) : null}
                  </div>

                  <div className="mp-script-hero-headline">
                    <div className="mp-repo-avatar mp-repo-avatar--lg">
                      <Github className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="mp-script-hero-name">{resolved.name}</h1>
                      <p className="mp-script-hero-repo">
                        {resolved.owner}
                        <span>/</span>
                        {resolved.repo}
                      </p>
                      {aboutText ? <p className="mp-script-hero-lead">{aboutText}</p> : null}
                    </div>
                  </div>

                  {topics.length > 0 ? (
                    <div className="mp-script-hero-topics">
                      {topics.map((topic) => (
                        <span key={topic} className="mp-topic-chip">
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mp-script-hero-actions">
                  {installPath ? (
                    <Link to={installPath} className="mp-script-install-btn">
                      <Download className="h-4 w-4" aria-hidden />
                      Install to server
                    </Link>
                  ) : null}
                  <a
                    href={resolved.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mp-script-github-btn"
                  >
                    <Github className="h-4 w-4" aria-hidden />
                    View on GitHub
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  </a>
                </div>
              </div>

              <div className="mp-script-hero-stats" role="list">
                <HeroStat label="Stars" value={formatStars(resolved.stars)} icon={Star} accent="#fbbf24" />
                <HeroStat label="Forks" value={formatStars(resolved.forks ?? 0)} icon={GitFork} />
                <HeroStat label="Open issues" value={String(resolved.openIssues ?? 0)} icon={CircleDot} />
                <HeroStat label="License" value={resolved.license ?? '—'} icon={Scale} />
                <HeroStat label="Last updated" value={updatedLabel} icon={Calendar} />
                <HeroStat label="Default branch" value={resolved.defaultBranch} icon={GitBranch} />
              </div>
            </header>

            {resolved.existingInstall ? (
              <div className="mp-script-installed-banner">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="mp-script-installed-title">Already installed on this server</p>
                  <p className="mp-script-installed-path">
                    {resolved.existingInstall.installPath} · {resolved.existingInstall.installedRef}
                  </p>
                </div>
                <Button variant="subtle" size="sm" onClick={() => navigate(`${base}?tab=installed`)}>
                  View installed
                </Button>
              </div>
            ) : null}

            {!access.canInstallMarketplace && !resolved.existingInstall ? (
              <p className="mp-script-install-unavailable">
                You don&apos;t have permission to install marketplace resources on this server.
              </p>
            ) : null}

            <div className="mp-script-main mp-script-main--full">
              {resolved.readme ? (
                <section className="mp-script-section mp-script-section--readme">
                  <header className="mp-script-section-head">
                    <div>
                      <h2 className="mp-script-section-title">
                          <FileText className="h-4 w-4" aria-hidden />
                        Documentation
                      </h2>
                      <p className="mp-script-section-desc">README from the repository</p>
                    </div>
                    <a
                      href={resolved.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mp-script-section-link"
                    >
                      Open on GitHub
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </header>
                  <div className="mp-script-readme">
                    <MarkdownReadme source={resolved.readme} />
                  </div>
                </section>
              ) : resolved.description ? (
                <section className="mp-script-section">
                  <header className="mp-script-section-head">
                    <div>
                      <h2 className="mp-script-section-title">About this resource</h2>
                      <p className="mp-script-section-desc">Repository description</p>
                    </div>
                  </header>
                  <p className="mp-script-about">{resolved.description}</p>
                </section>
              ) : null}

              <section className="mp-script-section">
                <header className="mp-script-section-head">
                  <div>
                    <h2 className="mp-script-section-title">
                        <FolderOpen className="h-4 w-4" aria-hidden />
                      Repository details
                    </h2>
                    <p className="mp-script-section-desc">Install paths, releases, and metadata</p>
                  </div>
                  {installPath ? (
                    <Link to={installPath} className="mp-script-section-link">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Install this script
                    </Link>
                  ) : null}
                </header>

                <div className="mp-script-detail-grid">
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
              </section>

              {(resolved.releases ?? []).length > 0 ? (
                <section className="mp-script-section">
                  <header className="mp-script-section-head">
                    <div>
                      <h2 className="mp-script-section-title">
                          <Tag className="h-4 w-4" aria-hidden />
                        Releases
                      </h2>
                      <p className="mp-script-section-desc">
                        {(resolved.releases ?? []).length} published version
                        {(resolved.releases ?? []).length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </header>
                  <ul className="mp-script-releases">
                    {(resolved.releases ?? []).map((release) => (
                      <li key={release.tag} className="mp-script-release">
                        <div className="min-w-0">
                          <p className="mp-script-release-tag">{release.tag}</p>
                          {release.name && release.name !== release.tag ? (
                            <p className="mp-script-release-name">{release.name}</p>
                          ) : null}
                        </div>
                        {release.prerelease ? <span className="mp-topic-chip">Pre-release</span> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </ServerPage>
  );
}
