import { useCallback, useState } from 'react';
import { api, type ActivityLogEntry } from '../../../lib/api';
import type { ActivityEntry } from '../../../lib/activity';

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

export function useServerActivity(serverId: string) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [totals, setTotals] = useState({
    total: 0,
    loaded: 0,
    filtered: 0,
    hasActiveFilters: false,
  });

  const fetchPage = useCallback(
    async (cursor: string | null, limit: number) => {
      if (!serverId) return { items: [], total: 0, hasMore: false, nextCursor: null };
      const result = await api.client.activity(serverId, { limit, cursor });
      return {
        items: result.items.map(mapActivityEntry),
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    [serverId],
  );

  async function clearActivity() {
    if (!serverId) return false;
    setClearing(true);
    setClearError('');
    try {
      await api.admin.clearServerActivity(serverId);
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
