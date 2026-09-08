import {
  buildGithubHeaders,
  resolveGithubToken,
  type GithubAuthContext,
} from '../lib/github-auth.js';
import { githubHttpError, httpStatusFromUnknown } from '../lib/github-errors.js';

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 150 * 1024 * 1024;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const releaseCache = new Map<string, CacheEntry<ResolvedGithubRelease>>();

export interface ResolvedGithubRelease {
  tag: string;
  downloadUrl: string;
  archiveFolderName: string;
  source: 'release' | 'branch';
}

function cacheKey(owner: string, repo: string, ref: string, asset?: string | null, scope = 'panel') {
  return `${scope}:${owner}/${repo}@${ref}:${asset ?? ''}`;
}

export function codeloadTagArchiveUrl(owner: string, repo: string, tag: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/tags/${encodeURIComponent(tag)}`;
}

export function codeloadBranchArchiveUrl(owner: string, repo: string, branch: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
}

export function predictArchiveFolder(repo: string, ref: string): string {
  const normalized = ref.startsWith('v') ? ref.slice(1) : ref;
  return `${repo}-${normalized}`;
}

const ALLOWED_GITHUB_DOWNLOAD_HOSTS = new Set([
  'codeload.github.com',
  'github.com',
  'www.github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

export function isAllowedGithubDownloadHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_GITHUB_DOWNLOAD_HOSTS.has(host)) return true;
  return host.endsWith('.githubusercontent.com');
}

/** Reject non-GitHub download URLs (SSRF mitigation). */
export function sanitizeGithubDownloadUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return fallback;
    if (parsed.username || parsed.password) return fallback;
    if (!isAllowedGithubDownloadHost(parsed.hostname)) return fallback;
    return url;
  } catch {
    return fallback;
  }
}

function isGithubApiUrl(url: string): boolean {
  return url.includes('api.github.com');
}

async function githubFetch<T>(path: string, ctx?: GithubAuthContext): Promise<T> {
  const token = await resolveGithubToken(ctx);
  const res = await fetch(`${GITHUB_API}${path}`, { headers: buildGithubHeaders(token) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw githubHttpError(res.status, text);
  }
  return res.json() as Promise<T>;
}

interface GithubRelease {
  tag_name: string;
  prerelease?: boolean;
  assets?: Array<{ name: string; browser_download_url: string }>;
}

async function fetchDefaultBranch(owner: string, repo: string, ctx?: GithubAuthContext): Promise<string> {
  const data = await githubFetch<{ default_branch?: string }>(`/repos/${owner}/${repo}`, ctx);
  return data.default_branch?.trim() || 'main';
}

function pickAsset(release: GithubRelease, assetName?: string | null) {
  const assets = release.assets ?? [];
  if (assets.length === 0) return null;
  if (assetName) {
    const match = assets.find((a) => a.name === assetName);
    if (match) return match;
  }
  return assets.find((a) => a.name.endsWith('.zip')) ?? assets[0];
}

function resolveFromRelease(
  owner: string,
  repo: string,
  release: GithubRelease,
  assetName?: string | null,
): ResolvedGithubRelease {
  const tag = release.tag_name;
  const asset = pickAsset(release, assetName);
  const downloadUrl = asset
    ? sanitizeGithubDownloadUrl(asset.browser_download_url, codeloadTagArchiveUrl(owner, repo, tag))
    : codeloadTagArchiveUrl(owner, repo, tag);

  return {
    tag,
    downloadUrl,
    archiveFolderName: predictArchiveFolder(repo, tag),
    source: 'release',
  };
}

async function resolveLatestRelease(
  owner: string,
  repo: string,
  assetName: string | null | undefined,
  ctx?: GithubAuthContext,
): Promise<ResolvedGithubRelease> {
  try {
    const release = await githubFetch<GithubRelease>(`/repos/${owner}/${repo}/releases/latest`, ctx);
    return resolveFromRelease(owner, repo, release, assetName);
  } catch (err) {
    if (httpStatusFromUnknown(err) !== 404) throw err;
  }

  const releases = await githubFetch<GithubRelease[]>(
    `/repos/${owner}/${repo}/releases?per_page=10`,
    ctx,
  ).catch(() => [] as GithubRelease[]);

  const stable = releases.find((release) => !release.prerelease) ?? releases[0];
  if (stable) {
    return resolveFromRelease(owner, repo, stable, assetName);
  }

  const branch = await fetchDefaultBranch(owner, repo, ctx);
  return {
    tag: branch,
    downloadUrl: codeloadBranchArchiveUrl(owner, repo, branch),
    archiveFolderName: predictArchiveFolder(repo, branch),
    source: 'branch',
  };
}

async function resolveExplicitRef(
  owner: string,
  repo: string,
  ref: string,
  assetName: string | null | undefined,
  ctx?: GithubAuthContext,
): Promise<ResolvedGithubRelease> {
  const release = await githubFetch<GithubRelease>(
    `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(ref)}`,
    ctx,
  ).catch(() => null);

  if (release) {
    return resolveFromRelease(owner, repo, release, assetName);
  }

  let branch: string | null = null;
  try {
    branch = await fetchDefaultBranch(owner, repo, ctx);
  } catch {
    branch = null;
  }

  if (branch && branch.toLowerCase() === ref.toLowerCase()) {
    return {
      tag: branch,
      downloadUrl: codeloadBranchArchiveUrl(owner, repo, branch),
      archiveFolderName: predictArchiveFolder(repo, branch),
      source: 'branch',
    };
  }

  return {
    tag: ref,
    downloadUrl: codeloadTagArchiveUrl(owner, repo, ref),
    archiveFolderName: predictArchiveFolder(repo, ref),
    source: 'release',
  };
}

export async function resolveGithubRelease(
  owner: string,
  repo: string,
  ref: string,
  assetName?: string | null,
  ctx?: GithubAuthContext,
): Promise<ResolvedGithubRelease> {
  const scope = ctx?.userId ?? 'panel';
  const key = cacheKey(owner, repo, ref, assetName, scope);
  const cached = releaseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const resolved =
    ref === 'latest-release'
      ? await resolveLatestRelease(owner, repo, assetName, ctx)
      : await resolveExplicitRef(owner, repo, ref, assetName, ctx);

  releaseCache.set(key, { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
  return resolved;
}

async function downloadHeaders(url: string, ctx?: GithubAuthContext): Promise<Record<string, string>> {
  const token = await resolveGithubToken(ctx);
  const headers: Record<string, string> = {
    'User-Agent': 'Spirit-Panel-Marketplace',
  };

  if (isGithubApiUrl(url)) {
    headers.Accept = 'application/vnd.github+json';
    if (token) headers.Authorization = `Bearer ${token}`;
  } else {
    headers.Accept = '*/*';
  }

  return headers;
}

export async function downloadGithubArchive(url: string, ctx?: GithubAuthContext): Promise<Buffer> {
  const safeUrl = sanitizeGithubDownloadUrl(url, '');
  if (!safeUrl) {
    throw new Error('Download URL is not allowed');
  }

  const res = await fetch(safeUrl, {
    headers: await downloadHeaders(safeUrl, ctx),
    redirect: 'follow',
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw Object.assign(new Error('GitHub archive not found for that version — try another tag or branch.'), {
        statusCode: 404,
      });
    }
    throw new Error(`Download failed (${res.status})`);
  }

  const finalUrl = res.url || safeUrl;
  const validatedFinal = sanitizeGithubDownloadUrl(finalUrl, '');
  if (!validatedFinal) {
    throw new Error('Download redirect target is not allowed');
  }

  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Archive exceeds maximum size (${Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024)} MiB)`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Archive exceeds maximum size (${Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024)} MiB)`);
  }
  return Buffer.from(arrayBuffer);
}
