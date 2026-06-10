export type ScheduleActionKind = 'restart' | 'start' | 'stop' | 'kill' | 'command' | 'backup';

export const CRON_PRESETS: Array<{ id: string; label: string; cron: string; hint: string }> = [
  { id: 'hourly', label: 'Every hour', cron: '0 * * * *', hint: 'At minute 0 each hour' },
  { id: '6h', label: 'Every 6 hours', cron: '0 */6 * * *', hint: 'Four times per day' },
  { id: '12h', label: 'Every 12 hours', cron: '0 */12 * * *', hint: 'Twice per day' },
  { id: 'daily-4', label: 'Daily at 4:00 AM', cron: '0 4 * * *', hint: 'Once per day (UTC)' },
  { id: 'daily-0', label: 'Daily at midnight', cron: '0 0 * * *', hint: 'Once per day (UTC)' },
  { id: 'weekly', label: 'Weekly (Sunday 3 AM)', cron: '0 3 * * 0', hint: 'Once per week (UTC)' },
];

export const SCHEDULE_ACTIONS: Array<{
  id: ScheduleActionKind;
  label: string;
  description: string;
}> = [
  { id: 'restart', label: 'Restart server', description: 'Graceful restart' },
  { id: 'start', label: 'Start server', description: 'Power on if offline' },
  { id: 'stop', label: 'Stop server', description: 'Graceful shutdown' },
  { id: 'kill', label: 'Kill server', description: 'Force stop' },
  { id: 'command', label: 'Run command', description: 'Send a console command' },
  { id: 'backup', label: 'Create backup', description: 'Snapshot server files' },
];

export function cronPresetForValue(cron: string): string {
  const match = CRON_PRESETS.find((p) => p.cron === cron.trim());
  return match?.id ?? 'custom';
}

export function describeCron(cron: string): string {
  const preset = CRON_PRESETS.find((p) => p.cron === cron.trim());
  if (preset) return preset.hint;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Custom schedule';
  const [min, hour, dom, mon, dow] = parts;
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    const n = hour.slice(2);
    return `Every ${n} hours (UTC)`;
  }
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'Every hour (UTC)';
  if (min === '0' && /^\d+$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
  }
  return 'Custom cron (UTC)';
}

export function formatScheduleTask(task: { action: string; payload: string }): string {
  if (task.action === 'power') {
    const action = task.payload || 'restart';
    return SCHEDULE_ACTIONS.find((a) => a.id === action)?.label ?? `Power: ${action}`;
  }
  if (task.action === 'command') {
    return task.payload ? `Command: ${task.payload}` : 'Run command';
  }
  if (task.action === 'backup') {
    return task.payload ? `Backup: ${task.payload}` : 'Create backup';
  }
  return `${task.action}: ${task.payload}`;
}

export function buildScheduleTasks(form: {
  action: ScheduleActionKind;
  command: string;
  backupName: string;
}): Array<{ action: string; payload: string; sequenceId: number }> {
  if (form.action === 'command') {
    return [{ action: 'command', payload: form.command.trim(), sequenceId: 1 }];
  }
  if (form.action === 'backup') {
    return [{ action: 'backup', payload: form.backupName.trim(), sequenceId: 1 }];
  }
  return [{ action: 'power', payload: form.action, sequenceId: 1 }];
}

export function inferFormAction(tasks: Array<{ action: string; payload: string }>): ScheduleActionKind {
  const first = tasks[0];
  if (!first) return 'restart';
  if (first.action === 'command') return 'command';
  if (first.action === 'backup') return 'backup';
  if (first.action === 'power') {
    const p = first.payload as ScheduleActionKind;
    if (['start', 'stop', 'kill', 'restart'].includes(p)) return p;
  }
  return 'restart';
}
