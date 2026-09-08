import {
  CheckCircle2,
  Clock,
  Download,
  Lock,
  RotateCcw,
  Trash2,
  Unlock,
  XCircle,
} from 'lucide-react';
import type { ServerBackupSummary } from '../../../lib/api';
import { formatActivityTime } from '../../../lib/activity';
import { formatBackupBytes, formatBackupIgnored, getBackupStatus } from '../../../lib/backup-utils';

export function BackupRow({
  backup,
  busy,
  canRestore,
  canDelete,
  onRestore,
  onDelete,
  onLock,
  onDownload,
}: {
  backup: ServerBackupSummary;
  busy: boolean;
  canRestore: boolean;
  canDelete: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onLock: () => void;
  onDownload: () => void;
}) {
  const status = getBackupStatus(backup);
  const statusMeta = {
    complete: { icon: CheckCircle2, label: 'Complete', tone: 'success' as const },
    failed: { icon: XCircle, label: 'Failed', tone: 'danger' as const },
    pending: { icon: Clock, label: 'In progress', tone: 'pending' as const },
  }[status];
  const StatusIcon = statusMeta.icon;
  const ignoredLabel = formatBackupIgnored(backup.ignored);

  return (
    <li className={`ds-srv-bk-row ds-srv-bk-row--${status}`}>
      <span className={`ds-srv-bk-row-accent ds-srv-bk-row-accent--${status}`} aria-hidden />

      <span className={`ds-srv-bk-row-icon ds-srv-bk-row-icon--${status}`} aria-hidden>
        <StatusIcon className={`h-4 w-4${status === 'pending' ? ' animate-pulse' : ''}`} />
      </span>

      <div className="ds-srv-bk-row-body">
        <div className="ds-srv-bk-row-top">
          <div className="min-w-0 flex-1">
            <div className="ds-srv-bk-row-title-row">
              <h3 className="ds-srv-bk-row-title">{backup.name}</h3>
              <span className={`ds-srv-bk-status ds-srv-bk-status--${statusMeta.tone}`}>{statusMeta.label}</span>
              {backup.isLocked ? (
                <span className="ds-srv-bk-lock-badge">
                  <Lock className="h-3 w-3" aria-hidden />
                  Locked
                </span>
              ) : null}
            </div>
            <div className="ds-srv-bk-row-meta">
              <span title={new Date(backup.createdAt).toLocaleString()}>Created {formatActivityTime(backup.createdAt)}</span>
              <span>{formatBackupBytes(backup.bytes)}</span>
              {backup.completedAt ? <span>Finished {formatActivityTime(backup.completedAt)}</span> : null}
            </div>
            {ignoredLabel ? (
              <p className="ds-srv-bk-row-ignores">
                Ignores: {ignoredLabel.split('\n').slice(0, 3).join(', ')}
                {ignoredLabel.split('\n').length > 3 ? '…' : ''}
              </p>
            ) : null}
          </div>

          <div className="ds-srv-bk-row-actions">
            {backup.isSuccessful ? (
              <>
                <button type="button" className="ds-srv-bk-row-btn" title="Download" disabled={busy} onClick={onDownload}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Download</span>
                </button>
                {canRestore ? (
                  <button type="button" className="ds-srv-bk-row-btn" title="Restore" disabled={busy} onClick={onRestore}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden sm:inline">Restore</span>
                  </button>
                ) : null}
              </>
            ) : null}
            {canDelete ? (
              <button type="button" className="ds-srv-bk-row-btn" title={backup.isLocked ? 'Unlock' : 'Lock'} disabled={busy} onClick={onLock}>
                {backup.isLocked ? <Unlock className="h-3.5 w-3.5" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
                <span className="hidden sm:inline">{backup.isLocked ? 'Unlock' : 'Lock'}</span>
              </button>
            ) : null}
            {canDelete && !backup.isLocked ? (
              <button type="button" className="ds-srv-bk-row-btn ds-srv-bk-row-btn--danger" title="Delete" disabled={busy} onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Delete</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
