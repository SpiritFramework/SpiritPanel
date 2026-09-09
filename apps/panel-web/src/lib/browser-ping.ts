/** Aggregate browser probe samples the same way as TCP ping (lowest successful). */
export function aggregateBrowserPingSamples(samples: number[]): number | null {
  if (samples.length === 0) return null;
  return Math.min(...samples);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prefer HTTPS when the panel itself is HTTPS (mixed-content blocks http probes). */
export function browserSafeProbeUrl(probeUrl: string): string {
  if (typeof window === 'undefined') return probeUrl;
  if (window.location.protocol === 'https:' && probeUrl.startsWith('http:')) {
    return `https:${probeUrl.slice('http:'.length)}`;
  }
  return probeUrl;
}

/**
 * One RTT sample from the user's browser to a node probe URL.
 * Uses no-cors so Wings/nginx need not allow the panel origin — we only need network timing.
 *
 * Note: FeatherWings has no document at `/`, so DevTools may show a benign 404 for this GET.
 * That response still proves the daemon edge is reachable.
 */
export function measureBrowserProbeOnce(url: string, timeoutMs = 2500): Promise<number | null> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const start = performance.now();

    void fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then(() => {
        resolve(Math.max(1, Math.round(performance.now() - start)));
      })
      .catch(() => {
        const elapsed = Math.round(performance.now() - start);
        // Timeout → unreachable. Faster failures often still reflect connect RTT.
        resolve(elapsed >= timeoutMs - 50 ? null : Math.max(1, elapsed));
      })
      .finally(() => {
        window.clearTimeout(timer);
      });
  });
}

export interface MeasureBrowserProbeOptions {
  samples?: number;
  timeoutMs?: number;
  gapMs?: number;
}

/** Several quick browser probes; returns the minimum successful sample. */
export async function measureBrowserProbe(
  probeUrl: string,
  opts: MeasureBrowserProbeOptions = {},
): Promise<number | null> {
  const url = browserSafeProbeUrl(probeUrl);
  const samples = Math.max(1, opts.samples ?? 3);
  const timeoutMs = opts.timeoutMs ?? 2500;
  const gapMs = opts.gapMs ?? 40;

  const results: number[] = [];
  for (let i = 0; i < samples; i++) {
    const ms = await measureBrowserProbeOnce(url, timeoutMs);
    if (ms != null) results.push(ms);
    if (i < samples - 1) await sleep(gapMs);
  }

  return aggregateBrowserPingSamples(results);
}
