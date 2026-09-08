import { useCallback, useState } from 'react';
import { api, type ActivityLogEntry } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerManageBase } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import type { ActivityEntry } from '../lib/activity';
import { useToast } from '../context/ToastContext';

function mapActivityEntry(row: ActivityLogEntry): ActivityEntry {
  return {
    id: row.id,
    event: row.event,
    description: row.description,
    ip: row.ip,
    timestamp: row.timestamp,
    actor: row.actor,
  };
}

export function useServerActivityPage() {
  const { serverId: id, isAdminManage } = useServerManageBase();
  const { server } = useServer();
  const access = getServerAccess(server);
  const toast = useToast();
  const [refreshToken, setRefreshToken] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [totals, setTotals] = useState({ total: 0, loaded: 0, filtered: 0, hasActiveFilters: false });

  const canClear = access.isOwner || access.isAdminSupport || isAdminManage;

  const fetchPage = useCallback(
    async (cursor: string | null, limit: number) => {
      if (!id) return { items: [], total: 0, hasMore: false, nextCursor: null };
      const result = await api.client.activity(id, { limit, cursor });
      return {
        items: result.items.map(mapActivityEntry),
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    [id],
  );

  async function clearActivity() {
    if (!id || !canClear) return false;
    setClearing(true);
    setClearError('');
    try {
      const result = isAdminManage
        ? await api.admin.clearServerActivity(id)
        : await api.client.clearActivity(id);
      toast.success(
        result.deleted === 0
          ? 'Activity log was already empty'
          : `Deleted ${result.deleted} activity event${result.deleted === 1 ? '' : 's'}`,
      );
      setRefreshToken((n) => n + 1);
      return true;
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Could not clear activity');
      return false;
    } finally {
      setClearing(false);
    }
  }

  return {
    server,
    canClear,
    refreshToken,
    refresh: () => setRefreshToken((n) => n + 1),
    clearing,
    clearError,
    setClearError,
    clearActivity,
    totals,
    setTotals,
    fetchPage,
  };
}
