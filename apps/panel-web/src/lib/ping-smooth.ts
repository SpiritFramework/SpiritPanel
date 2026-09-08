/** Smooth displayed latency so occasional spikes do not jump the UI by hundreds of ms. */
export function smoothPingReading(previous: number | null, sample: number): number {
  const normalized = Math.max(1, Math.round(sample));
  if (previous == null || !Number.isFinite(previous)) return normalized;
  // Bias toward the latest reading while damping single outliers.
  return Math.max(1, Math.round(previous * 0.5 + normalized * 0.5));
}
