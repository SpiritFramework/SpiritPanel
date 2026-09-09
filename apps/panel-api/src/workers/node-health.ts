import { getConfig } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { probeNodeHealth } from '../lib/node-health.js';
import { resyncNodeContainerStates } from '../services/node-resync.js';
import { evaluateNodeOfflineAlerts } from '../services/alerts.js';
import { logWingsFailure } from '../lib/wings-sync.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;

const POLL_MS = 15_000;
const lastOnlineByNodeId = new Map<string, boolean>();

async function probeAllNodes() {
  const nodes = await prisma.node.findMany();
  for (const node of nodes) {
    const probe = await probeNodeHealth(node);
    const wasOnline = lastOnlineByNodeId.get(node.id);
    lastOnlineByNodeId.set(node.id, probe.online);

    if (wasOnline === true && !probe.online) {
      try {
        await evaluateNodeOfflineAlerts(node);
      } catch (err) {
        logWingsFailure('node offline alert failed', err, { nodeId: node.id });
      }
    } else if (wasOnline === false && probe.online) {
      try {
        const result = await resyncNodeContainerStates(node.id);
        console.info(
          `[node-health] Wings reconnected on ${node.name}: polled ${result.serversPolled}, updated ${result.serversUpdated}`,
        );
      } catch (err) {
        logWingsFailure('node reconnect resync failed', err, { nodeId: node.id });
      }
    } else if (wasOnline === undefined) {
      // Seed initial state without triggering resync on first poll.
      lastOnlineByNodeId.set(node.id, probe.online);
    }
  }
}

export function startNodeHealthWorker() {
  if (pollInterval) return;

  const config = getConfig();
  if (config.disableNodeHealthWorker) {
    console.info('[node-health] Worker disabled via DISABLE_NODE_HEALTH_WORKER');
    return;
  }

  void probeAllNodes().catch((err) => {
    logWingsFailure('initial node health probe failed', err);
  });

  pollInterval = setInterval(() => {
    void probeAllNodes().catch((err) => {
      logWingsFailure('node health probe cycle failed', err);
    });
  }, POLL_MS);

  console.info(`[node-health] Worker started (interval ${POLL_MS / 1000}s)`);
}

export function stopNodeHealthWorker() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
