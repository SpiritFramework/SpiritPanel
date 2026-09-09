import { compareVersionStatus, type VersionCompareStatus } from '@spirit/shared';
import { buildGithubHeaders } from '../lib/github-auth.js';
import { PANEL_VERSION } from '../lib/product-meta.js';

const GITHUB_API = 'https://api.github.com';
const SPIRIT_PANEL_REPO = process.env.SPIRIT_PANEL_REPO?.trim() || 'SpiritFramework/SpiritPanel';
const CACHE_TTL_MS = 15 * 60 * 1000;

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
}

let cache: { expiresAt: number; latest: Omit<SpiritPanelReleaseInfo, 'installedVersion' | 'status' | 'updateCommand'> } | null =
  null;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

async function fetchLatestRelease(): Promise<Omit<SpiritPanelReleaseInfo, 'installedVersion' | 'status' | 'updateCommand'>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.latest;
  }

  const token = process.env.GITHUB_TOKEN?.trim() || null;
  const res = await fetch(`${GITHUB_API}/repos/${SPIRIT_PANEL_REPO}/releases/latest`, {
    headers: buildGithubHeaders(token),
  });

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

  const data = (await res.json()) as GithubRelease;
  const tagName = data.tag_name?.trim();
  if (!tagName) {
    throw Object.assign(new Error('GitHub release response missing tag_name'), { statusCode: 502 });
  }

  const latest = {
    tagName,
    latestVersion: normalizeTag(tagName),
    releaseUrl: data.html_url || `https://github.com/${SPIRIT_PANEL_REPO}/releases/latest`,
    htmlUrl: `https://github.com/${SPIRIT_PANEL_REPO}`,
    publishedAt: data.published_at ?? null,
  };

  cache = { latest, expiresAt: Date.now() + CACHE_TTL_MS };
  return latest;
}

export async function getSpiritPanelReleaseInfo(): Promise<SpiritPanelReleaseInfo> {
  const installedVersion = normalizeTag(PANEL_VERSION);
  const latest = await fetchLatestRelease();
  const status = compareVersionStatus(installedVersion, latest.latestVersion);

  return {
    installedVersion,
    ...latest,
    status,
    updateCommand:
      'curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh && sudo bash /tmp/spirit.sh update -y',
  };
}
