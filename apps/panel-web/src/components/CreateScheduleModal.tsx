import { useMemo, useState } from 'react';
import {
  Archive,
  CalendarClock,
  Clock,
  Info,
  Play,
  Plus,
  RotateCw,
  Square,
  Terminal,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button, Input } from './Layout';
import {
  buildScheduleTasks,
  CRON_PRESETS,
  cronPresetForValue,
  describeCron,
  SCHEDULE_ACTIONS,
  type ScheduleActionKind,
} from '../lib/schedule-helpers';

const ACTION_ICONS: Record<ScheduleActionKind, LucideIcon> = {
  restart: RotateCw,
  start: Play,
  stop: Square,
  kill: Zap,
  command: Terminal,
  backup: Archive,
};

const DEFAULT_FORM = {
  name: '',
  cronPreset: '6h',
  cron: '0 */6 * * *',
  action: 'restart' as ScheduleActionKind,
  command: '',
  backupName: '',
  onlyWhenOnline: false,
};

export type ScheduleFormSeed = Partial<typeof DEFAULT_FORM> & {
  cronPreset?: string;
};

function formFromSeed(seed?: ScheduleFormSeed) {
  if (!seed) return DEFAULT_FORM;
  const cron =
    seed.cron ??
    CRON_PRESETS.find((p) => p.id === seed.cronPreset)?.cron ??
    DEFAULT_FORM.cron;
  const cronPreset = seed.cronPreset ?? cronPresetForValue(cron);
  return {
    ...DEFAULT_FORM,
    ...seed,
    cron,
    cronPreset,
  };
}

export function CreateScheduleModal({
  onClose,
  onCreate,
  initialForm,
}: {
  onClose: () => void;
  initialForm?: ScheduleFormSeed;
  onCreate: (data: {
    name: string;
    cron: string;
    onlyWhenOnline: boolean;
    tasks: Array<{ action: string; payload: string; sequenceId: number }>;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(() => formFromSeed(initialForm));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cronHint = describeCron(form.cron);
  const showCustomCron =
    form.cronPreset === 'custom' || cronPresetForValue(form.cron) === 'custom';
  const selectedAction = SCHEDULE_ACTIONS.find((a) => a.id === form.action);

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.action === 'command' && !form.command.trim()) return false;
    return true;
  }, [form]);

  function setCronPreset(presetId: string) {
    if (presetId === 'custom') {
      setForm((f) => ({ ...f, cronPreset: 'custom' }));
      return;
    }
    const preset = CRON_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setForm((f) => ({ ...f, cronPreset: presetId, cron: preset.cron }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await onCreate({
        name: form.name.trim(),
        cron: form.cron.trim(),
        onlyWhenOnline: form.onlyWhenOnline,
        tasks: buildScheduleTasks(form),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell wide onClose={onClose} header={
      <div className="resource-modal-header">
        <span className="resource-modal-icon resource-modal-icon--accent">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="resource-modal-title">Create schedule</h2>
          <p className="resource-modal-subtitle">
            Automate power actions, console commands, or backups on a recurring timer.
          </p>
        </div>
      </div>
    }>
      <form onSubmit={handleSubmit} className="resource-modal-body">
        <Input
          label="Schedule name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Nightly restart"
          required
          maxLength={191}
        />

        <div>
          <label className="schedule-field-label">Frequency</label>
          <div className="schedule-preset-grid">
            {CRON_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCronPreset(preset.id)}
                className={`schedule-preset-chip ${form.cronPreset === preset.id ? 'schedule-preset-chip--active' : ''}`}
              >
                <span className="schedule-preset-chip-label">{preset.label}</span>
                <span className="schedule-preset-chip-hint">{preset.hint}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCronPreset('custom')}
              className={`schedule-preset-chip ${form.cronPreset === 'custom' ? 'schedule-preset-chip--active' : ''}`}
            >
              <span className="schedule-preset-chip-label">Custom cron</span>
              <span className="schedule-preset-chip-hint">Advanced expression</span>
            </button>
          </div>

          {showCustomCron && (
            <div className="mt-3">
              <Input
                label="Cron expression"
                hint="minute hour day month weekday — UTC"
                value={form.cron}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cron: e.target.value,
                    cronPreset: cronPresetForValue(e.target.value),
                  })
                }
                placeholder="0 */6 * * *"
                required
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="schedule-cron-preview">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text)]">{cronHint}</p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">{form.cron}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="schedule-field-label">Action</label>
          <div className="schedule-action-grid">
            {SCHEDULE_ACTIONS.map((action) => {
              const Icon = ACTION_ICONS[action.id];
              const active = form.action === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setForm({ ...form, action: action.id })}
                  className={`schedule-action-option ${active ? 'schedule-action-option--active' : ''}`}
                >
                  <span className="schedule-action-option-icon">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="schedule-action-option-label">{action.label}</span>
                  <span className="schedule-action-option-desc">{action.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {form.action === 'command' && (
          <Input
            label="Console command"
            value={form.command}
            onChange={(e) => setForm({ ...form, command: e.target.value })}
            placeholder="say Server restarting in 5 minutes"
            required
          />
        )}

        {form.action === 'backup' && (
          <Input
            label="Backup name (optional)"
            value={form.backupName}
            onChange={(e) => setForm({ ...form, backupName: e.target.value })}
            placeholder="Scheduled backup"
          />
        )}

        <label className="schedule-toggle">
          <input
            type="checkbox"
            checked={form.onlyWhenOnline}
            onChange={(e) => setForm({ ...form, onlyWhenOnline: e.target.checked })}
            className="mt-0.5 rounded border-[var(--border)]"
          />
          <span>
            <span className="block text-xs font-medium text-[var(--text)]">Only when server is online</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--muted)]">
              Skip this run if the server is stopped or offline
            </span>
          </span>
        </label>

        <div className="resource-modal-info">
          <Info className="h-3.5 w-3.5 shrink-0 accent-text" />
          <p>
            All times use <strong className="font-medium text-[var(--text)]">UTC</strong>.
            {selectedAction ? ` This schedule will ${selectedAction.description.toLowerCase()}.` : null}
          </p>
        </div>

        {error && <div className="resource-modal-error">{error}</div>}

        <div className="resource-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !canSubmit}>
            <Plus className="h-3.5 w-3.5" />
            {loading ? 'Creating…' : 'Create schedule'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
