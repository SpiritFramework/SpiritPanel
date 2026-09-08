import type { ServerBackupSummary } from './api';
import { formatBytes } from './stats';

export type BackupStatus = 'complete' | 'failed' | 'pending';
export type BackupFilter = 'all' | BackupStatus;

export function getBackupStatus(backup: ServerBackupSummary): BackupStatus {
  if (backup.isSuccessful) return 'complete';
  if (backup.completedAt) return 'failed';
  return 'pending';
}

export function formatBackupBytes(bytes: string | number): string {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!n || Number.isNaN(n)) return '—';
  return formatBytes(n);
}

export function backupBytesValue(bytes: string | number): number {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  return Number.isFinite(n) ? n : 0;
}

export function matchesBackupFilter(backup: ServerBackupSummary, filter: BackupFilter): boolean {
  if (filter === 'all') return true;
  return getBackupStatus(backup) === filter;
}

export function matchesBackupSearch(backup: ServerBackupSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return backup.name.toLowerCase().includes(q);
}

/** Returns human-readable ignore patterns, or null when empty/default. */
export function formatBackupIgnored(ignored?: string | null): string | null {
  const raw = ignored?.trim();
  if (!raw || raw === '[]') return null;
  return raw;
}
