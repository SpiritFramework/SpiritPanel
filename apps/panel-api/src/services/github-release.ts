import {
  buildGithubHeaders,
  resolveGithubToken,
  type GithubAuthContext,
} from '../lib/github-auth.js';

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
}

function cacheKey(owner: string, repo: string, ref: string, asset?: string | null, scope = 'panel') {
  return `${scope}:${owner}/${repo}@${ref}:${asset ?? ''}`;
}

function predictArchiveFolder(repo: string, tag: string): string {
  const normalized = tag.startsWith('v') ? tag.slice(1) : tag;
  return `${repo}-${normalized}`;
}

/** Direct archive download — avoids GitHub API Accept header requirements. */
function codeloadArchiveUrl(owner: string, repo: string, ref: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/tags/${encodeURIComponent(ref)}`;
}

function isGithubApiUrl(url: string): boolean {
  return url.includes('api.github.com');
}

async function githubFetch<T>(path: string, ctx?: GithubAuthContext): Promise<T> {
  const token = await resolveGithubToken(ctx);
  const res = await fetch(`${GITHUB_API}${path}`, { headers: buildGithubHeaders(token) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface GithubRelease {
  tag_name: string;
  assets?: Array<{ name: string; browser_download_url: string }>;
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

  let tag = ref;
  let downloadUrl: string;

  if (ref === 'latest-release') {
    const release = await githubFetch<GithubRelease>(`/repos/${owner}/${repo}/releases/latest`, ctx);
    tag = release.tag_name;
    const asset = pickAsset(release, assetName);
    if (asset) {
      downloadUrl = asset.browser_download_url;
    } else {
      downloadUrl = codeloadArchiveUrl(owner, repo, tag);
    }
  } else {
    const release = await githubFetch<GithubRelease>(
      `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(ref)}`,
      ctx,
    ).catch(() => null);
    if (release) {
      tag = release.tag_name;
      const asset = pickAsset(release, assetName);
      downloadUrl = asset
        ? asset.browser_download_url
        : codeloadArchiveUrl(owner, repo, tag);
    } else {
      tag = ref;
      downloadUrl = codeloadArchiveUrl(owner, repo, ref);
    }
  }

  const resolved: ResolvedGithubRelease = {
    tag,
    downloadUrl,
    archiveFolderName: predictArchiveFolder(repo, tag),
  };

  releaseCache.set(key, { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
  return resolved;
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
  const res = await fetch(url, {
    headers: await downloadHeaders(url, ctx),
    redirect: 'follow',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Download failed (${res.status}): ${text || res.statusText}`);
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
