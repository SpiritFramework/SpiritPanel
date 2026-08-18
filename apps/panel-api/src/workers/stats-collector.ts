import { getConfig } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import {
  fetchLiveStats,
  pruneAllStatSnapshots,
  recordStatSnapshot,
} from '../services/server-stats.js';
import { pruneOldActivityLogs } from '../services/activity.js';
import { logWingsFailure } from '../lib/wings-sync.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;
let pruneInterval: ReturnType<typeof setInterval> | null = null;

const POLL_MS = 30_000;
const PRUNE_MS = 60 * 60 * 1000;
const CONCURRENCY = 6;
const OFFLINE_POLL_EVERY = 3;

let cycleCount = 0;

async function collectForServer(server: Awaited<ReturnType<typeof loadServers>>[number]) {
  const live = await fetchLiveStats(server);
  if (!live) return;
  await recordStatSnapshot(server.id, live);
}

async function loadServers() {
  cycleCount += 1;
  const includeOffline = cycleCount % OFFLINE_POLL_EVERY === 0;

  return prisma.server.findMany({
    where: {
      suspended: false,
      ...(includeOffline
        ? {}
        : { containerState: { in: ['running', 'starting'] } }),
    },
    include: { node: true },
  });
}

async function runCollection() {
  const servers = await loadServers();
  for (let i = 0; i < servers.length; i += CONCURRENCY) {
    const batch = servers.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((server) =>
        collectForServer(server).catch((err) => {
          logWingsFailure('stats collection failed', err, { serverId: server.id, uuid: server.uuid });
        }),
      ),
    );
  }
}

export function startStatsCollector() {
  if (pollInterval) return;

  const config = getConfig();

  // Activity retention runs even when live stats collection is disabled.
  if (!pruneInterval) {
    void pruneOldActivityLogs().catch((err) => {
      console.error('[activity] Initial prune failed:', err instanceof Error ? err.message : err);
    });
    pruneInterval = setInterval(() => {
      void pruneOldActivityLogs().catch((err) => {
        console.error('[activity] Prune failed:', err instanceof Error ? err.message : err);
      });
      if (!config.disableStatsCollector) {
        void pruneAllStatSnapshots().catch((err) => {
          console.error('[stats] Prune failed:', err instanceof Error ? err.message : err);
        });
      }
    }, PRUNE_MS);
    console.log('[activity] Retention prune scheduled (30 days, hourly)');
  }

  if (config.disableStatsCollector) {
    console.log('[stats] Collector disabled (DISABLE_STATS_COLLECTOR=true)');
    return;
  }

  void runCollection().catch((err) => {
    console.error('[stats] Initial collection failed:', err instanceof Error ? err.message : err);
  });

  pollInterval = setInterval(() => {
    void runCollection().catch((err) => {
      console.error('[stats] Collection failed:', err instanceof Error ? err.message : err);
    });
  }, POLL_MS);

  console.log(
    `[stats] Collector started (every ${POLL_MS / 1000}s, offline every ${OFFLINE_POLL_EVERY} cycles, 8-day retention)`,
  );
}

export function stopStatsCollector() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}
