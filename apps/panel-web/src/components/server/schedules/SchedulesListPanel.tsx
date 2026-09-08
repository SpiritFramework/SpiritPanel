import { CalendarClock, Plus, Search } from 'lucide-react';
import { Button } from '../../Layout';
import { EmptyState, Spinner } from '../../ui';
import type { ScheduleFormSeed } from '../../CreateScheduleModal';
import type { ServerScheduleSummary } from '../../../lib/api';
import type { ScheduleFilter } from '../../../lib/schedule-utils';
import type { getServerAccess } from '../../../lib/server-access';
import { ScheduleRow } from './ScheduleRow';
import { SchedulesTemplatesRow } from './SchedulesInfoBanner';

const FILTER_OPTIONS: { id: ScheduleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
];

export function SchedulesListPanel({
  loading,
  error,
  schedules,
  filteredSchedules,
  search,
  filter,
  hasActiveFilters,
  runningId,
  access,
  onSearchChange,
  onFilterChange,
  onCreate,
  onTemplateSelect,
  onToggle,
  onRun,
  onDelete,
}: {
  loading: boolean;
  error: string;
  schedules: ServerScheduleSummary[];
  filteredSchedules: ServerScheduleSummary[];
  search: string;
  filter: ScheduleFilter;
  hasActiveFilters: boolean;
  runningId: string | null;
  access: ReturnType<typeof getServerAccess>;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: ScheduleFilter) => void;
  onCreate: () => void;
  onTemplateSelect: (seed: ScheduleFormSeed) => void;
  onToggle: (schedule: ServerScheduleSummary) => void;
  onRun: (scheduleId: string) => void;
  onDelete: (schedule: ServerScheduleSummary) => void;
}) {
  return (
    <section className="ds-srv-sch-panel">
      <div className="ds-srv-sch-panel-toolbar">
        <div className="ds-srv-sch-search-wrap">
          <Search className="ds-srv-sch-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search schedules…"
            className="ds-srv-sch-search"
          />
        </div>
        <div className="ds-srv-sch-filters" role="group" aria-label="Filter schedules">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`ds-srv-sch-filter-btn${filter === opt.id ? ' ds-srv-sch-filter-btn--active' : ''}`}
              aria-pressed={filter === opt.id}
              onClick={() => onFilterChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="ds-srv-sch-error">{error}</div> : null}

      {!access.canManageSchedules && !loading && schedules.length === 0 ? (
        <div className="ds-srv-sch-notice">You can view schedules but do not have permission to manage them.</div>
      ) : null}

      <div className="ds-srv-sch-panel-body">
        {loading ? (
          <div className="ds-srv-sch-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading schedules…</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="ds-srv-sch-empty-wrap">
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title="No schedules yet"
              description="Set up recurring restarts, backups, or console commands so routine maintenance runs without you."
              action={
                access.canManageSchedules ? (
                  <Button type="button" size="sm" onClick={onCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first schedule
                  </Button>
                ) : undefined
              }
            />
            {access.canManageSchedules ? <SchedulesTemplatesRow onSelect={onTemplateSelect} /> : null}
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="ds-srv-sch-empty-wrap">
            <EmptyState title="No matching schedules" description="Try a different search or filter." />
          </div>
        ) : (
          <ul className="ds-srv-sch-list">
            {filteredSchedules.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                canManage={access.canManageSchedules}
                running={runningId === schedule.id}
                onToggle={() => onToggle(schedule)}
                onRun={() => onRun(schedule.id)}
                onDelete={() => onDelete(schedule)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="ds-srv-sch-panel-footer">
        {loading
          ? 'Loading…'
          : hasActiveFilters
            ? `${filteredSchedules.length} of ${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`
            : `${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
