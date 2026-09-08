import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useServerRouteId } from '../hooks/useServerRouteId';
import type { GithubSearchSortId } from './api';

export function useMarketplacePaths() {
  const { owner, repo } = useParams<{ owner?: string; repo?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const resolvedId = useServerRouteId();
  const isAdminManage = location.pathname.includes('/admin/servers/');
  const base = isAdminManage
    ? `/admin/servers/${resolvedId}/manage/marketplace`
    : `/servers/${resolvedId}/marketplace`;

  let decodedOwner = owner ? decodeURIComponent(owner) : undefined;
  let decodedRepo = repo ? decodeURIComponent(repo) : undefined;

  // Fallback: /marketplace/script?url=owner/repo
  if (!decodedOwner || !decodedRepo) {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      const parts = urlParam.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/').filter(Boolean);
      if (parts.length >= 2) {
        decodedOwner = decodeURIComponent(parts[0]!);
        decodedRepo = decodeURIComponent(parts[1]!);
      }
    }
  }

  function scriptPath(githubOwner: string, githubRepo: string): string {
    return `${base}/script/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}`;
  }

  function scriptInstallPath(githubOwner: string, githubRepo: string): string {
    return `${scriptPath(githubOwner, githubRepo)}/install`;
  }

  function catalogPath(pluginIdOrSlug: string): string {
    return `${base}/catalog/${encodeURIComponent(pluginIdOrSlug)}`;
  }

  function githubBrowsePath(categoryId?: string): string {
    return categoryId
      ? `${base}/github/browse/${encodeURIComponent(categoryId)}`
      : `${base}/github/browse`;
  }

  function githubSearchPath(query: string, page = 1, sort: GithubSearchSortId = 'best'): string {
    const params = new URLSearchParams({ q: query });
    if (page > 1) params.set('page', String(page));
    if (sort !== 'best') params.set('sort', sort);
    return `${base}/github/search?${params.toString()}`;
  }

  return {
    resolvedId,
    base,
    scriptPath,
    scriptInstallPath,
    catalogPath,
    githubBrowsePath,
    githubSearchPath,
    owner: decodedOwner,
    repo: decodedRepo,
    isAdminManage,
  };
}
export function parseGithubOwnerRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('github.com') || trimmed.startsWith('http')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, '') };
    }
  } catch {
    // fall through
  }

  const slash = trimmed.replace(/^@/, '').split('/');
  if (slash.length === 2 && slash[0] && slash[1]) {
    return { owner: slash[0], repo: slash[1].replace(/\.git$/, '') };
  }

  return null;
}
