import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarClock,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCw,
  Square,
  Terminal,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, type ServerScheduleSummary } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { formatActivityTime } from '../../lib/activity';
import {
  describeCron,
  formatScheduleTask,
  inferFormAction,
  SCHEDULE_ACTIONS,
  type ScheduleActionKind,
} from '../../lib/schedule-helpers';
import { CreateScheduleModal, type ScheduleFormSeed } from '../../components/CreateScheduleModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Button } from '../../components/Layout';
import {
  ServerErrorBanner,
  ServerListCard,
  ServerLoadingBlock,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';
import { EmptyState, StatCard, StatusPill } from '../../components/ui';

const ACTION_ICONS: Record<ScheduleActionKind, LucideIcon> = {
  restart: RotateCw,
  start: Play,
  stop: Square,
  kill: Zap,
  command: Terminal,
  backup: Archive,
};

const QUICK_TEMPLATES: Array<{ label: string; hint: string; seed: ScheduleFormSeed }> = [
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

export function ServerSchedulesPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);
  const toast = useToast();
  const [schedules, setSchedules] = useState<ServerScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createSeed, setCreateSeed] = useState<ScheduleFormSeed | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ServerScheduleSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setSchedules(await api.client.schedules(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const activeCount = useMemo(() => schedules.filter((s) => s.isActive).length, [schedules]);
  const pausedCount = schedules.length - activeCount;
  const activePercent = schedules.length > 0 ? Math.round((activeCount / schedules.length) * 100) : 0;

  function openCreate(seed?: ScheduleFormSeed) {
    setCreateSeed(seed);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateSeed(undefined);
  }

  async function handleCreate(data: {
    name: string;
    cron: string;
    onlyWhenOnline: boolean;
    tasks: Array<{ action: string; payload: string; sequenceId: number }>;
  }) {
    if (!id) return;
    await api.client.createSchedule(id, data);
    toast.success('Schedule created', `"${data.name}" is ready to run.`);
    await load();
  }

  async function toggleActive(schedule: ServerScheduleSummary) {
    setError('');
    try {
      await api.client.updateSchedule(schedule.id, { isActive: !schedule.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    }
  }

  async function runNow(scheduleId: string) {
    setRunningId(scheduleId);
    setError('');
    try {
      await api.client.executeSchedule(scheduleId);
      toast.success('Schedule executed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run schedule');
    } finally {
      setRunningId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError('');
    try {
      await api.client.deleteSchedule(deleteTarget.id);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <ServerPage>
      <ServerPageHeader
        title="Schedules"
        description={`Automate restarts, backups, and commands — all times UTC`}
        actions={
          access.canManageSchedules ? (
            <Button type="button" size="sm" disabled={loading} onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              New schedule
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {!loading && (
        <>
          <ServerNotice tone="info">
            Schedules run on the panel in <strong className="font-medium text-[var(--text)]">UTC</strong>. Use them for
            off-peak restarts, automated backups, or console commands — active schedules fire on their cron timer, or
            use <strong className="font-medium text-[var(--text)]">Run now</strong> to test immediately.
          </ServerNotice>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Total schedules"
              value={String(schedules.length)}
              hint={`${activeCount} active · ${pausedCount} paused`}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Active"
              value={String(activeCount)}
              hint="Running on their cron timer"
              icon={<Play className="h-3.5 w-3.5" />}
              tone="success"
            />
            <StatCard
              label="Paused"
              value={String(pausedCount)}
              hint="Disabled until re-enabled"
              icon={<Pause className="h-3.5 w-3.5" />}
              tone={pausedCount > 0 ? 'warning' : 'default'}
            />
          </div>

          {schedules.length > 0 && (
            <section className="resource-quota" aria-label="Active schedules">
              <div className="resource-quota-head">
                <div className="resource-quota-title">
                  <Timer className="h-3.5 w-3.5 accent-text" />
                  <span>Active schedules</span>
                </div>
                <span className="resource-quota-count">
                  {activeCount} / {schedules.length} enabled
                </span>
              </div>
              <div className="resource-quota-bar" aria-hidden>
                <span className="resource-quota-bar-fill" style={{ width: `${activePercent}%` }} />
              </div>
            </section>
          )}
        </>
      )}

      {!access.canManageSchedules && !loading && schedules.length === 0 && (
        <ServerNotice tone="muted">You can view schedules but do not have permission to manage them.</ServerNotice>
      )}

      <ServerPanel
        icon={CalendarClock}
        iconTone="accent"
        title="Your schedules"
        description={
          loading ? 'Loading…' : `${schedules.length} automated task${schedules.length === 1 ? '' : 's'}`
        }
        actions={
          access.canManageSchedules && schedules.length > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              Add schedule
            </Button>
          ) : undefined
        }
        noPadding
      >
        {loading ? (
          <ServerLoadingBlock />
        ) : schedules.length === 0 ? (
          <div className="space-y-4 p-6">
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="No schedules yet"
              description="Set up recurring restarts, backups, or console commands so routine maintenance runs without you."
              action={
                access.canManageSchedules ? (
                  <Button type="button" size="sm" onClick={() => openCreate()}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first schedule
                  </Button>
                ) : undefined
              }
            />
            {access.canManageSchedules && (
              <div className="mx-auto max-w-xl">
                <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Quick start
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {QUICK_TEMPLATES.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => openCreate(template.seed)}
                      className="schedule-template-card"
                    >
                      <span className="schedule-template-card__label">{template.label}</span>
                      <span className="schedule-template-card__hint">{template.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--border)_50%,transparent)] p-3 sm:p-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="py-3 first:pt-0 last:pb-0">
                <ScheduleCard
                  schedule={schedule}
                  canManage={access.canManageSchedules}
                  running={runningId === schedule.id}
                  onToggle={() => toggleActive(schedule)}
                  onRun={() => runNow(schedule.id)}
                  onDelete={() => setDeleteTarget(schedule)}
                />
              </div>
            ))}
          </div>
        )}
      </ServerPanel>

      {showCreate && (
        <CreateScheduleModal initialForm={createSeed} onClose={closeCreate} onCreate={handleCreate} />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete this schedule?"
        detail={deleteTarget?.name}
        description="This removes the automated task permanently. Cron runs and manual triggers will stop for this schedule."
        confirmLabel="Delete schedule"
        tone="danger"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </ServerPage>
  );
}

function ScheduleCard({
  schedule,
  canManage,
  running,
  onToggle,
  onRun,
  onDelete,
}: {
  schedule: ServerScheduleSummary;
  canManage: boolean;
  running: boolean;
  onToggle: () => void;
  onRun: () => void;
  onDelete: () => void;
}) {
  const actionKind = inferFormAction(schedule.tasks);
  const ActionIcon = ACTION_ICONS[actionKind] ?? RotateCw;
  const actionLabel = SCHEDULE_ACTIONS.find((a) => a.id === actionKind)?.label ?? 'Task';
  const actionMeta = SCHEDULE_ACTIONS.find((a) => a.id === actionKind);

  return (
    <ServerListCard highlight={schedule.isActive}>
      <div className="schedule-card-layout">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusPill
              label={schedule.isActive ? 'Active' : 'Paused'}
              tone={schedule.isActive ? 'success' : 'neutral'}
              compact
            />
            {schedule.onlyWhenOnline && <StatusPill label="Online only" tone="info" compact />}
            <StatusPill label={actionLabel} tone="default" compact />
          </div>

          <h3 className="text-sm font-semibold tracking-tight">{schedule.name}</h3>

          {schedule.lastRunAt && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <Clock className="h-3 w-3" />
              Last run {formatActivityTime(schedule.lastRunAt)}
            </p>
          )}
        </div>

        {canManage && (
          <div className="resource-row-actions schedule-card-actions">
            <ServerToolbarButton
              icon={Play}
              label={running ? 'Running…' : 'Run now'}
              onClick={onRun}
              disabled={running}
              active
            />
            <ServerToolbarButton
              icon={schedule.isActive ? Pause : Play}
              label={schedule.isActive ? 'Pause' : 'Enable'}
              onClick={onToggle}
            />
            <button type="button" onClick={onDelete} className="resource-delete-btn">
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="schedule-card__body mt-3">
        <div className="schedule-card__block">
          <div className="schedule-card__block-head">
            <CalendarClock className="h-3.5 w-3.5 accent-text" />
            <span>Frequency</span>
          </div>
          <p className="schedule-card__block-value">{describeCron(schedule.cron)}</p>
          <code className="schedule-card__block-mono">{schedule.cron}</code>
        </div>

        <div className="schedule-card__block">
          <div className="schedule-card__block-head">
            <ActionIcon className="h-3.5 w-3.5 accent-text" />
            <span>Action</span>
          </div>
          <p className="schedule-card__block-value">{actionMeta?.description ?? actionLabel}</p>
          {schedule.tasks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {schedule.tasks.map((task, index) => (
                <span key={`${task.action}-${index}`} className="schedule-task-chip">
                  {formatScheduleTask(task)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </ServerListCard>
  );
}
