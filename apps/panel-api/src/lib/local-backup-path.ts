import { createReadStream, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_WINGS_BACKUP_DIRECTORY = '/var/lib/featherpanel/backups';

export function wingsBackupDirectory(): string {
  return process.env.WINGS_BACKUP_DIRECTORY?.trim() || DEFAULT_WINGS_BACKUP_DIRECTORY;
}

/** Resolve a local tar.gz backup when panel and FeatherWings share the same host. */
export function resolveColocatedBackupFile(serverUuid: string, backupUuid: string): string | null {
  const dir = path.join(wingsBackupDirectory(), serverUuid);
  const direct = path.join(dir, `${backupUuid}.tar.gz`);
  try {
    const st = statSync(direct);
    if (st.isFile()) return direct;
  } catch {
    // try case-insensitive scan below
  }

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  const want = `${backupUuid.toLowerCase()}.tar.gz`;
  for (const name of entries) {
    if (name.toLowerCase() !== want) continue;
    const full = path.join(dir, name);
    try {
      const st = statSync(full);
      if (st.isFile()) return full;
    } catch {
      continue;
    }
  }
  return null;
}

export function openColocatedBackupStream(filePath: string) {
  const stat = statSync(filePath);
  return { stream: createReadStream(filePath), size: stat.size };
}
