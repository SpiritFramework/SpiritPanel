import { createHash } from 'node:crypto';
import {
  defaultInstallDirForKind,
  type MinecraftEggProfile,
  type MinecraftInstallKind,
} from '../lib/minecraft-egg.js';
import { wingsForNode, type WingsClient } from './wings-client.js';
import { getModrinthProject } from './modrinth.js';

const USER_AGENT = 'Spirit-Panel/4 (Minecraft plugin scanner; +https://spirit.host)';
const MAX_HASH_FILES = 25;
const MAX_HASH_BYTES = 64 * 1024 * 1024;
const HASH_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const HASH_WORKERS = 2;

export interface OnDiskPluginFile {
  filename: string;
  installPath: string;
  installDir: string;
  size: number | null;
  kind: MinecraftInstallKind;
}

export interface RecognizedDiskPlugin extends OnDiskPluginFile {
  projectId: string;
  projectSlug: string;
  displayName: string;
  iconUrl: string | null;
  versionId: string | null;
  versionNumber: string | null;
  modrinthUrl: string;
}

interface HashCacheEntry {
  expiresAt: number;
  result: RecognizedDiskPlugin | null;
}

const recognitionCache = new Map<string, HashCacheEntry>();

function purgeRecognitionCache() {
  const now = Date.now();
  for (const [key, entry] of recognitionCache) {
    if (entry.expiresAt <= now) recognitionCache.delete(key);
  }
  while (recognitionCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = recognitionCache.keys().next().value;
    if (oldest == null) break;
    recognitionCache.delete(oldest);
  }
}

function setRecognitionCache(key: string, result: RecognizedDiskPlugin | null) {
  purgeRecognitionCache();
  recognitionCache.set(key, { expiresAt: Date.now() + HASH_CACHE_TTL_MS, result });
}

function joinPath(dir: string, name: string): string {
  const base = dir === '/' ? '' : dir.replace(/\/$/, '');
  return `${base}/${name}`;
}

function isPluginLikeFile(name: string): boolean {
  return /\.(jar|zip)$/i.test(name) && !name.startsWith('.');
}

async function listPluginLikeFiles(
  wings: WingsClient,
  uuid: string,
  dir: string,
  kind: MinecraftInstallKind,
): Promise<OnDiskPluginFile[]> {
  try {
    const entries = await wings.listFiles(uuid, dir);
    return entries
      .filter((e) => !e.directory && isPluginLikeFile(e.name))
      .map((e) => {
        const raw = e as { size?: number | string; file?: boolean };
        const sizeNum = raw.size == null ? null : Number(raw.size);
        return {
          filename: e.name,
          installPath: joinPath(dir, e.name),
          installDir: dir,
          size: sizeNum != null && Number.isFinite(sizeNum) ? sizeNum : null,
          kind,
        };
      });
  } catch {
    return [];
  }
}

async function readWorldName(wings: WingsClient, uuid: string): Promise<string> {
  try {
    const content = await wings.getFileContents(uuid, '/server.properties');
    const match = content.match(/^\s*level-name\s*=\s*(.+)\s*$/m);
    const name = match?.[1]?.trim();
    if (name && !/[\\/]/.test(name) && name !== '.' && name !== '..') return name;
  } catch {
    // default
  }
  return 'world';
}

export async function scanMinecraftPluginFiles(
  wings: WingsClient,
  serverUuid: string,
  profile: MinecraftEggProfile,
): Promise<OnDiskPluginFile[]> {
  const world = await readWorldName(wings, serverUuid);
  const dirs = new Map<string, MinecraftInstallKind>();

  if (profile.kind === 'mod' || profile.loaders.some((l) => ['fabric', 'quilt', 'forge', 'neoforge'].includes(l))) {
    dirs.set(defaultInstallDirForKind('mod'), 'mod');
  }
  if (profile.kind === 'datapack' || profile.loaders.includes('datapack')) {
    dirs.set(defaultInstallDirForKind('datapack', world), 'datapack');
  }
  if (
    profile.kind === 'plugin' ||
    profile.loaders.some((l) =>
      ['paper', 'spigot', 'bukkit', 'purpur', 'folia', 'sponge', 'velocity', 'bungeecord', 'waterfall'].includes(l),
    )
  ) {
    dirs.set(defaultInstallDirForKind('plugin'), 'plugin');
  }
  if (dirs.size === 0) {
    dirs.set('/plugins', 'plugin');
    dirs.set('/mods', 'mod');
  }

  const results: OnDiskPluginFile[] = [];
  for (const [dir, kind] of dirs) {
    results.push(...(await listPluginLikeFiles(wings, serverUuid, dir, kind)));
  }
  results.sort((a, b) => a.filename.localeCompare(b.filename));
  return results;
}

async function sha1WingsFile(wings: WingsClient, uuid: string, filePath: string, maxBytes: number): Promise<string | null> {
  try {
    const res = await wings.downloadFile(uuid, filePath, 90_000);
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes) return null;
    if (!res.body) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > maxBytes) return null;
      return createHash('sha1').update(buf).digest('hex');
    }

    const reader = res.body.getReader();
    const hash = createHash('sha1');
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        return null;
      }
      hash.update(value);
    }
    if (total === 0) return null;
    return hash.digest('hex');
  } catch {
    return null;
  }
}

async function lookupModrinthBySha1(sha1: string): Promise<{
  projectId: string;
  versionId: string;
  versionNumber: string;
} | null> {
  try {
    const res = await fetch(
      `https://api.modrinth.com/v2/version_file/${encodeURIComponent(sha1)}?algorithm=sha1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      },
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    const projectId = String(raw.project_id ?? '');
    const versionId = String(raw.id ?? '');
    if (!projectId || !versionId) return null;
    return {
      projectId,
      versionId,
      versionNumber: String(raw.version_number ?? ''),
    };
  } catch {
    return null;
  }
}

export async function recognizeDiskPlugins(
  wings: WingsClient,
  serverUuid: string,
  files: OnDiskPluginFile[],
  trackedPaths: Set<string>,
): Promise<RecognizedDiskPlugin[]> {
  // Require a known size so we never download unbounded unknown files.
  const candidates = files
    .filter((f) => !trackedPaths.has(f.installPath))
    .filter((f) => f.size != null && f.size > 0 && f.size <= MAX_HASH_BYTES)
    .slice(0, MAX_HASH_FILES);

  const recognized: RecognizedDiskPlugin[] = [];
  const queue = [...candidates];

  const workers = Array.from({ length: Math.min(HASH_WORKERS, queue.length || 1) }, async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) return;

      const cacheKey = `${serverUuid}:${file.installPath}:${file.size}`;
      const cached = recognitionCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.result) recognized.push(cached.result);
        continue;
      }

      const sha1 = await sha1WingsFile(wings, serverUuid, file.installPath, MAX_HASH_BYTES);
      if (!sha1) {
        setRecognitionCache(cacheKey, null);
        continue;
      }

      const hit = await lookupModrinthBySha1(sha1);
      if (!hit) {
        setRecognitionCache(cacheKey, null);
        continue;
      }

      try {
        const project = await getModrinthProject(hit.projectId);
        const result: RecognizedDiskPlugin = {
          ...file,
          projectId: project.id,
          projectSlug: project.slug,
          displayName: project.title,
          iconUrl: project.iconUrl,
          versionId: hit.versionId,
          versionNumber: hit.versionNumber,
          modrinthUrl: `https://modrinth.com/project/${project.slug || project.id}`,
        };
        setRecognitionCache(cacheKey, result);
        recognized.push(result);
      } catch {
        setRecognitionCache(cacheKey, null);
      }
    }
  });

  if (candidates.length) await Promise.all(workers);
  return recognized;
}

export async function scanAndRecognizePlugins(
  node: Parameters<typeof wingsForNode>[0],
  serverUuid: string,
  profile: MinecraftEggProfile,
  trackedInstallPaths: string[],
) {
  const wings = wingsForNode(node);
  const onDisk = await scanMinecraftPluginFiles(wings, serverUuid, profile);
  const trackedPaths = new Set(
    trackedInstallPaths.map((p) => (p.startsWith('/') ? p : `/${p}`)),
  );
  const filenames = onDisk.map((f) => f.filename.toLowerCase());
  const paths = onDisk.map((f) => f.installPath);

  const recognized = await recognizeDiskPlugins(wings, serverUuid, onDisk, trackedPaths);
  const recognizedPaths = new Set(recognized.map((r) => r.installPath));
  const unmatched = onDisk.filter((f) => !trackedPaths.has(f.installPath) && !recognizedPaths.has(f.installPath));

  return {
    onDisk,
    filenames,
    paths,
    recognized,
    unmatched,
  };
}
