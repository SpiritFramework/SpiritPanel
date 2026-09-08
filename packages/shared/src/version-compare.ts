/** Normalize version strings like `v1.3.7.6` into numeric segments for comparison. */
export function parseVersionSegments(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split(/[.+_-]/)
    .map((part) => {
      const match = part.match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });
}

/** Compare two version strings. Returns negative if a < b, positive if a > b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersionSegments(a);
  const right = parseVersionSegments(b);
  const len = Math.max(left.length, right.length);

  for (let i = 0; i < len; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export type VersionCompareStatus = 'unknown' | 'current' | 'behind' | 'ahead';

export function compareVersionStatus(installed: string | null | undefined, latest: string | null | undefined): VersionCompareStatus {
  if (!installed?.trim() || !latest?.trim()) return 'unknown';
  const cmp = compareVersions(installed, latest);
  if (cmp === 0) return 'current';
  if (cmp < 0) return 'behind';
  return 'ahead';
}
