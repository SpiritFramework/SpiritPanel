import { clearNodeHealthCacheForNode } from '../lib/node-health-cache.js';
import { refreshNodeServerContainerStates } from './server-runtime-status.js';

/** Re-poll every server on a node after Wings reconnect or boot reset. */
export async function resyncNodeContainerStates(nodeId: string): Promise<{
  serversPolled: number;
  serversUpdated: number;
  pollFailures: number;
}> {
  clearNodeHealthCacheForNode(nodeId);
  return refreshNodeServerContainerStates(nodeId);
}
