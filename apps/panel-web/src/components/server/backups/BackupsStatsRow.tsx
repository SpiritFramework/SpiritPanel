import { Archive, Clock, HardDrive, Layers } from 'lucide-react';
import { formatBytes } from '../../../lib/stats';
import type { ServerBackupDiskBudget } from '../../../lib/api';

export function BackupsStatsRow({
  used,
  limit,
  slotsLeft,
  totalBytes,
  pendingCount,
  completeCount,
  disk,
}: {
  used: number;
  limit: number;
  slotsLeft: number;
  totalBytes: number;
  pendingCount: number;
  completeCount: number;
  disk?: ServerBackupDiskBudget;
}) {
  const diskHint =
    disk && disk.limitBytes != null
      ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.limitBytes)} disk`
      : disk
        ? `${formatBytes(disk.backupBytes)} in archives`
        : 'Counts toward server disk';

  return (
    <div className="ds-srv-bk-stats">
      <div className="ds-srv-bk-stat">
        <span className="ds-srv-bk-stat-icon ds-srv-bk-stat-icon--slots" aria-hidden>
          <Layers className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-bk-stat-value">{limit === 0 ? '—' : `${used} / ${limit}`}</p>
          <p className="ds-srv-bk-stat-label">
            {limit === 0 ? 'Backups disabled' : `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left`}
          </p>
        </div>
      </div>
      <div className="ds-srv-bk-stat">
        <span className="ds-srv-bk-stat-icon ds-srv-bk-stat-icon--size" aria-hidden>
          <HardDrive className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-bk-stat-value">{formatBytes(totalBytes)}</p>
          <p className="ds-srv-bk-stat-label">{diskHint}</p>
        </div>
      </div>
      <div className="ds-srv-bk-stat">
        <span className="ds-srv-bk-stat-icon ds-srv-bk-stat-icon--complete" aria-hidden>
          <Archive className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-bk-stat-value">{completeCount}</p>
          <p className="ds-srv-bk-stat-label">Completed</p>
        </div>
      </div>
      <div className="ds-srv-bk-stat">
        <span className={`ds-srv-bk-stat-icon ds-srv-bk-stat-icon--pending${pendingCount > 0 ? ' ds-srv-bk-stat-icon--pulse' : ''}`} aria-hidden>
          <Clock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-bk-stat-value">{pendingCount}</p>
          <p className="ds-srv-bk-stat-label">{pendingCount > 0 ? 'Auto-refreshing' : 'In progress'}</p>
        </div>
      </div>
    </div>
  );
}
