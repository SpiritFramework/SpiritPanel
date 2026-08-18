/**
 * Request deduplication to prevent duplicate operations
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const REQUEST_DEDUP_TIMEOUT = 5000; // 5 seconds

/** Generate a unique key for request deduplication */
export function generateRequestKey(method: string, resource: string, params?: Record<string, any>): string {
  const paramString = params ? JSON.stringify(params) : '';
  return `${method}:${resource}:${paramString}`;
}

/** Execute a request with deduplication */
export async function dedupRequest<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const pending = pendingRequests.get(key);
  const now = Date.now();

  // Return existing promise if still pending
  if (pending && now - pending.timestamp < REQUEST_DEDUP_TIMEOUT) {
    return pending.promise;
  }

  // Clean up old pending requests
  for (const [k, v] of pendingRequests.entries()) {
    if (now - v.timestamp > REQUEST_DEDUP_TIMEOUT) {
      pendingRequests.delete(k);
    }
  }

  // Execute new request
  const promise = fn();
  pendingRequests.set(key, { promise, timestamp: now });

  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}

/** Clear deduplication cache */
export function clearDedupCache(): void {
  pendingRequests.clear();
}

/** Get statistics about pending requests */
export function getDedupStats() {
  return {
    pending: pendingRequests.size,
    maxPending: 100,
  };
}
