import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type DatabaseManagerMeta,
  type ServerDatabaseSummary,
  type ServerResourceQuotaResponse,
} from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import { matchesDatabaseSearch } from '../lib/database-utils';

const DEFAULT_MANAGER: DatabaseManagerMeta = {
  enabled: false,
  allowSqlConsole: false,
  allowDataEdits: false,
  canEdit: false,
};

export function useServerDatabases() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);

  const [data, setData] = useState<
    (ServerResourceQuotaResponse<ServerDatabaseSummary> & { manager: DatabaseManagerMeta }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServerDatabaseSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [managerTarget, setManagerTarget] = useState<ServerDatabaseSummary | null>(null);

  const databases = data?.items ?? [];
  const manager = data?.manager ?? DEFAULT_MANAGER;
  const limit = data?.limit ?? server.databaseLimit ?? 0;
  const used = data?.used ?? databases.length;
  const canCreate = data !== null ? data.canCreate : false;
  const slotsLeft = Math.max(0, limit - used);
  const atLimit = limit > 0 && used >= limit;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;

  const hostPools = useMemo(
    () => [...new Set(databases.map((db) => db.hostName).filter(Boolean))],
    [databases],
  );

  const filteredDatabases = useMemo(
    () => databases.filter((db) => matchesDatabaseSearch(db, search)),
    [databases, search],
  );

  async function load() {
    if (!id) return;
    setError('');
    try {
      setData(await api.client.databases(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
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

  async function handleCreate(payload: { name: string; remote: string }) {
    if (!id) return;
    await api.client.createDatabase(id, payload);
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setActioning(deleteTarget.id);
    setError('');
    try {
      await api.client.deleteDatabase(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete database');
    } finally {
      setDeleteLoading(false);
      setActioning(null);
    }
  }

  return {
    server,
    access,
    databases,
    filteredDatabases,
    loading,
    error,
    showCreate,
    setShowCreate,
    actioning,
    deleteTarget,
    setDeleteTarget,
    deleteLoading,
    search,
    setSearch,
    limit,
    used,
    canCreate,
    slotsLeft,
    atLimit,
    usagePercent,
    hostPools,
    manager,
    managerTarget,
    setManagerTarget,
    hasSearch: Boolean(search.trim()),
    load,
    handleCreate,
    confirmDelete,
  };
}
