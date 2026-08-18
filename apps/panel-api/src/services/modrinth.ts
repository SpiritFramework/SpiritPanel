import { createHash, timingSafeEqual } from 'node:crypto';
import {
  defaultInstallDirForKind,
  installKindForLoaders,
  type MinecraftEggProfile,
  type MinecraftInstallKind,
  type MinecraftLoader,
} from '../lib/minecraft-egg.js';

const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'Spirit-Panel/4 (Minecraft plugin installer; +https://spirit.host)';
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;
const MAX_DOWNLOAD_BYTES = 120 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'cdn.modrinth.com',
  'cdn-raw.modrinth.com',
  'api.modrinth.com',
]);

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const searchCache = new Map<string, CacheEntry<ModrinthSearchPage>>();
const projectCache = new Map<string, CacheEntry<ModrinthProject>>();
const versionsCache = new Map<string, CacheEntry<ModrinthVersion[]>>();

export interface ModrinthSearchHit {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
  follows: number;
  categories: string[];
  displayCategories: string[];
  projectType: string;
  versions: string[];
  dateModified: string;
  clientSide: string;
  serverSide: string;
}

export interface ModrinthSearchPage {
  hits: ModrinthSearchHit[];
  offset: number;
  limit: number;
  totalHits: number;
}

export interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  iconUrl: string | null;
  downloads: number;
  followers: number;
  categories: string[];
  loaders: string[];
  gameVersions: string[];
  projectType: string;
  team: string;
  published: string;
  updated: string;
  serverSide: string;
  clientSide: string;
  sourceUrl: string | null;
  issuesUrl: string | null;
  discordUrl: string | null;
  donationUrls: Array<{ id: string; platform: string; url: string }>;
  gallery: Array<{ url: string; featured: boolean; title: string | null }>;
}

export interface ModrinthVersionFile {
  hashes: { sha1?: string; sha512?: string };
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  fileType: string | null;
}

export interface ModrinthDependency {
  versionId: string | null;
  projectId: string | null;
  fileName: string | null;
  dependencyType: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export interface ModrinthVersion {
  id: string;
  projectId: string;
  name: string;
  versionNumber: string;
  changelog: string;
  dependencies: ModrinthDependency[];
  gameVersions: string[];
  versionType: string;
  loaders: string[];
  featured: boolean;
  status: string;
  datePublished: string;
  downloads: number;
  files: ModrinthVersionFile[];
}

function purgeCacheMap<T>(map: Map<string, CacheEntry<T>>) {
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

function setCache<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  purgeCacheMap(map);
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function isAllowedDownloadHost(hostname: string): boolean {
  return ALLOWED_DOWNLOAD_HOSTS.has(hostname.toLowerCase());
}

export function sanitizeModrinthDownloadUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw Object.assign(new Error('Invalid download URL'), { statusCode: 400 });
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error('Invalid download URL'), { statusCode: 400 });
  }
  if (!isAllowedDownloadHost(parsed.hostname)) {
    throw Object.assign(new Error('Download host is not allowed'), { statusCode: 400 });
  }
  return parsed.toString();
}

function modrinthClientError(status: number, fallback: string): Error {
  const statusCode = status === 404 ? 404 : status >= 500 ? 502 : 400;
  const message =
    status === 404
      ? 'Modrinth project or version not found'
      : status >= 500
        ? 'Modrinth is temporarily unavailable'
        : fallback;
  return Object.assign(new Error(message), { statusCode });
}

async function modrinthFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MODRINTH_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    await res.text().catch(() => '');
    throw modrinthClientError(res.status, 'Modrinth request failed');
  }
  return res.json() as Promise<T>;
}

function serializeHit(raw: Record<string, unknown>): ModrinthSearchHit {
  return {
    projectId: String(raw.project_id ?? ''),
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    author: String(raw.author ?? ''),
    iconUrl: typeof raw.icon_url === 'string' ? raw.icon_url : null,
    downloads: Number(raw.downloads ?? 0),
    follows: Number(raw.follows ?? 0),
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    displayCategories: Array.isArray(raw.display_categories)
      ? raw.display_categories.map(String)
      : [],
    projectType: String(raw.project_type ?? 'mod'),
    versions: Array.isArray(raw.versions) ? raw.versions.map(String) : [],
    dateModified: String(raw.date_modified ?? ''),
    clientSide: String(raw.client_side ?? 'unknown'),
    serverSide: String(raw.server_side ?? 'unknown'),
  };
}

function serializeProject(raw: Record<string, unknown>): ModrinthProject {
  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    body: String(raw.body ?? ''),
    iconUrl: typeof raw.icon_url === 'string' ? raw.icon_url : null,
    downloads: Number(raw.downloads ?? 0),
    followers: Number(raw.followers ?? 0),
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    loaders: Array.isArray(raw.loaders) ? raw.loaders.map(String) : [],
    gameVersions: Array.isArray(raw.game_versions) ? raw.game_versions.map(String) : [],
    projectType: String(raw.project_type ?? 'mod'),
    team: String(raw.team ?? ''),
    published: String(raw.published ?? ''),
    updated: String(raw.updated ?? ''),
    serverSide: String(raw.server_side ?? 'unknown'),
    clientSide: String(raw.client_side ?? 'unknown'),
    sourceUrl: typeof raw.source_url === 'string' ? raw.source_url : null,
    issuesUrl: typeof raw.issues_url === 'string' ? raw.issues_url : null,
    discordUrl: typeof raw.discord_url === 'string' ? raw.discord_url : null,
    donationUrls: Array.isArray(raw.donation_urls)
      ? (raw.donation_urls as Array<Record<string, unknown>>).map((d) => ({
          id: String(d.id ?? ''),
          platform: String(d.platform ?? ''),
          url: String(d.url ?? ''),
        }))
      : [],
    gallery: Array.isArray(raw.gallery)
      ? (raw.gallery as Array<Record<string, unknown>>)
          .map((g) => ({
            url: String(g.url ?? ''),
            featured: Boolean(g.featured),
            title: typeof g.title === 'string' ? g.title : null,
          }))
          .filter((g) => g.url.startsWith('https://'))
      : [],
  };
}

function serializeVersion(raw: Record<string, unknown>): ModrinthVersion {
  return {
    id: String(raw.id ?? ''),
    projectId: String(raw.project_id ?? ''),
    name: String(raw.name ?? ''),
    versionNumber: String(raw.version_number ?? ''),
    changelog: String(raw.changelog ?? ''),
    dependencies: Array.isArray(raw.dependencies)
      ? (raw.dependencies as Array<Record<string, unknown>>).map((d) => ({
          versionId: typeof d.version_id === 'string' ? d.version_id : null,
          projectId: typeof d.project_id === 'string' ? d.project_id : null,
          fileName: typeof d.file_name === 'string' ? d.file_name : null,
          dependencyType: String(d.dependency_type ?? 'optional') as ModrinthDependency['dependencyType'],
        }))
      : [],
    gameVersions: Array.isArray(raw.game_versions) ? raw.game_versions.map(String) : [],
    versionType: String(raw.version_type ?? 'release'),
    loaders: Array.isArray(raw.loaders) ? raw.loaders.map(String) : [],
    featured: Boolean(raw.featured),
    status: String(raw.status ?? 'listed'),
    datePublished: String(raw.date_published ?? ''),
    downloads: Number(raw.downloads ?? 0),
    files: Array.isArray(raw.files)
      ? (raw.files as Array<Record<string, unknown>>).map((f) => {
          const hashesRaw = (f.hashes as Record<string, unknown> | undefined) ?? {};
          return {
            hashes: {
              sha1: typeof hashesRaw.sha1 === 'string' ? hashesRaw.sha1 : undefined,
              sha512: typeof hashesRaw.sha512 === 'string' ? hashesRaw.sha512 : undefined,
            },
            url: String(f.url ?? ''),
            filename: String(f.filename ?? ''),
            primary: Boolean(f.primary),
            size: Number(f.size ?? 0),
            fileType: typeof f.file_type === 'string' ? f.file_type : null,
          };
        })
      : [],
  };
}

export function buildModrinthFacets(opts: {
  profile: MinecraftEggProfile;
  gameVersion?: string | null;
  loaders?: string[];
  category?: string | null;
}): string {
  const facets: string[][] = [];

  const loaders = (opts.loaders?.length ? opts.loaders : opts.profile.loaders).filter(
    (l) => l !== 'datapack',
  );
  if (loaders.length) {
    facets.push(loaders.map((l) => `categories:${l}`));
  }

  const types = opts.profile.projectTypes;
  if (types.length) {
    facets.push(types.map((t) => `project_type:${t}`));
  }

  // Datapacks are often tagged without server_side metadata — skip that filter for vanilla.
  const datapackOnly = types.length === 1 && types[0] === 'datapack';
  if (!datapackOnly) {
    facets.push(['server_side:required', 'server_side:optional']);
  }

  if (opts.gameVersion) {
    facets.push([`versions:${opts.gameVersion}`]);
  }

  const category = opts.category?.trim().toLowerCase();
  if (category && /^[a-z0-9-]+$/.test(category) && category.length <= 40) {
    facets.push([`categories:${category}`]);
  }

  return JSON.stringify(facets);
}

export async function searchModrinthProjects(opts: {
  query?: string;
  profile: MinecraftEggProfile;
  gameVersion?: string | null;
  loaders?: string[];
  category?: string | null;
  offset?: number;
  limit?: number;
  index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated';
}): Promise<ModrinthSearchPage> {
  const offset = opts.offset ?? 0;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const index = opts.index ?? (opts.query?.trim() ? 'relevance' : 'downloads');
  const facets = buildModrinthFacets({
    profile: opts.profile,
    gameVersion: opts.gameVersion,
    loaders: opts.loaders,
    category: opts.category,
  });
  const key = JSON.stringify({
    q: opts.query ?? '',
    facets,
    offset,
    limit,
    index,
  });
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const params = new URLSearchParams({
    facets,
    offset: String(offset),
    limit: String(limit),
    index,
  });
  if (opts.query?.trim()) params.set('query', opts.query.trim());

  const raw = await modrinthFetch<Record<string, unknown>>(`/search?${params}`);
  const page: ModrinthSearchPage = {
    hits: Array.isArray(raw.hits)
      ? (raw.hits as Array<Record<string, unknown>>).map(serializeHit)
      : [],
    offset: Number(raw.offset ?? offset),
    limit: Number(raw.limit ?? limit),
    totalHits: Number(raw.total_hits ?? 0),
  };
  setCache(searchCache, key, page);
  return page;
}

export async function getModrinthProject(idOrSlug: string): Promise<ModrinthProject> {
  const key = idOrSlug.toLowerCase();
  const cached = projectCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const raw = await modrinthFetch<Record<string, unknown>>(`/project/${encodeURIComponent(idOrSlug)}`);
  const project = serializeProject(raw);
  setCache(projectCache, key, project);
  setCache(projectCache, project.id.toLowerCase(), project);
  if (project.slug) {
    setCache(projectCache, project.slug.toLowerCase(), project);
  }
  return project;
}

export async function listModrinthVersions(
  idOrSlug: string,
  opts?: { loaders?: string[]; gameVersions?: string[] },
): Promise<ModrinthVersion[]> {
  const params = new URLSearchParams();
  if (opts?.loaders?.length) params.set('loaders', JSON.stringify(opts.loaders));
  if (opts?.gameVersions?.length) params.set('game_versions', JSON.stringify(opts.gameVersions));
  const qs = params.toString();
  const cacheKey = `${idOrSlug}:${qs}`;
  const cached = versionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const raw = await modrinthFetch<Array<Record<string, unknown>>>(
    `/project/${encodeURIComponent(idOrSlug)}/version${qs ? `?${qs}` : ''}`,
  );
  const versions = raw
    .map(serializeVersion)
    .filter((v) => v.status === 'listed' || v.status === 'archived' || !v.status);
  setCache(versionsCache, cacheKey, versions);
  return versions;
}

export async function getModrinthVersion(versionId: string): Promise<ModrinthVersion> {
  const raw = await modrinthFetch<Record<string, unknown>>(`/version/${encodeURIComponent(versionId)}`);
  return serializeVersion(raw);
}

export function pickPrimaryFile(version: ModrinthVersion): ModrinthVersionFile {
  const files = version.files.filter((f) => f.url && f.filename);
  if (!files.length) {
    throw Object.assign(new Error('This version has no downloadable files'), { statusCode: 400 });
  }
  const primary = files.find((f) => f.primary);
  if (primary) return primary;
  const jar = files.find((f) => /\.jar$/i.test(f.filename));
  if (jar) return jar;
  const zip = files.find((f) => /\.zip$/i.test(f.filename));
  if (zip) return zip;
  return files[0]!;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (!/^[0-9a-f]+$/.test(left) || !/^[0-9a-f]+$/.test(right)) return false;
  if (left.length !== right.length || left.length % 2 !== 0) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function assertHashesMatch(buf: Buffer, hashes: ModrinthVersionFile['hashes']) {
  if (!hashes.sha512 && !hashes.sha1) {
    throw Object.assign(new Error('Download is missing integrity hashes'), { statusCode: 400 });
  }
  if (hashes.sha512) {
    const digest = createHash('sha512').update(buf).digest('hex');
    if (!timingSafeEqualHex(digest, hashes.sha512)) {
      throw Object.assign(new Error('Downloaded file failed integrity check'), { statusCode: 400 });
    }
    return;
  }
  if (hashes.sha1) {
    const digest = createHash('sha1').update(buf).digest('hex');
    if (!timingSafeEqualHex(digest, hashes.sha1)) {
      throw Object.assign(new Error('Downloaded file failed integrity check'), { statusCode: 400 });
    }
  }
}

export async function downloadModrinthFile(
  url: string,
  expectedHashes?: ModrinthVersionFile['hashes'],
): Promise<Buffer> {
  let current = sanitizeModrinthDownloadUrl(url);
  let res: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    res = await fetch(current, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw Object.assign(new Error('Download redirect missing location'), { statusCode: 502 });
      }
      current = sanitizeModrinthDownloadUrl(new URL(location, current).toString());
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    throw Object.assign(new Error(`Download failed (${res?.status ?? 'unknown'})`), { statusCode: 502 });
  }

  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) {
    throw Object.assign(new Error('File is too large to install'), { statusCode: 400 });
  }

  if (!res.body) {
    throw Object.assign(new Error('Empty download response'), { statusCode: 502 });
  }

  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      throw Object.assign(new Error('File is too large to install'), { statusCode: 400 });
    }
    chunks.push(Buffer.from(value));
  }

  const buf = Buffer.concat(chunks, total);
  if (expectedHashes) assertHashesMatch(buf, expectedHashes);
  return buf;
}

export function resolveInstallMeta(
  version: ModrinthVersion,
  file: ModrinthVersionFile,
  worldName = 'world',
): { kind: MinecraftInstallKind; installDir: string; filename: string } {
  let resolvedKind = installKindForLoaders(version.loaders.length ? version.loaders : []);
  if (/\.zip$/i.test(file.filename) && version.loaders.map((l) => l.toLowerCase()).includes('datapack')) {
    resolvedKind = 'datapack';
  }
  const installDir = defaultInstallDirForKind(resolvedKind, worldName);
  const filename = sanitizeFilename(file.filename);
  return { kind: resolvedKind, installDir, filename };
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || 'plugin.jar';
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw Object.assign(new Error('Invalid filename'), { statusCode: 400 });
  }
  if (cleaned.length > 180) return cleaned.slice(0, 180);
  return cleaned;
}

export function profileLoadersForApi(profile: MinecraftEggProfile): MinecraftLoader[] {
  return profile.loaders;
}
