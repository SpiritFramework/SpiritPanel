import type { ServerScheduleSummary } from './api';
import type { ScheduleFormSeed } from '../components/CreateScheduleModal';
import { inferFormAction, type ScheduleActionKind } from './schedule-helpers';

export type ScheduleFilter = 'all' | 'active' | 'paused';

export const QUICK_TEMPLATES: Array<{ label: string; hint: string; seed: ScheduleFormSeed }> = [
  {
    label: 'Nightly restart',
    hint: 'Daily 4 AM UTC',
    seed: { name: 'Nightly restart', cronPreset: 'daily-4', action: 'restart' },
  },
  {
    label: 'Weekly backup',
    hint: 'Sunday 3 AM UTC',
    seed: { name: 'Weekly backup', cronPreset: 'weekly', action: 'backup', backupName: 'Weekly backup' },
  },
  {
    label: 'Every 6 hours',
    hint: 'Routine restart',
    seed: { name: '6-hour restart', cronPreset: '6h', action: 'restart' },
  },
];

export function matchesScheduleSearch(schedule: ServerScheduleSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const action = inferFormAction(schedule.tasks);
  const haystack = [schedule.name, schedule.cron, action].join(' ').toLowerCase();
  return haystack.includes(q);
}

export function matchesScheduleFilter(schedule: ServerScheduleSummary, filter: ScheduleFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return schedule.isActive;
  return !schedule.isActive;
}

export function scheduleActionKind(schedule: ServerScheduleSummary): ScheduleActionKind {
  return inferFormAction(schedule.tasks);
}
