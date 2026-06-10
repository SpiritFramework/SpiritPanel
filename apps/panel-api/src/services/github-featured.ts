import type { GithubSearchResult } from './github-repo.js';
import { buildGithubHeaders, resolveGithubToken, type GithubAuthContext } from '../lib/github-auth.js';

const GITHUB_API = 'https://api.github.com';
const FEATURED_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FEATURED_PLACEHOLDER_TTL_MS = 45 * 1000;
const FEATURED_FETCH_CONCURRENCY = 6;

interface FeaturedRepo {
  owner: string;
  repo: string;
  category: 'library' | 'framework' | 'script' | 'voice' | 'ui' | 'jobs';
  blurb?: string;
}

/** Curated high-quality FiveM resources — shown on Discover so the marketplace never feels empty. */
export const FEATURED_FIVEM_REPOS: FeaturedRepo[] = [
  { owner: 'CommunityOx', repo: 'ox_lib', category: 'library', blurb: 'UI, callbacks & shared utilities' },
  { owner: 'CommunityOx', repo: 'oxmysql', category: 'library', blurb: 'MySQL driver for modern frameworks' },
  { owner: 'AvarianKnight', repo: 'pma-voice', category: 'voice', blurb: 'Proximity voice & radio' },
  { owner: 'qbcore-framework', repo: 'qb-core', category: 'framework', blurb: 'QBCore framework' },
  { owner: 'esx-framework', repo: 'esx_core', category: 'framework', blurb: 'ESX Legacy core' },
  { owner: 'CommunityOx', repo: 'ox_inventory', category: 'script', blurb: 'Slot-based inventory system' },
  { owner: 'CommunityOx', repo: 'ox_target', category: 'script', blurb: 'Third-eye targeting' },
  { owner: 'CommunityOx', repo: 'ox_doorlock', category: 'script', blurb: 'Door locks & access' },
  { owner: 'CommunityOx', repo: 'ox_fuel', category: 'script', blurb: 'Fuel stations script' },
  { owner: 'CommunityOx', repo: 'ox_banking', category: 'script', blurb: 'Banking UI & accounts' },
  { owner: 'Project-Sloth', repo: 'ps-dispatch', category: 'script', blurb: 'Police dispatch UI' },
  { owner: 'Project-Sloth', repo: 'ps-mdt', category: 'script', blurb: 'Police MDT tablet' },
  { owner: 'Project-Sloth', repo: 'ps-housing', category: 'script', blurb: 'Player housing system' },
  { owner: 'Project-Sloth', repo: 'ps-hud', category: 'ui', blurb: 'Clean HUD for QBCore' },
  { owner: 'Project-Sloth', repo: 'ps-ui', category: 'ui', blurb: 'UI components library' },
  { owner: 'Project-Sloth', repo: 'ps-camera', category: 'script', blurb: 'Camera script' },
  { owner: 'iLLeniumStudios', repo: 'illenium-appearance', category: 'ui', blurb: 'Character customization' },
  { owner: 'wasabirobby', repo: 'wasabi_police', category: 'jobs', blurb: 'Standalone police job' },
  { owner: 'wasabirobby', repo: 'wasabi_ambulance', category: 'jobs', blurb: 'Standalone EMS job' },
  { owner: 'wasabirobby', repo: 'wasabi_carlock', category: 'script', blurb: 'Vehicle lock system' },
  { owner: 'jimathy', repo: 'jim-mechanic', category: 'jobs', blurb: 'Mechanic job script' },
  { owner: 'Loaf-scripts', repo: 'loaf_lib', category: 'library', blurb: 'Loaf script library' },
  { owner: 'Loaf-scripts', repo: 'loaf_housing', category: 'script', blurb: 'Housing system' },
  { owner: 'CodineDev', repo: 'cdn-fuel', category: 'script', blurb: 'Fuel system' },
  { owner: 'renzuzu', repo: 'renzu_multicharacter', category: 'script', blurb: 'Multi-character select' },
  { owner: 'qbcore-framework', repo: 'qb-policejob', category: 'jobs', blurb: 'Police job for QBCore' },
  { owner: 'qbcore-framework', repo: 'qb-ambulancejob', category: 'jobs', blurb: 'EMS job for QBCore' },
  { owner: 'qbcore-framework', repo: 'qb-garages', category: 'script', blurb: 'Garage system for QBCore' },
  { owner: 'qbcore-framework', repo: 'qb-houses', category: 'script', blurb: 'Housing for QBCore' },
  { owner: 'qbcore-framework', repo: 'qb-vehicleshop', category: 'script', blurb: 'Vehicle dealership' },
  { owner: 'qbcore-framework', repo: 'qb-radialmenu', category: 'ui', blurb: 'Radial interaction menu' },
  { owner: 'qbcore-framework', repo: 'qb-smallresources', category: 'script', blurb: 'Handy small utilities' },
  { owner: 'qbcore-framework', repo: 'qb-weathersync', category: 'script', blurb: 'Weather & time sync' },
  { owner: 'qbcore-framework', repo: 'qb-management', category: 'script', blurb: 'Boss menu & society funds' },
  { owner: 'esx-framework', repo: 'esx_identity', category: 'script', blurb: 'Character identity creation' },
  { owner: 'esx-framework', repo: 'esx_multicharacter', category: 'script', blurb: 'Multi-character select' },
  { owner: 'esx-framework', repo: 'esx_banking', category: 'script', blurb: 'Banking for ESX' },
  { owner: 'esx-framework', repo: 'esx_garage', category: 'script', blurb: 'Garages for ESX' },
  { owner: 'ESX-Org', repo: 'esx_policejob', category: 'jobs', blurb: 'Police job for ESX' },
  { owner: 'ESX-Org', repo: 'esx_ambulancejob', category: 'jobs', blurb: 'EMS job for ESX' },
  { owner: 'BerkieBb', repo: 'cdev_lib', category: 'library', blurb: 'cdev resource library' },
];

export const GITHUB_SEARCH_CATEGORIES = [
  { id: 'all', label: 'All scripts', query: 'fivem' },
  { id: 'libraries', label: 'Libraries', query: 'fivem library ox_lib' },
  { id: 'frameworks', label: 'Frameworks', query: 'fivem framework esx qbcore' },
  { id: 'inventory', label: 'Inventory', query: 'fivem inventory ox' },
  { id: 'voice', label: 'Voice', query: 'fivem voice pma' },
  { id: 'housing', label: 'Housing', query: 'fivem housing property' },
  { id: 'jobs', label: 'Jobs', query: 'fivem job police ems' },
  { id: 'ui', label: 'UI / HUD', query: 'fivem hud ui nui' },
] as const;

export type GithubSearchCategoryId = (typeof GITHUB_SEARCH_CATEGORIES)[number]['id'];

type FeaturedItem = GithubSearchResult & { category: string; blurb: string };

let featuredCache: { expiresAt: number; items: FeaturedItem[] } | null = null;
let featuredRefreshPromise: Promise<void> | null = null;

function fallbackFeatured(entry: FeaturedRepo): FeaturedItem {
  return {
    owner: entry.owner,
    repo: entry.repo,
    name: entry.repo,
    description: entry.blurb ?? '',
    stars: 0,
    forks: 0,
    language: 'Lua',
    updatedAt: new Date().toISOString(),
    pushedAt: null,
    topics: ['fivem'],
    githubUrl: `https://github.com/${entry.owner}/${entry.repo}`,
    category: entry.category,
    blurb: entry.blurb ?? '',
  };
}

function instantFeaturedList(): FeaturedItem[] {
  return FEATURED_FIVEM_REPOS.map(fallbackFeatured);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchFeaturedFromGithub(ctx?: GithubAuthContext): Promise<FeaturedItem[]> {
  const token = await resolveGithubToken(ctx);

  const items = await mapWithConcurrency(FEATURED_FIVEM_REPOS, FEATURED_FETCH_CONCURRENCY, async (entry) => {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${entry.owner}/${entry.repo}`, {
        headers: buildGithubHeaders(token),
      });
      if (!res.ok) return fallbackFeatured(entry);

      const data = (await res.json()) as {
        name: string;
        description: string | null;
        stargazers_count: number;
        forks_count: number;
        language: string | null;
        updated_at: string;
        pushed_at?: string;
        topics?: string[];
        html_url: string;
      };

      return {
        owner: entry.owner,
        repo: entry.repo,
        name: data.name,
        description: data.description ?? entry.blurb ?? '',
        stars: data.stargazers_count,
        forks: data.forks_count ?? 0,
        language: data.language,
        updatedAt: data.updated_at,
        pushedAt: data.pushed_at ?? null,
        topics: data.topics?.length ? data.topics : ['fivem'],
        githubUrl: data.html_url,
        category: entry.category,
        blurb: entry.blurb ?? data.description ?? '',
      };
    } catch {
      return fallbackFeatured(entry);
    }
  });

  return items.sort((a, b) => b.stars - a.stars);
}

function scheduleFeaturedRefresh(ctx?: GithubAuthContext) {
  if (featuredRefreshPromise) return;
  featuredRefreshPromise = (async () => {
    try {
      const items = await fetchFeaturedFromGithub(ctx);
      featuredCache = { expiresAt: Date.now() + FEATURED_CACHE_TTL_MS, items };
    } catch {
      // Keep serving placeholder/stale data on refresh failure.
    } finally {
      featuredRefreshPromise = null;
    }
  })();
}

export async function getFeaturedFivemScripts(ctx?: GithubAuthContext): Promise<FeaturedItem[]> {
  if (featuredCache && featuredCache.expiresAt > Date.now()) {
    return featuredCache.items;
  }

  if (!featuredCache) {
    featuredCache = {
      expiresAt: Date.now() + FEATURED_PLACEHOLDER_TTL_MS,
      items: instantFeaturedList(),
    };
    scheduleFeaturedRefresh(ctx);
    return featuredCache.items;
  }

  scheduleFeaturedRefresh(ctx);
  return featuredCache.items;
}

export function getFeaturedRepoMeta(
  owner: string,
  repo: string,
): { category: string; blurb: string } | null {
  const entry = FEATURED_FIVEM_REPOS.find(
    (e) => e.owner.toLowerCase() === owner.toLowerCase() && e.repo.toLowerCase() === repo.toLowerCase(),
  );
  if (!entry) return null;
  return { category: entry.category, blurb: entry.blurb ?? '' };
}

export function categorySearchQuery(categoryId: GithubSearchCategoryId, userQuery: string): string {
  const cat = GITHUB_SEARCH_CATEGORIES.find((c) => c.id === categoryId) ?? GITHUB_SEARCH_CATEGORIES[0];
  const q = userQuery.trim();
  if (!q) return `${cat.query} stars:>10`;
  return `${q} ${cat.query}`;
}
