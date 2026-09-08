import {
  Archive,
  CalendarClock,
  Clock,
  Pause,
  Play,
  RotateCw,
  Square,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ServerScheduleSummary } from '../../../lib/api';
import { formatActivityTime } from '../../../lib/activity';
import {
  describeCron,
  formatScheduleTask,
  inferFormAction,
  SCHEDULE_ACTIONS,
  type ScheduleActionKind,
} from '../../../lib/schedule-helpers';

const ACTION_ICONS: Record<ScheduleActionKind, LucideIcon> = {
  restart: RotateCw,
  start: Play,
  stop: Square,
  kill: Zap,
  command: Terminal,
  backup: Archive,
};

export function ScheduleRow({
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
    <li className={`ds-srv-sch-row${schedule.isActive ? ' ds-srv-sch-row--active' : ''}`}>
      <span className={`ds-srv-sch-row-accent${schedule.isActive ? ' ds-srv-sch-row-accent--active' : ''}`} aria-hidden />

      <span className={`ds-srv-sch-row-icon${schedule.isActive ? ' ds-srv-sch-row-icon--active' : ''}`} aria-hidden>
        <ActionIcon className="h-4 w-4" />
      </span>

      <div className="ds-srv-sch-row-body">
        <div className="ds-srv-sch-row-top">
          <div className="min-w-0 flex-1">
            <div className="ds-srv-sch-row-badges">
              <span className={`ds-srv-sch-status ds-srv-sch-status--${schedule.isActive ? 'active' : 'paused'}`}>
                {schedule.isActive ? 'Active' : 'Paused'}
              </span>
              {schedule.onlyWhenOnline ? <span className="ds-srv-sch-badge">Online only</span> : null}
              <span className="ds-srv-sch-badge ds-srv-sch-badge--action">{actionLabel}</span>
            </div>
            <h3 className="ds-srv-sch-row-title">{schedule.name}</h3>
            {schedule.lastRunAt ? (
              <p className="ds-srv-sch-row-meta">
                <Clock className="h-3 w-3" aria-hidden />
                Last run {formatActivityTime(schedule.lastRunAt)}
              </p>
            ) : null}
          </div>

          {canManage ? (
            <div className="ds-srv-sch-row-actions">
              <button type="button" className="ds-srv-sch-row-btn ds-srv-sch-row-btn--primary" disabled={running} onClick={onRun}>
                <Play className="h-3.5 w-3.5" aria-hidden />
                <span>{running ? 'Running…' : 'Run now'}</span>
              </button>
              <button type="button" className="ds-srv-sch-row-btn" onClick={onToggle}>
                {schedule.isActive ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                <span>{schedule.isActive ? 'Pause' : 'Enable'}</span>
              </button>
              <button type="button" className="ds-srv-sch-row-btn ds-srv-sch-row-btn--danger" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <div className="ds-srv-sch-row-panels">
          <div className="ds-srv-sch-row-panel">
            <div className="ds-srv-sch-row-panel-head">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              <span>Frequency</span>
            </div>
            <p className="ds-srv-sch-row-panel-value">{describeCron(schedule.cron)}</p>
            <code className="ds-srv-sch-row-panel-mono">{schedule.cron}</code>
          </div>

          <div className="ds-srv-sch-row-panel">
            <div className="ds-srv-sch-row-panel-head">
              <ActionIcon className="h-3.5 w-3.5" aria-hidden />
              <span>Action</span>
            </div>
            <p className="ds-srv-sch-row-panel-value">{actionMeta?.description ?? actionLabel}</p>
            {schedule.tasks.length > 0 ? (
              <div className="ds-srv-sch-task-chips">
                {schedule.tasks.map((task, index) => (
                  <span key={`${task.action}-${index}`} className="ds-srv-sch-task-chip">
                    {formatScheduleTask(task)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
