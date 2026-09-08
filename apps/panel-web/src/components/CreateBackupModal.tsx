import { useState } from 'react';
import { Archive, HardDrive, Info, Plus } from 'lucide-react';
import type { ServerBackupDiskBudget } from '../lib/api';
import { formatBytes } from '../lib/stats';
import { ModalShell } from './ModalShell';
import { Button, Input, Textarea } from './Layout';

export function CreateBackupModal({
  onClose,
  onCreate,
  backupCount = 0,
  backupLimit = 0,
  canCreate = true,
  disk,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; ignored?: string }) => Promise<void>;
  backupCount?: number;
  backupLimit?: number;
  canCreate?: boolean;
  disk?: ServerBackupDiskBudget;
}) {
  const [name, setName] = useState('');
  const [ignored, setIgnored] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const atLimit = backupCount >= backupLimit;
  const slotsLeft = Math.max(0, backupLimit - backupCount);
  const disabled = backupLimit === 0;
  const diskFull = disk ? !disk.canFitEstimatedBackup : false;
  const blocked = atLimit || !canCreate || disabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), ignored: ignored.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      header={
        <div className="resource-modal-header">
          <span className="resource-modal-icon resource-modal-icon--green">
            <Archive className="h-4 w-4" />
          </span>
          <div>
            <h2 className="resource-modal-title">Create backup</h2>
            <p className="resource-modal-subtitle">
              FeatherWings archives your server files on the node for restore or download.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="resource-modal-body">
        <div className={`resource-modal-quota ${atLimit || diskFull ? 'resource-modal-quota--danger' : ''}`}>
          {disabled
            ? 'Backups are disabled on this server (limit 0).'
            : atLimit
              ? `Backup limit reached (${backupLimit}). Delete an existing backup first.`
              : `${backupCount} of ${backupLimit} backups used · ${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left`}
        </div>

        {disk && !disabled && !atLimit && diskFull ? (
          <div className="resource-modal-quota resource-modal-quota--danger">
            <HardDrive className="inline h-3.5 w-3.5 shrink-0" aria-hidden />
            {' '}
            Not enough disk space for a new backup
            {disk.limitBytes != null
              ? ` (${formatBytes(disk.usedBytes)} used, ~${formatBytes(disk.estimatedBackupBytes)} needed)`
              : ''}
            . Free space or delete files/backups first.
          </div>
        ) : null}

        {disk && !disabled && disk.limitBytes != null && !diskFull ? (
          <div className="resource-modal-info">
            <HardDrive className="h-3.5 w-3.5 shrink-0 accent-text" aria-hidden />
            <p>
              Disk: {formatBytes(disk.usedBytes)} / {formatBytes(disk.limitBytes)} used
              {disk.freeBytes != null ? ` · ${formatBytes(disk.freeBytes)} free` : ''}
            </p>
          </div>
        ) : null}

        <Input
          label="Backup name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Before plugin update"
          required
          maxLength={191}
          disabled={blocked}
        />

        <Textarea
          label="Ignored files (optional)"
          hint="One glob per line — e.g. *.log or cache/*"
          value={ignored}
          onChange={(e) => setIgnored(e.target.value)}
          rows={4}
          placeholder={'*.log\ncache/*\nlogs/'}
          disabled={blocked}
        />

        <div className="resource-modal-info">
          <Info className="h-3.5 w-3.5 shrink-0 accent-text" />
          <p>
            Backups run in the background. Large servers may take several minutes. You can lock completed
            backups to prevent accidental deletion.
          </p>
        </div>

        {error ? <div className="resource-modal-error">{error}</div> : null}

        <div className="resource-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || blocked || !name.trim()}>
            <Plus className="h-3.5 w-3.5" />
            {loading ? 'Starting…' : 'Start backup'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
