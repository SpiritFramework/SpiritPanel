/** Match a single cron field against a numeric value (supports *, lists, ranges, steps). */
function matchCronField(field: string, value: number): boolean {
  return field.split(',').some((part) => {
    const token = part.trim();
    if (!token) return false;
    if (token === '*') return true;

    const stepMatch = token.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (!Number.isFinite(step) || step <= 0) return false;
      const base = stepMatch[1];
      if (base === '*') return value % step === 0;
      if (base.includes('-')) {
        const [start, end] = base.split('-').map(Number);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
        if (value < start || value > end) return false;
        return (value - start) % step === 0;
      }
      const anchor = Number(base);
      return Number.isFinite(anchor) && value >= anchor && (value - anchor) % step === 0;
    }

    if (token.includes('-')) {
      const [start, end] = token.split('-').map(Number);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      return value >= start && value <= end;
    }

    return Number(token) === value;
  });
}

/**
 * Standard 5-field cron: minute hour day month weekday
 * Weekday: 0-6 (Sunday = 0), also accepts 7 as Sunday.
 */
export function cronMatchesNow(cron: string, date = new Date()): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const weekday = date.getUTCDay();

  const weekdayMatch =
    matchCronField(parts[4], weekday) ||
    (weekday === 0 && matchCronField(parts[4], 7));

  return (
    matchCronField(parts[0], minute) &&
    matchCronField(parts[1], hour) &&
    matchCronField(parts[2], day) &&
    matchCronField(parts[3], month) &&
    weekdayMatch
  );
}

export function validateCronExpression(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  return parts.length >= 5;
}
