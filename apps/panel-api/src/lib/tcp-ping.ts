import net from 'net';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pick the lowest successful sample — standard practice for latency probes. */
export function aggregateTcpPingSamples(samples: number[]): number | null {
  if (samples.length === 0) return null;
  return Math.min(...samples);
}

function measureTcpPingOnce(host: string, port: number, timeoutMs: number): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(Date.now() - start));
    socket.once('timeout', () => finish(null));
    socket.once('error', () => finish(null));

    socket.connect(port, host);
  });
}

export interface MeasureTcpPingOptions {
  /** Number of TCP connect attempts (default 3). */
  samples?: number;
  /** Per-attempt timeout in ms (default 2500). */
  timeoutMs?: number;
  /** Gap between attempts in ms (default 40). */
  gapMs?: number;
}

/**
 * Measure TCP connect latency (ms) from this host to a game/allocation port.
 * Runs several quick probes and returns the minimum successful sample.
 */
export async function measureTcpPing(
  host: string,
  port: number,
  opts: MeasureTcpPingOptions = {},
): Promise<number | null> {
  const samples = Math.max(1, opts.samples ?? 3);
  const timeoutMs = opts.timeoutMs ?? 2500;
  const gapMs = opts.gapMs ?? 40;

  const results: number[] = [];
  for (let i = 0; i < samples; i++) {
    const ms = await measureTcpPingOnce(host, port, timeoutMs);
    if (ms != null) results.push(ms);
    if (i < samples - 1) await sleep(gapMs);
  }

  return aggregateTcpPingSamples(results);
}
