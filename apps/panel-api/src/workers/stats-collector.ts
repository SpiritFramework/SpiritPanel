import { getConfig } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import {
  fetchLiveStats,
  pruneStatSnapshots,
  recordStatSnapshot,
} from '../services/server-stats.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;

const POLL_MS = 30_000;
const CONCURRENCY = 6;

async function collectForServer(server: Awaited<ReturnType<typeof loadServers>>[number]) {
  const live = await fetchLiveStats(server);
  if (!live) return;
  await recordStatSnapshot(server.id, live);
  await pruneStatSnapshots(server.id);
}

async function loadServers() {
  return prisma.server.findMany({
    where: { suspended: false },
    include: { node: true },
  });
}

async function runCollection() {
  const servers = await loadServers();
  for (let i = 0; i < servers.length; i += CONCURRENCY) {
    const batch = servers.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((server) => collectForServer(server).catch(() => {})));
  }
}

export function startStatsCollector() {
  if (pollInterval) return;

  const config = getConfig();
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

  console.log(`[stats] Collector started (every ${POLL_MS / 1000}s, 8-day retention)`);
}

export function stopStatsCollector() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
