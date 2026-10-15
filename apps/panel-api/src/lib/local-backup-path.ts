import { createReadStream, lstatSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_WINGS_BACKUP_DIRECTORY = '/var/lib/featherpanel/backups';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function wingsBackupDirectory(): string {
  return process.env.WINGS_BACKUP_DIRECTORY?.trim() || DEFAULT_WINGS_BACKUP_DIRECTORY;
}

function isInsideBase(base: string, candidate: string): boolean {
  const resolvedBase = path.resolve(base);
  const resolvedCandidate = path.resolve(candidate);
  const rel = path.relative(resolvedBase, resolvedCandidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function isRegularFile(filePath: string): boolean {
  try {
    const lst = lstatSync(filePath);
    if (lst.isSymbolicLink()) return false;
    return lst.isFile();
  } catch {
    return false;
  }
}

/** Resolve a local tar.gz backup when panel and FeatherWings share the same host. */
export function resolveColocatedBackupFile(serverUuid: string, backupUuid: string): string | null {
  if (!UUID_RE.test(serverUuid) || !UUID_RE.test(backupUuid)) return null;

  const base = path.resolve(wingsBackupDirectory());
  const dir = path.resolve(base, serverUuid);
  if (!isInsideBase(base, dir)) return null;

  const direct = path.resolve(dir, `${backupUuid}.tar.gz`);
  if (isInsideBase(dir, direct) && isRegularFile(direct)) return direct;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  const want = `${backupUuid.toLowerCase()}.tar.gz`;
  for (const name of entries) {
    if (name.toLowerCase() !== want) continue;
    if (name.includes('/') || name.includes('\\') || name.includes('..')) continue;
    const full = path.resolve(dir, name);
    if (!isInsideBase(dir, full)) continue;
    if (isRegularFile(full)) return full;
  }
  return null;
}

export function openColocatedBackupStream(filePath: string) {
  if (!isRegularFile(filePath)) {
    throw new Error('Backup file is not a regular file');
  }
  const stat = statSync(filePath);
  return { stream: createReadStream(filePath), size: stat.size };
}
