import { buildGithubHeaders } from '../lib/github-auth.js';

const GITHUB_API = 'https://api.github.com';
const FEATHERWINGS_REPO = 'mythicalltd/featherwings';
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface FeatherWingsReleaseInfo {
  latestVersion: string;
  tagName: string;
  releaseUrl: string;
  publishedAt: string | null;
  htmlUrl: string;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at?: string;
  name?: string;
}

let cache: { expiresAt: number; value: FeatherWingsReleaseInfo } | null = null;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

export async function getFeatherWingsLatestRelease(): Promise<FeatherWingsReleaseInfo> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const token = process.env.GITHUB_TOKEN?.trim() || null;
  const res = await fetch(`${GITHUB_API}/repos/${FEATHERWINGS_REPO}/releases/latest`, {
    headers: buildGithubHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      throw Object.assign(new Error('No FeatherWings releases found on GitHub'), { statusCode: 404 });
    }
    throw Object.assign(
      new Error(`GitHub release lookup failed (${res.status}): ${text || res.statusText}`),
      { statusCode: res.status === 403 || res.status === 429 ? 429 : 502 },
    );
  }

  const data = (await res.json()) as GithubRelease;
  const tagName = data.tag_name?.trim();
  if (!tagName) {
    throw Object.assign(new Error('GitHub release response missing tag_name'), { statusCode: 502 });
  }

  const value: FeatherWingsReleaseInfo = {
        tagName,
        latestVersion: normalizeTag(tagName),
        releaseUrl: data.html_url || `https://github.com/${FEATHERWINGS_REPO}/releases/latest`,
        htmlUrl: `https://github.com/${FEATHERWINGS_REPO}`,
        publishedAt: data.published_at ?? null,
      };

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
