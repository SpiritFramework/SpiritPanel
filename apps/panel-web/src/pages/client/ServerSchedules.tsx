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
import { CreateScheduleModal } from '../../components/CreateScheduleModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Button } from '../../components/Layout';
import {
  ServerErrorBanner,
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
        description="Automate restarts, backups, and console commands on a cron timer (UTC)"
        actions={
          access.canManageSchedules ? (
            <Button type="button" size="sm" disabled={loading} onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New schedule
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {!loading && (
        <section className="schedule-hero">
          <div className="schedule-hero-icon">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="schedule-hero-title">Server automation</p>
            <p className="schedule-hero-text">
              Schedules run on the panel in UTC. Use them for routine restarts, off-peak backups, or timed
              console commands.
            </p>
          </div>
        </section>
      )}

      {!loading && schedules.length > 0 && (
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
      )}

      {!access.canManageSchedules && !loading && schedules.length === 0 && (
        <ServerNotice tone="muted">You can view schedules but do not have permission to manage them.</ServerNotice>
      )}

      <ServerPanel
        icon={CalendarClock}
        iconTone="violet"
        title="Your schedules"
        description={
          loading ? 'Loading…' : `${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`
        }
        noPadding
      >
        {loading ? (
          <ServerLoadingBlock />
        ) : schedules.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="No schedules yet"
              description="Automated tasks help with restarts, backups, and routine commands without manual intervention."
              action={
                access.canManageSchedules ? (
                  <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first schedule
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="resource-list">
            {schedules.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                canManage={access.canManageSchedules}
                running={runningId === schedule.id}
                onToggle={() => toggleActive(schedule)}
                onRun={() => runNow(schedule.id)}
                onDelete={() => setDeleteTarget(schedule)}
              />
            ))}
          </ul>
        )}
      </ServerPanel>

      {showCreate && (
        <CreateScheduleModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
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

function ScheduleRow({
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

  return (
    <li className="resource-list-item">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`resource-list-icon ${
            schedule.isActive ? 'resource-list-icon--success' : 'resource-list-icon--muted'
          }`}
        >
          <ActionIcon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{schedule.name}</h3>
            <StatusPill
              label={schedule.isActive ? 'Active' : 'Paused'}
              tone={schedule.isActive ? 'success' : 'neutral'}
              compact
            />
            {schedule.onlyWhenOnline && (
              <span className="schedule-tag schedule-tag--cyan">Online only</span>
            )}
          </div>

          <div className="schedule-meta-grid">
            <div className="schedule-meta-block">
              <p className="schedule-meta-label">Frequency</p>
              <p className="schedule-meta-value">{describeCron(schedule.cron)}</p>
              <p className="schedule-meta-mono">{schedule.cron}</p>
            </div>
            <div className="schedule-meta-block">
              <p className="schedule-meta-label">Action</p>
              <p className="schedule-meta-value">{actionLabel}</p>
              {schedule.tasks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {schedule.tasks.map((task, index) => (
                    <span key={`${task.action}-${index}`} className="schedule-task-chip">
                      {formatScheduleTask(task)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {schedule.lastRunAt && (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <Clock className="h-3 w-3" />
              Last run {formatActivityTime(schedule.lastRunAt)}
            </p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="resource-row-actions flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          <ServerToolbarButton
            icon={Play}
            label={running ? 'Running…' : 'Run now'}
            onClick={onRun}
            disabled={running}
          />
          <ServerToolbarButton
            icon={schedule.isActive ? Pause : Play}
            label={schedule.isActive ? 'Pause' : 'Enable'}
            onClick={onToggle}
            active={!schedule.isActive}
          />
          <button type="button" onClick={onDelete} className="resource-delete-btn">
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
