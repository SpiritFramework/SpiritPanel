import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  XCircle,
} from 'lucide-react';
import { api, type ServerBackupSummary, type ServerResourceQuotaResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { formatActivityTime } from '../../lib/activity';
import { formatBytes } from '../../lib/stats';
import { CreateBackupModal } from '../../components/CreateBackupModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ResourceQuotaStrip } from '../../components/server/ResourceQuotaStrip';
import { Button } from '../../components/Layout';
import {
  ServerErrorBanner,
  ServerLoadingBlock,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';
import { EmptyState, StatCard, StatusPill } from '../../components/ui';

function formatBackupBytes(bytes: string | number): string {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!n || Number.isNaN(n)) return '—';
  return formatBytes(n);
}

export function ServerBackupsPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);
  const [data, setData] = useState<ServerResourceQuotaResponse<ServerBackupSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    { kind: 'delete' | 'restore'; backup: ServerBackupSummary } | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const backups = data?.items ?? [];
  const limit = data?.limit ?? server.backupLimit ?? 0;
  const used = data?.used ?? backups.length;
  const canCreate = data?.canCreate ?? access.canCreateBackups;

  async function load() {
    if (!id) return;
    setError('');
    try {
      const response = await api.client.backups(id);
      setData(response);
      return response.items;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const hasPending = backups.some((b) => !b.isSuccessful && !b.completedAt);
    if (hasPending && pollRef.current === null) {
      // Poll pending backups every 15 seconds instead of 4 to reduce API load
      pollRef.current = window.setInterval(() => void load(), 15_000);
    } else if (!hasPending && pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backups]);

  const totalBytes = useMemo(
    () =>
      backups.reduce((sum, b) => {
        const n = typeof b.bytes === 'string' ? Number(b.bytes) : b.bytes;
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [backups],
  );

  const pendingCount = backups.filter((b) => !b.isSuccessful && !b.completedAt).length;
  const atLimit = used >= limit;

  async function handleCreate(payload: { name: string; ignored?: string }) {
    if (!id) return;
    await api.client.createBackup(id, payload.name, payload.ignored);
    toast.success('Backup started', 'FeatherWings is archiving your files.');
    await load();
  }

  async function executeConfirm() {
    if (!confirm) return;
    setConfirmLoading(true);
    setActioning(confirm.backup.id);
    try {
      if (confirm.kind === 'delete') {
        await api.client.deleteBackup(confirm.backup.id);
        toast.success('Backup deleted');
      } else {
        await api.client.restoreBackup(confirm.backup.id);
        toast.success('Restore started', 'The server will be unavailable until it completes.');
      }
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(
        confirm.kind === 'delete' ? 'Delete failed' : 'Restore failed',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setConfirmLoading(false);
      setActioning(null);
    }
  }

  async function handleLock(b: ServerBackupSummary) {
    setActioning(b.id);
    try {
      await api.client.lockBackup(b.id, !b.isLocked);
      await load();
    } catch (err) {
      toast.error('Lock toggle failed', err instanceof Error ? err.message : undefined);
    } finally {
      setActioning(null);
    }
  }

  async function handleDownload(b: ServerBackupSummary) {
    setActioning(b.id);
    try {
      await api.client.downloadBackup(b.id);
    } catch (err) {
      toast.error('Download failed', err instanceof Error ? err.message : undefined);
    } finally {
      setActioning(null);
    }
  }

  return (
    <ServerPage>
      <ServerPageHeader
        title="Backups"
        description="Archive server files for restore, migration, or disaster recovery"
        actions={
          access.canCreateBackups && canCreate ? (
            <Button type="button" size="sm" disabled={loading} onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New backup
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {!loading && (
        <>
          <ResourceQuotaStrip
            label="Backups"
            used={used}
            limit={limit}
            canCreate={canCreate}
            icon={<Archive className="h-3.5 w-3.5" />}
          />

          {backups.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Total backups"
                value={`${used} / ${limit}`}
                hint={limit === 0 ? 'Backups disabled (limit 0)' : `${Math.max(0, limit - used)} slots remaining`}
                icon={<Archive className="h-3.5 w-3.5" />}
                tone={atLimit ? 'warning' : 'default'}
              />
              <StatCard
                label="Backup archives"
                value={formatBytes(totalBytes)}
                hint="Combined archive size (counts toward server disk)"
                icon={<HardDrive className="h-3.5 w-3.5" />}
              />
              <StatCard
                label="In progress"
                value={String(pendingCount)}
                hint={pendingCount > 0 ? 'Auto-refreshing status' : 'None running'}
                icon={<Clock className="h-3.5 w-3.5" />}
                tone={pendingCount > 0 ? 'info' : 'default'}
              />
            </div>
          )}
        </>
      )}

      {!access.canCreateBackups && !loading && backups.length === 0 && (
        <ServerNotice tone="muted">You can view backups but do not have permission to create them.</ServerNotice>
      )}

      <ServerPanel
        icon={Archive}
        iconTone="green"
        title="Backup history"
        description={
          loading
            ? 'Loading…'
            : `${used} of ${limit} backups`
        }
        noPadding
      >
        {loading ? (
          <ServerLoadingBlock />
        ) : backups.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Archive className="h-5 w-5" />}
              title="No backups yet"
              description="Create a backup before major updates, plugin installs, or config changes."
              action={
                access.canCreateBackups && canCreate ? (
                  <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first backup
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="resource-list">
            {backups.map((b) => (
              <BackupRow
                key={b.id}
                backup={b}
                busy={actioning === b.id}
                canRestore={access.canCreateBackups}
                canDelete={access.canDeleteBackups}
                onRestore={() => setConfirm({ kind: 'restore', backup: b })}
                onDelete={() => setConfirm({ kind: 'delete', backup: b })}
                onLock={() => handleLock(b)}
                onDownload={() => handleDownload(b)}
              />
            ))}
          </ul>
        )}
      </ServerPanel>

      {showCreate && (
        <CreateBackupModal
          onClose={() => setShowCreate(false)}
          backupCount={used}
          backupLimit={limit}
          canCreate={canCreate}
          onCreate={handleCreate}
        />
      )}

      <ConfirmModal
        open={confirm?.kind === 'delete'}
        title="Delete this backup?"
        detail={confirm?.backup.name}
        description="This permanently removes the archive from the node. Locked backups must be unlocked first."
        confirmLabel="Delete backup"
        tone="danger"
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
        onConfirm={executeConfirm}
      />

      <ConfirmModal
        open={confirm?.kind === 'restore'}
        title="Restore this backup?"
        detail={confirm?.backup.name}
        description="This overwrites current server files and stops the server. Players will be disconnected until the restore completes."
        confirmLabel="Restore backup"
        tone="warning"
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
        onConfirm={executeConfirm}
      />
    </ServerPage>
  );
}

function BackupRow({
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
  const status = backup.isSuccessful ? 'complete' : backup.completedAt ? 'failed' : 'pending';
  const statusMeta = {
    complete: { icon: CheckCircle2, label: 'Complete', tone: 'success' as const },
    failed: { icon: XCircle, label: 'Failed', tone: 'danger' as const },
    pending: { icon: Clock, label: 'In progress', tone: 'info' as const },
  }[status];
  const StatusIcon = statusMeta.icon;

  return (
    <li className="resource-list-item">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`resource-list-icon ${
            status === 'complete'
              ? 'resource-list-icon--success'
              : status === 'failed'
                ? 'resource-list-icon--danger'
                : 'resource-list-icon--info'
          }`}
        >
          <StatusIcon className={`h-4 w-4 ${status === 'pending' ? 'animate-pulse' : ''}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{backup.name}</h3>
            <StatusPill label={statusMeta.label} tone={statusMeta.tone} compact pulse={status === 'pending'} />
            {backup.isLocked && (
              <span className="resource-lock-badge">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)]">
            <span title={new Date(backup.createdAt).toLocaleString()}>{formatActivityTime(backup.createdAt)}</span>
            <span>{formatBackupBytes(backup.bytes)}</span>
            {backup.completedAt && <span>Finished {formatActivityTime(backup.completedAt)}</span>}
          </div>
          {backup.ignored?.trim() && (
            <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]/80">
              Ignores: {backup.ignored.split('\n').slice(0, 3).join(', ')}
              {backup.ignored.split('\n').length > 3 ? '…' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="resource-row-actions flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
        {backup.isSuccessful && (
          <>
            <ServerToolbarButton icon={Download} label="Download" onClick={onDownload} disabled={busy} />
            {canRestore && (
              <ServerToolbarButton icon={RotateCcw} label="Restore" onClick={onRestore} disabled={busy} />
            )}
          </>
        )}
        {canDelete && (
          <ServerToolbarButton
            icon={backup.isLocked ? Unlock : Lock}
            label={backup.isLocked ? 'Unlock' : 'Lock'}
            onClick={onLock}
            disabled={busy}
          />
        )}
        {canDelete && !backup.isLocked && (
          <button type="button" onClick={onDelete} disabled={busy} className="resource-delete-btn">
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
