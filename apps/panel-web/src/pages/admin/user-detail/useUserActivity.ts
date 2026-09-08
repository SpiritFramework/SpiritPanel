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
    server: row.server ?? null,
  };
}

export function useUserActivity(userId: string) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [totals, setTotals] = useState({
    total: 0,
    loaded: 0,
    filtered: 0,
    hasActiveFilters: false,
  });

  const fetchPage = useCallback(
    async (cursor: string | null, limit: number) => {
      if (!userId) return { items: [], total: 0, hasMore: false, nextCursor: null };
      const result = await api.admin.userActivity(userId, { limit, cursor });
      return {
        items: result.items.map(mapActivityEntry),
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    [userId],
  );

  return {
    refreshToken,
    refresh: () => setRefreshToken((n) => n + 1),
    totals,
    setTotals,
    fetchPage,
  };
}
