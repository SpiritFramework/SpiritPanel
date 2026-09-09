import { compareVersionStatus, type VersionCompareStatus } from '@spirit/shared';
import { buildGithubHeaders } from '../lib/github-auth.js';
import { PANEL_VERSION } from '../lib/product-meta.js';

const GITHUB_API = 'https://api.github.com';
const SPIRIT_PANEL_REPO = process.env.SPIRIT_PANEL_REPO?.trim() || 'SpiritFramework/SpiritPanel';
/** Short TTL — admins expect Refresh to notice a new GitHub release quickly. */
const CACHE_TTL_MS = 2 * 60 * 1000;

export interface SpiritPanelReleaseInfo {
  installedVersion: string;
  latestVersion: string;
  tagName: string;
  status: VersionCompareStatus;
  releaseUrl: string;
  htmlUrl: string;
  publishedAt: string | null;
  /** Short host update command for admins. */
  updateCommand: string;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

let cache: {
  expiresAt: number;
  latest: Omit<SpiritPanelReleaseInfo, 'installedVersion' | 'status' | 'updateCommand'>;
} | null = null;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

function toLatestInfo(
  data: GithubRelease,
): Omit<SpiritPanelReleaseInfo, 'installedVersion' | 'status' | 'updateCommand'> {
  const tagName = data.tag_name?.trim();
  if (!tagName) {
    throw Object.assign(new Error('GitHub release response missing tag_name'), { statusCode: 502 });
  }
  return {
    tagName,
    latestVersion: normalizeTag(tagName),
    releaseUrl: data.html_url || `https://github.com/${SPIRIT_PANEL_REPO}/releases/latest`,
    htmlUrl: `https://github.com/${SPIRIT_PANEL_REPO}`,
    publishedAt: data.published_at ?? null,
  };
}

async function fetchLatestRelease(
  forceRefresh = false,
): Promise<Omit<SpiritPanelReleaseInfo, 'installedVersion' | 'status' | 'updateCommand'>> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.latest;
  }

  const token = process.env.GITHUB_TOKEN?.trim() || null;
  const headers = buildGithubHeaders(token);

  const res = await fetch(`${GITHUB_API}/repos/${SPIRIT_PANEL_REPO}/releases/latest`, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      throw Object.assign(new Error('No Spirit Panel releases found on GitHub'), { statusCode: 404 });
    }
    throw Object.assign(
      new Error(`GitHub release lookup failed (${res.status}): ${text || res.statusText}`),
      { statusCode: res.status === 403 || res.status === 429 ? 429 : 502 },
    );
  }

  let latest = toLatestInfo((await res.json()) as GithubRelease);

  // Prefer the newest published non-prerelease by published_at when /latest lags.
  try {
    const listRes = await fetch(`${GITHUB_API}/repos/${SPIRIT_PANEL_REPO}/releases?per_page=10`, {
      headers,
    });
    if (listRes.ok) {
      const list = (await listRes.json()) as GithubRelease[];
      const published = list.filter((r) => r.tag_name && !r.draft && !r.prerelease);
      published.sort((a, b) => {
        const aTime = Date.parse(a.published_at ?? '') || 0;
        const bTime = Date.parse(b.published_at ?? '') || 0;
        return bTime - aTime;
      });
      if (published[0]) {
        const fromList = toLatestInfo(published[0]);
        if (compareVersionStatus(latest.latestVersion, fromList.latestVersion) === 'behind') {
          latest = fromList;
        }
      }
    }
  } catch {
    // /latest alone is enough when the list call fails.
  }

  cache = { latest, expiresAt: Date.now() + CACHE_TTL_MS };
  return latest;
}

export async function getSpiritPanelReleaseInfo(opts?: {
  refresh?: boolean;
}): Promise<SpiritPanelReleaseInfo> {
  const installedVersion = normalizeTag(PANEL_VERSION);
  const latest = await fetchLatestRelease(Boolean(opts?.refresh));
  const status = compareVersionStatus(installedVersion, latest.latestVersion);

  return {
    installedVersion,
    ...latest,
    status,
    updateCommand:
      'curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh && sudo bash /tmp/spirit.sh update -y',
  };
}
