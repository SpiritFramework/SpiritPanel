import { Link, useNavigate } from 'react-router-dom';
import {
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
import { Spinner } from '../../../components/ui';
import { MarkdownReadme } from '../../../components/MarkdownReadme';
import { ServerErrorBanner, ServerPage } from '../../../components/server/ServerPage';
import {
  DetailPanel,
  DetailRow,
  HeroStat,
  HeroStatGrid,
  MarketplaceBackLink,
  MarketplaceEmptyState,
  ResourceHero,
  StatusBanner,
} from '../components/Layout';
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
      <div className="ds-page ds-stack">
        <MarketplaceBackLink to={`${base}?tab=github`}>Back to GitHub</MarketplaceBackLink>

        {loading && !resolved ? (
          <ResourceHero
            title={displayName}
            subtitle={`${displayOwner}/${displayRepo}`}
            description={aboutText || undefined}
            icon={
              <GithubRepoAvatar
                owner={displayOwner}
                avatarUrl={preview?.ownerAvatarUrl}
                size="lg"
              />
            }
            actions={<Spinner className="h-7 w-7 shrink-0" />}
          />
        ) : error ? (
          <div className="ds-stack">
            <ServerErrorBanner message={error} />
            <Button type="button" size="sm" variant="secondary" onClick={() => reload()}>
              Retry
            </Button>
          </div>
        ) : resolved ? (
          <>
            <ResourceHero
              eyebrow="GitHub resource"
              title={resolved.name}
              subtitle={`${resolved.owner}/${resolved.repo}`}
              description={aboutText || undefined}
              icon={
                <GithubRepoAvatar
                  owner={resolved.owner}
                  avatarUrl={resolved.ownerAvatarUrl}
                  size="lg"
                />
              }
              badges={
                <>
                  <span className="ds-tag">FiveM</span>
                  {category ? (
                    <span className="ds-tag">{MARKETPLACE_CATEGORY_LABELS[category] ?? category}</span>
                  ) : null}
                  {resolved.language ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: languageAccent(resolved.language) }}
                      />
                      {resolved.language}
                    </span>
                  ) : null}
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]"
                    >
                      {topic}
                    </span>
                  ))}
                </>
              }
              actions={
                <>
                  {installPath ? (
                    <Link to={installPath} className="ds-btn ds-btn--primary ds-btn--sm">
                      <Download className="h-4 w-4" />
                      Install to server
                    </Link>
                  ) : null}
                  {externalGithubUrl ? (
                    <a href={externalGithubUrl} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn--ghost ds-btn--sm">
                      <Github className="h-4 w-4" />
                      GitHub
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </a>
                  ) : null}
                </>
              }
              stats={
                <HeroStatGrid>
                  <HeroStat label="Stars" value={formatStars(resolved.stars)} icon={Star} accent="#fbbf24" />
                  <HeroStat label="Forks" value={formatStars(resolved.forks ?? 0)} icon={GitFork} />
                  <HeroStat label="Issues" value={String(resolved.openIssues ?? 0)} icon={CircleDot} />
                  <HeroStat label="License" value={resolved.license ?? '—'} icon={Scale} />
                  <HeroStat label="Updated" value={updatedLabel} icon={Calendar} />
                  <HeroStat label="Branch" value={resolved.defaultBranch} icon={GitBranch} />
                </HeroStatGrid>
              }
            />

            {resolved.existingInstall ? (
              <StatusBanner
                tone="success"
                title="Already installed on this server"
                detail={`${resolved.existingInstall.installPath} · ${resolved.existingInstall.installedRef}`}
                action={
                  <Button variant="subtle" size="sm" onClick={() => navigate(`${base}?tab=installed`)}>
                    View installed
                  </Button>
                }
              />
            ) : null}

            {!access.canInstallMarketplace && !resolved.existingInstall ? (
              <p className="text-sm text-[var(--muted)]">
                You don&apos;t have permission to install marketplace resources on this server.
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
              <div className="ds-stack min-w-0">
                {resolved.readme ? (
                  <DetailPanel
                    title="Documentation"
                    description="README from the repository"
                    icon={FileText}
                    action={
                      externalGithubUrl ? (
                        <a
                          href={externalGithubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-btn ds-btn--ghost ds-btn--sm"
                        >
                          Open on GitHub
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : undefined
                    }
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownReadme
                        source={resolved.readme}
                        github={{
                          owner: resolved.owner,
                          repo: resolved.repo,
                          branch: resolved.defaultBranch,
                        }}
                      />
                    </div>
                  </DetailPanel>
                ) : resolved.description ? (
                  <DetailPanel title="About this resource" description="Repository description">
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{resolved.description}</p>
                  </DetailPanel>
                ) : null}

                {(resolved.releases ?? []).length > 0 ? (
                  <DetailPanel
                    title="Releases"
                    description={`${(resolved.releases ?? []).length} published version${(resolved.releases ?? []).length === 1 ? '' : 's'}`}
                    icon={Tag}
                  >
                    <ul className="ds-stack ds-stack--tight">
                      {(resolved.releases ?? []).map((release) => (
                        <li
                          key={release.tag}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-[var(--text)]">{release.tag}</p>
                            {release.name && release.name !== release.tag ? (
                              <p className="text-xs text-[var(--muted)]">{release.name}</p>
                            ) : null}
                          </div>
                          {release.prerelease ? <span className="ds-tag">Pre-release</span> : null}
                        </li>
                      ))}
                    </ul>
                  </DetailPanel>
                ) : null}
              </div>

              <aside className="ds-stack min-w-0">
                <DetailPanel
                  title="Repository details"
                  description="Install paths, releases, and metadata"
                  icon={FolderOpen}
                  action={
                    installPath ? (
                      <Link to={installPath} className="ds-btn ds-btn--ghost ds-btn--sm shrink-0">
                        <Download className="h-3.5 w-3.5" />
                        Install
                      </Link>
                    ) : undefined
                  }
                >
                  <DetailRow label="Owner" value={resolved.owner} icon={Github} mono />
                  <DetailRow label="Default branch" value={resolved.defaultBranch} icon={GitBranch} mono />
                  <DetailRow
                    label="Latest release"
                    value={resolved.latestReleaseTag ?? 'No published releases'}
                    icon={Tag}
                    mono={Boolean(resolved.latestReleaseTag)}
                  />
                  <DetailRow
                    label="Suggested path"
                    value={resolved.suggested?.installPath ?? '—'}
                    icon={FolderOpen}
                    mono
                  />
                  <DetailRow label="Created" value={formatDate(resolved.createdAt)} icon={Calendar} />
                  {resolved.homepage ? (
                    <DetailRow
                      label="Homepage"
                      value={formatHomepageLabel(resolved.homepage)}
                      icon={Globe}
                      href={resolved.homepage}
                    />
                  ) : null}
                </DetailPanel>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </ServerPage>
  );
}
