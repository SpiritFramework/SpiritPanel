import { resolveGithubRelease } from './github-release.js';
import { getFeaturedFivemScripts } from './github-featured.js';
import {
  buildGithubHeaders,
  resolveGithubToken,
  type GithubAuthContext,
} from '../lib/github-auth.js';
import { assertSafeGithubName } from '../lib/marketplace-safety.js';
import { githubHttpError, httpStatusFromUnknown } from '../lib/github-errors.js';

const GITHUB_API = 'https://api.github.com';
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const RESOLVE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 400;

/** Archived CommunityOx forks → active Overextended upstream. */
const REPO_ALIASES: Record<string, { owner: string; repo: string }> = {
  'communityox/ox_lib': { owner: 'overextended', repo: 'ox_lib' },
  'communityox/oxmysql': { owner: 'overextended', repo: 'oxmysql' },
  'communityox/ox_inventory': { owner: 'overextended', repo: 'ox_inventory' },
  'communityox/ox_target': { owner: 'overextended', repo: 'ox_target' },
  'communityox/ox_doorlock': { owner: 'overextended', repo: 'ox_doorlock' },
  'communityox/ox_fuel': { owner: 'overextended', repo: 'ox_fuel' },
  'communityox/ox_banking': { owner: 'overextended', repo: 'ox_banking' },
};

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
  totalCount?: number;
  totalPages?: number;
}

const searchCache = new Map<string, CacheEntry<GithubSearchResult[]>>();
const resolveCache = new Map<string, CacheEntry<GithubRepoResolved>>();

function purgeMap<T>(map: Map<string, CacheEntry<T>>) {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expiresAt <= now) map.delete(key);
  }
  while (map.size >= MAX_CACHE_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest == null) break;
    map.delete(oldest);
  }
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

export interface ParsedGithubRepo {
  owner: string;
  repo: string;
}

function applyRepoAlias(owner: string, repo: string): ParsedGithubRepo {
  const alias = REPO_ALIASES[`${owner.toLowerCase()}/${repo.toLowerCase()}`];
  return alias ?? { owner, repo };
}

/** Resolve owner/repo through rename aliases and GitHub canonical casing. */
export async function canonicalGithubRepo(
  owner: string,
  repo: string,
  ctx?: GithubAuthContext,
): Promise<ParsedGithubRepo> {
  const aliased = applyRepoAlias(owner.trim(), repo.trim());
  const attempts: ParsedGithubRepo[] = [
    aliased,
    { owner: aliased.owner.toLowerCase(), repo: aliased.repo },
    { owner: aliased.owner, repo: aliased.repo.toLowerCase() },
    { owner: aliased.owner.toLowerCase(), repo: aliased.repo.toLowerCase() },
  ];

  const seen = new Set<string>();
  let lastError: unknown;

  for (const attempt of attempts) {
    const key = `${attempt.owner}/${attempt.repo}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const data = await githubFetch<{ full_name: string }>(`/repos/${attempt.owner}/${attempt.repo}`, ctx);
      const [canonicalOwner, canonicalRepo] = data.full_name.split('/');
      if (!canonicalOwner || !canonicalRepo) {
        throw githubHttpError(404, '');
      }
      return { owner: canonicalOwner, repo: canonicalRepo };
    } catch (err) {
      lastError = err;
      if (httpStatusFromUnknown(err, 0) !== 404) throw err;
    }
  }

  throw lastError instanceof Error ? lastError : githubHttpError(404, '');
}

/** Parse owner/repo, full URLs, or github.com links. */
export function parseGithubRepoInput(input: string): ParsedGithubRepo {
  const trimmed = input.trim();
  if (!trimmed) throw Object.assign(new Error('Enter a GitHub repository URL or owner/repo'), { statusCode: 400 });

  let owner: string;
  let repo: string;

  try {
    if (trimmed.includes('github.com')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const host = url.hostname.toLowerCase();
      if (host !== 'github.com' && host !== 'www.github.com') {
        throw Object.assign(new Error('Invalid GitHub URL'), { statusCode: 400 });
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 2) throw Object.assign(new Error('Invalid GitHub URL'), { statusCode: 400 });
      owner = parts[0]!;
      repo = parts[1]!.replace(/\.git$/, '');
    } else {
      const slash = trimmed.replace(/^@/, '').split('/');
      if (slash.length !== 2 || !slash[0] || !slash[1]) {
        throw Object.assign(new Error('Use owner/repo or a full GitHub URL'), { statusCode: 400 });
      }
      owner = slash[0];
      repo = slash[1].replace(/\.git$/, '');
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw Object.assign(new Error('Use owner/repo or a full GitHub URL'), { statusCode: 400 });
    }
    throw err;
  }

  const safeOwner = assertSafeGithubName(owner, 'GitHub owner');
  const safeRepo = assertSafeGithubName(repo, 'GitHub repository');
  return applyRepoAlias(safeOwner, safeRepo);
}

export function suggestInstallPath(repo: string, resourcesPath = '/resources'): string {
  const base = resourcesPath.replace(/\/$/, '') || '/resources';
  return `${base}/${repo}`;
}

export function suggestCfgResource(installPath: string, repo: string): string {
  const parts = installPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && !last.startsWith('[')) return last;
  return repo;
}

interface GithubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
  language: string | null;
  topics?: string[];
  homepage: string | null;
  license: { spdx_id: string | null; name: string } | null;
  created_at: string;
  updated_at: string;
  pushed_at?: string;
  html_url: string;
  private: boolean;
  owner?: {
    login?: string;
    avatar_url?: string;
  };
}

interface GithubReadmeResponse {
  content: string;
  encoding: string;
}

interface GithubReleaseListItem {
  tag_name: string;
  name: string;
  prerelease: boolean;
}

export interface GithubRepoResolved {
  owner: string;
  repo: string;
  ownerAvatarUrl: string | null;
  name: string;
  description: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  readme: string | null;
  githubUrl: string;
  isPrivate: boolean;
  releases: Array<{ tag: string; name: string; prerelease: boolean }>;
  latestReleaseTag: string | null;
  featuredBlurb?: string | null;
  featuredCategory?: string | null;
  suggested: {
    installPath: string;
    cfgResource: string;
    cfgAction: 'ensure';
    cfgFile: string;
    githubRef: string;
    patchCfg: boolean;
  };
}

const README_MAX_CHARS = 16_000;

async function fetchRepoReadme(owner: string, repo: string, ctx?: GithubAuthContext): Promise<string | null> {
  try {
    const data = await githubFetch<GithubReadmeResponse>(`/repos/${owner}/${repo}/readme`, ctx);
    const raw =
      data.encoding === 'base64'
        ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
        : data.content;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.length > README_MAX_CHARS ? `${trimmed.slice(0, README_MAX_CHARS)}\n\n…` : trimmed;
  } catch {
    return null;
  }
}

export async function resolveGithubRepo(input: string, ctx?: GithubAuthContext): Promise<GithubRepoResolved> {
  const parsed = parseGithubRepoInput(input);
  const { owner, repo } = await canonicalGithubRepo(parsed.owner, parsed.repo, ctx);
  // Public repos share one cache — avoids per-user GitHub stampedes.
  const cacheKey = `public:${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = resolveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  async function loadRepo(repoOwner: string, repoName: string) {
    const data = await githubFetch<GithubRepoResponse>(`/repos/${repoOwner}/${repoName}`, ctx);
    if (data.private) {
      throw Object.assign(new Error('Only public GitHub repositories are supported'), { statusCode: 400 });
    }

    const [releasesResult, readme, latestReleaseResult] = await Promise.all([
      githubFetch<GithubReleaseListItem[]>(`/repos/${repoOwner}/${repoName}/releases?per_page=10`, ctx).catch(
        () => [] as GithubReleaseListItem[],
      ),
      fetchRepoReadme(repoOwner, repoName, ctx),
      resolveGithubRelease(repoOwner, repoName, 'latest-release', null, ctx).catch(() => null),
    ]);

    const releases = releasesResult;
    const latestReleaseTag = latestReleaseResult?.tag ?? releases[0]?.tag_name ?? null;
    const installPath = suggestInstallPath(repoName);

    return {
      owner: repoOwner,
      repo: repoName,
      ownerAvatarUrl: data.owner?.avatar_url?.trim() || null,
      name: data.name,
      description: data.description ?? '',
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      watchers: data.subscribers_count ?? 0,
      language: data.language,
      topics: data.topics ?? [],
      license: data.license?.spdx_id ?? data.license?.name ?? null,
      homepage: data.homepage?.trim() || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at ?? null,
      readme,
      githubUrl: data.html_url,
      isPrivate: data.private,
      releases: releases.map((r) => ({ tag: r.tag_name, name: r.name, prerelease: r.prerelease })),
      latestReleaseTag,
      suggested: {
        installPath,
        cfgResource: suggestCfgResource(installPath, repoName),
        cfgAction: 'ensure' as const,
        cfgFile: '/server.cfg',
        githubRef: 'latest-release',
        patchCfg: true,
      },
    };
  }

  const resolved = await loadRepo(owner, repo);
  purgeMap(resolveCache);
  resolveCache.set(cacheKey, { value: resolved, expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS });
  return resolved;
}

export interface GithubSearchResult {
  owner: string;
  repo: string;
  ownerAvatarUrl: string | null;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  pushedAt: string | null;
  topics: string[];
  githubUrl: string;
}

interface GithubSearchApiItem {
  full_name: string;
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  pushed_at?: string;
  topics?: string[];
  html_url: string;
  owner?: {
    login?: string;
    avatar_url?: string;
  };
}

function mapSearchItem(item: GithubSearchApiItem): GithubSearchResult {
  const [owner, repo] = item.full_name.split('/');
  const aliased = applyRepoAlias(owner!, repo!);
  return {
    owner: aliased.owner,
    repo: aliased.repo,
    ownerAvatarUrl: item.owner?.avatar_url?.trim() || null,
    name: item.name,
    description: item.description ?? '',
    stars: item.stargazers_count,
    forks: item.forks_count ?? 0,
    language: item.language,
    updatedAt: item.updated_at,
    pushedAt: item.pushed_at ?? null,
    topics: item.topics ?? [],
    githubUrl: `https://github.com/${aliased.owner}/${aliased.repo}`,
  };
}

const FIVEM_TOPIC = 'topic:fivem';

const SEARCH_STOP_WORDS = new Set([
  'script',
  'scripts',
  'resource',
  'resources',
  'fivem',
  'the',
  'a',
  'an',
  'and',
  'or',
  'ui',
  'nui',
]);

function extractSearchTerms(userQuery: string): string[] {
  return userQuery
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term.toLowerCase()));
}

function repoText(item: GithubSearchApiItem): string {
  return `${item.name} ${item.description ?? ''} ${item.full_name}`.toLowerCase();
}

/** Post-filter — permissive for topic-tagged repos, stricter for keyword-only hits. */
function isFivemRepository(item: GithubSearchApiItem, fromTopicQuery: boolean, userQuery = ''): boolean {
  const topics = (item.topics ?? []).map((t) => t.toLowerCase());
  const text = repoText(item);

  if (/\b(minecraft|discord-bot|wordpress|npm package|react-native|roblox|flutter)\b/i.test(text)) return false;
  if (topics.includes('redm') && !topics.includes('fivem') && !topics.includes('citizenfx')) return false;

  const fivemTopics = ['fivem', 'citizenfx', 'cfxre', 'cfx', 'gta5', 'gtav', 'gta-v', 'redm', 'lua'];
  if (topics.some((t) => fivemTopics.includes(t))) return true;

  const fivemText =
    /fivem|cfx\.re|citizenfx|fxmanifest|qb-?core|esx|es_extended|ox_|pma-voice|txadmin|gta.?v|redm|cfx\.|standalone|nui|roleplay/i;
  if (fivemText.test(text)) return true;
  if (/^(qb-|esx[-_]|ox_|ps-|cd_|jg-|okok|wasabi|jim-|loaf-|renzu)/i.test(item.name)) return true;
  if (item.language?.toLowerCase() === 'lua' && /script|resource|garage|job|hud|inventory|housing|dispatch/i.test(text)) {
    return true;
  }

  const terms = extractSearchTerms(userQuery);
  if (terms.length > 0 && terms.some((term) => text.includes(term.toLowerCase()))) {
    if (fromTopicQuery) return true;
    if (item.language?.toLowerCase() === 'lua') return true;
    if (fivemText.test(text)) return true;
  }

  if (fromTopicQuery) return true;

  return false;
}

function buildFivemSearchQueries(userQuery: string): { query: string; fromTopicQuery: boolean }[] {
  const q = userQuery.trim();
  if (!q) {
    return [{ query: `${FIVEM_TOPIC} stars:>5`, fromTopicQuery: true }];
  }

  const terms = extractSearchTerms(q);
  const primary = terms[0] ?? q;
  const queries: { query: string; fromTopicQuery: boolean }[] = [
    { query: `fivem ${primary} in:name,description`, fromTopicQuery: false },
    { query: `${FIVEM_TOPIC} ${primary} in:name,description`, fromTopicQuery: true },
    { query: `${primary} fivem in:name,description,readme`, fromTopicQuery: false },
    { query: `${FIVEM_TOPIC} ${primary} in:name`, fromTopicQuery: true },
  ];

  if (terms.length > 1) {
    const orGroup = terms.map((term) => term.replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean).join(' OR ');
    if (orGroup) {
      queries.push({ query: `fivem (${orGroup}) in:name,description`, fromTopicQuery: false });
    }
    if (q !== primary) {
      queries.push({ query: `fivem ${q} in:name,description`, fromTopicQuery: false });
    }
  }

  if (!/\s/.test(q)) {
    queries.push({ query: `${q} in:name`, fromTopicQuery: false });
    queries.push({ query: `fivem ${q} in:name`, fromTopicQuery: false });
  }

  return queries;
}

function featuredToApiItem(item: GithubSearchResult): GithubSearchApiItem {
  return {
    full_name: `${item.owner}/${item.repo}`,
    name: item.name,
    description: item.description,
    stargazers_count: item.stars,
    forks_count: item.forks,
    language: item.language,
    updated_at: item.updatedAt,
    pushed_at: item.pushedAt ?? undefined,
    topics: item.topics,
    html_url: item.githubUrl,
    owner: item.ownerAvatarUrl ? { login: item.owner, avatar_url: item.ownerAvatarUrl } : { login: item.owner },
  };
}

async function featuredMatchesForQuery(query: string, ctx?: GithubAuthContext): Promise<GithubSearchApiItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  try {
    const featured = await getFeaturedFivemScripts(ctx);
    const terms = extractSearchTerms(query);
    const matchTerms = terms.length > 0 ? terms : [q];

    return featured
      .filter((item) => {
        const hay = `${item.owner} ${item.repo} ${item.name} ${item.description} ${item.blurb ?? ''} ${item.category}`.toLowerCase();
        return matchTerms.some((term) => hay.includes(term.toLowerCase()));
      })
      .map(featuredToApiItem);
  } catch {
    return [];
  }
}

export type GithubSearchSort = 'best' | 'stars' | 'forks' | 'updated' | 'pushed';

const GITHUB_SEARCH_SORTS: GithubSearchSort[] = ['best', 'stars', 'forks', 'updated', 'pushed'];

export function parseGithubSearchSort(value: unknown): GithubSearchSort {
  if (typeof value === 'string' && GITHUB_SEARCH_SORTS.includes(value as GithubSearchSort)) {
    return value as GithubSearchSort;
  }
  return 'best';
}

function githubApiSortParams(sort: GithubSearchSort): { sort?: string; order?: string } {
  switch (sort) {
    case 'stars':
      return { sort: 'stars', order: 'desc' };
    case 'forks':
      return { sort: 'forks', order: 'desc' };
    case 'updated':
      return { sort: 'updated', order: 'desc' };
    default:
      return {};
  }
}

function sortSearchApiItems(items: GithubSearchApiItem[], sort: GithubSearchSort): GithubSearchApiItem[] {
  const arr = [...items];
  switch (sort) {
    case 'stars':
      return arr.sort((a, b) => b.stargazers_count - a.stargazers_count);
    case 'forks':
      return arr.sort((a, b) => (b.forks_count ?? 0) - (a.forks_count ?? 0));
    case 'updated':
      return arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    case 'pushed':
      return arr.sort((a, b) => {
        const bTime = new Date(b.pushed_at ?? b.updated_at).getTime();
        const aTime = new Date(a.pushed_at ?? a.updated_at).getTime();
        return bTime - aTime;
      });
    default:
      return arr;
  }
}

function orderBestMatchItems(
  items: GithubSearchApiItem[],
  featured: GithubSearchApiItem[],
): GithubSearchApiItem[] {
  const featuredNames = new Set(featured.map((item) => item.full_name));
  const featuredItems = items.filter((item) => featuredNames.has(item.full_name));
  const rest = items.filter((item) => !featuredNames.has(item.full_name));
  return [...featuredItems, ...rest];
}

export interface GithubSearchPage {
  results: GithubSearchResult[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  sort: GithubSearchSort;
}

export async function searchGithubRepos(
  query: string,
  page = 1,
  ctx?: GithubAuthContext,
  sortInput: unknown = 'best',
): Promise<GithubSearchPage> {
  const q = query.trim();
  const sort = parseGithubSearchSort(sortInput);
  const perPage = 12;
  const safePage = Math.max(1, Math.min(page, 10));
  const scope = ctx?.userId ?? 'panel';
  const cacheKey = `v5:${scope}:${sort}:${safePage}:${q.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const totalCount = cached.totalCount ?? cached.value.length;
    return {
      results: cached.value,
      page: safePage,
      perPage,
      totalCount,
      totalPages: cached.totalPages ?? Math.max(1, Math.ceil(totalCount / perPage)),
      sort,
    };
  }

  async function runSearch(searchQuery: string, githubPage: number) {
    const sortParams = githubApiSortParams(sort);
    let path = `/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=100&page=${githubPage}`;
    if (sortParams.sort) {
      path += `&sort=${sortParams.sort}&order=${sortParams.order ?? 'desc'}`;
    }
    return githubFetch<{ items: GithubSearchApiItem[]; total_count: number }>(path, ctx);
  }

  const queries = buildFivemSearchQueries(q);
  const seen = new Set<string>();
  const accumulated: GithubSearchApiItem[] = [];
  let totalCountEstimate = 0;
  const needed = safePage * perPage;
  let githubPage = 1;
  const maxGithubPages = 10;
  let lastSearchError: string | null = null;

  const featuredHits = q ? await featuredMatchesForQuery(q, ctx) : [];
  for (const item of featuredHits) {
    if (seen.has(item.full_name)) continue;
    seen.add(item.full_name);
    accumulated.push(item);
  }

  while (accumulated.length < needed && githubPage <= maxGithubPages) {
    let pageHadNew = false;

    for (const { query: searchQuery, fromTopicQuery } of queries) {
      if (accumulated.length >= needed) break;
      try {
        const data = await runSearch(searchQuery, githubPage);
        if (totalCountEstimate === 0 && data.total_count > 0) totalCountEstimate = data.total_count;
        for (const item of data.items) {
          if (seen.has(item.full_name)) continue;
          if (!isFivemRepository(item, fromTopicQuery, q)) continue;
          seen.add(item.full_name);
          accumulated.push(item);
          pageHadNew = true;
          if (accumulated.length >= needed) break;
        }
      } catch (err) {
        const status = httpStatusFromUnknown(err, 0);
        if (status === 429 || status === 403) {
          lastSearchError =
            'GitHub rate limit reached — add a token under Profile → Security, or ask the host to set GITHUB_TOKEN.';
        } else if (status === 422) {
          lastSearchError = 'GitHub rejected the search query — try a shorter or simpler term.';
        } else {
          lastSearchError = err instanceof Error ? err.message : 'GitHub search failed';
        }
      }
    }

    if (!pageHadNew) break;
    githubPage++;
  }

  if (accumulated.length === 0 && lastSearchError) {
    throw Object.assign(new Error(lastSearchError), {
      statusCode: /rate limit/i.test(lastSearchError) ? 429 : 400,
    });
  }

  const ordered =
    sort === 'best'
      ? orderBestMatchItems(accumulated, featuredHits)
      : sortSearchApiItems(accumulated, sort);

  const skip = (safePage - 1) * perPage;
  const pageItems = ordered.slice(skip, skip + perPage);

  let totalPages = Math.max(1, Math.ceil(accumulated.length / perPage));
  if (totalCountEstimate < accumulated.length) {
    totalCountEstimate = accumulated.length;
  }
  if (pageItems.length === 0 && safePage > 1) {
    totalPages = Math.max(1, safePage - 1);
  } else if (pageItems.length === perPage && accumulated.length >= needed && githubPage <= maxGithubPages) {
    totalPages = Math.max(totalPages, safePage + 1);
  }
  totalPages = Math.min(10, totalPages);

  const results = pageItems.map(mapSearchItem);
  searchCache.set(cacheKey, {
    value: results,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    totalCount: totalCountEstimate,
    totalPages,
  });
  return {
    results,
    page: safePage,
    perPage,
    totalCount: totalCountEstimate,
    totalPages,
    sort,
  };
}
