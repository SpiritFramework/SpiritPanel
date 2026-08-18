import type { Node, PrismaClient } from '@prisma/client';
import { parseWingsResourcesPayload } from './wings-resources.js';
import { ResourceQuotaError } from './server-quotas.js';
import { fetchLiveStats } from '../services/server-stats.js';

const MiB = 1024 * 1024;

export type DiskBudgetServer = {
  id: string;
  uuid: string;
  disk: number;
  node: Node;
};

export interface ServerDiskBudget {
  /** null when server.disk is 0 (unlimited). */
  limitBytes: number | null;
  fileBytes: number;
  backupBytes: number;
  /** Files + backups currently counting toward the limit. */
  usedBytes: number;
  freeBytes: number | null;
  /** Conservative estimate for a new full-server backup (= current file usage). */
  estimatedBackupBytes: number;
  canFitEstimatedBackup: boolean;
}

type BackupByteRow = { bytes: bigint; completedAt: Date | null };

function toNumber(bytes: bigint | number): number {
  if (typeof bytes === 'number') return Number.isFinite(bytes) ? Math.max(0, Math.floor(bytes)) : 0;
  const n = Number(bytes);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Sum backup archive bytes, reserving estimated size for in-progress backups with 0 bytes. */
export function sumBackupBytesTowardDisk(
  backups: BackupByteRow[],
  estimatedInProgressBytes: number,
): number {
  let total = 0;
  const reserve = Math.max(0, estimatedInProgressBytes);
  for (const backup of backups) {
    const size = toNumber(backup.bytes);
    if (size > 0) {
      total += size;
      continue;
    }
    // In-progress (not completed) with unknown size — reserve headroom so two backups can't race over limit.
    if (!backup.completedAt) {
      total += reserve;
    }
  }
  return total;
}

export async function resolveServerFileBytes(
  server: DiskBudgetServer,
  db: PrismaClient,
): Promise<number> {
  const live = await fetchLiveStats(server as Parameters<typeof fetchLiveStats>[0]);
  if (live) {
    const parsed = parseWingsResourcesPayload(live);
    if (typeof parsed.disk_bytes === 'number' && parsed.disk_bytes >= 0) {
      return Math.floor(parsed.disk_bytes);
    }
  }

  const snap = await db.serverStatSnapshot.findFirst({
    where: { serverId: server.id },
    orderBy: { recordedAt: 'desc' },
    select: { diskBytes: true },
  });
  if (snap) return toNumber(snap.diskBytes);

  return 0;
}

export async function getServerDiskBudget(
  server: DiskBudgetServer,
  db: PrismaClient,
): Promise<ServerDiskBudget> {
  const limitBytes = server.disk > 0 ? server.disk * MiB : null;
  const fileBytes = await resolveServerFileBytes(server, db);

  const backups = await db.backup.findMany({
    where: { serverId: server.id },
    select: { bytes: true, completedAt: true },
  });

  const backupBytes = sumBackupBytesTowardDisk(backups, fileBytes);
  const usedBytes = fileBytes + backupBytes;
  const freeBytes = limitBytes == null ? null : Math.max(0, limitBytes - usedBytes);
  const estimatedBackupBytes = fileBytes;
  const canFitEstimatedBackup =
    limitBytes == null || usedBytes + estimatedBackupBytes <= limitBytes;

  return {
    limitBytes,
    fileBytes,
    backupBytes,
    usedBytes,
    freeBytes,
    estimatedBackupBytes,
    canFitEstimatedBackup,
  };
}

/** Throw if a new backup would push files+backups over the server disk allocation. */
export async function assertBackupFitsDiskBudget(
  server: DiskBudgetServer,
  db: PrismaClient,
): Promise<ServerDiskBudget> {
  const budget = await getServerDiskBudget(server, db);
  if (budget.limitBytes == null) return budget;

  if (!budget.canFitEstimatedBackup) {
    const limitMiB = Math.floor(budget.limitBytes / MiB);
    const usedMiB = Math.ceil(budget.usedBytes / MiB);
    const needMiB = Math.ceil(budget.estimatedBackupBytes / MiB);
    const freeMiB = Math.floor((budget.freeBytes ?? 0) / MiB);
    throw new ResourceQuotaError(
      `Not enough disk allocation for a new backup. ` +
        `Server disk is ${limitMiB} MiB; files + existing backups use ~${usedMiB} MiB ` +
        `(${freeMiB} MiB free), but a new backup needs ~${needMiB} MiB. ` +
        `Delete older backups or free server files first.`,
    );
  }

  return budget;
}

export function serializeDiskBudget(budget: ServerDiskBudget) {
  return {
    limitBytes: budget.limitBytes,
    fileBytes: budget.fileBytes,
    backupBytes: budget.backupBytes,
    usedBytes: budget.usedBytes,
    freeBytes: budget.freeBytes,
    estimatedBackupBytes: budget.estimatedBackupBytes,
    canFitEstimatedBackup: budget.canFitEstimatedBackup,
  };
}
