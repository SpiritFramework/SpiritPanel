export type BackupAdapter = 'wings' | 'pbs';

/** Infer the storage adapter for a backup row (disk field or PBS checksum path). */
export function resolveStoredBackupAdapter(backup: {
  disk: string;
  checksum: string | null;
}): BackupAdapter {
  if (backup.disk === 'pbs') return 'pbs';
  if (backup.checksum?.startsWith('ct/')) return 'pbs';
  return 'wings';
}

export function diskFromChecksumType(checksumType?: string | null): BackupAdapter {
  return checksumType === 'pbs' ? 'pbs' : 'wings';
}
