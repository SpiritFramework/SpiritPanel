import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ServerBackupSummary, type ServerResourceQuotaResponse } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { useToast } from '../context/ToastContext';
import { getServerAccess } from '../lib/server-access';
import {
  backupBytesValue,
  matchesBackupFilter,
  matchesBackupSearch,
  type BackupFilter,
} from '../lib/backup-utils';

export function useServerBackups() {
  const id = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);

  const [data, setData] = useState<ServerResourceQuotaResponse<ServerBackupSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'restore'; backup: ServerBackupSummary } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BackupFilter>('all');
  const pollRef = useRef<number | null>(null);

  const backups = data?.items ?? [];
  const limit = data?.limit ?? server.backupLimit ?? 0;
  const used = data?.used ?? backups.length;
  const canCreate = data !== null ? data.canCreate : false;
  const disk = data?.disk;

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

  const filteredBackups = useMemo(
    () => backups.filter((b) => matchesBackupFilter(b, filter) && matchesBackupSearch(b, search)),
    [backups, filter, search],
  );

  const totalBytes = useMemo(() => {
    if (disk?.backupBytes != null) return disk.backupBytes;
    return backups.reduce((sum, b) => sum + backupBytesValue(b.bytes), 0);
  }, [backups, disk]);

  const pendingCount = backups.filter((b) => !b.isSuccessful && !b.completedAt).length;
  const completeCount = backups.filter((b) => b.isSuccessful).length;
  const failedCount = backups.filter((b) => !b.isSuccessful && b.completedAt).length;
  const atLimit = used >= limit;
  const slotsLeft = Math.max(0, limit - used);
  const hasActiveFilters = filter !== 'all' || Boolean(search.trim());

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

  return {
    server,
    access,
    backups,
    filteredBackups,
    loading,
    error,
    showCreate,
    setShowCreate,
    actioning,
    confirm,
    setConfirm,
    confirmLoading,
    search,
    setSearch,
    filter,
    setFilter,
    limit,
    used,
    canCreate,
    disk,
    totalBytes,
    pendingCount,
    completeCount,
    failedCount,
    atLimit,
    slotsLeft,
    hasActiveFilters,
    load,
    handleCreate,
    executeConfirm,
    handleLock,
    handleDownload,
  };
}
