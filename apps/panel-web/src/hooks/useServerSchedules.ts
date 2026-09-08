import { useEffect, useMemo, useState } from 'react';
import { api, type ServerScheduleSummary } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { useToast } from '../context/ToastContext';
import { getServerAccess } from '../lib/server-access';
import type { ScheduleFormSeed } from '../components/CreateScheduleModal';
import {
  matchesScheduleFilter,
  matchesScheduleSearch,
  type ScheduleFilter,
} from '../lib/schedule-utils';

export function useServerSchedules() {
  const id = useServerRouteId();
  const { server } = useServer();
  const toast = useToast();
  const access = getServerAccess(server);

  const [schedules, setSchedules] = useState<ServerScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createSeed, setCreateSeed] = useState<ScheduleFormSeed | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ServerScheduleSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ScheduleFilter>('all');

  async function load() {
    if (!id) return;
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
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredSchedules = useMemo(
    () => schedules.filter((s) => matchesScheduleFilter(s, filter) && matchesScheduleSearch(s, search)),
    [schedules, filter, search],
  );

  const activeCount = useMemo(() => schedules.filter((s) => s.isActive).length, [schedules]);
  const pausedCount = schedules.length - activeCount;
  const activePercent = schedules.length > 0 ? Math.round((activeCount / schedules.length) * 100) : 0;
  const hasActiveFilters = filter !== 'all' || Boolean(search.trim());

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

  return {
    server,
    access,
    schedules,
    filteredSchedules,
    loading,
    error,
    runningId,
    showCreate,
    createSeed,
    deleteTarget,
    setDeleteTarget,
    deleteLoading,
    search,
    setSearch,
    filter,
    setFilter,
    activeCount,
    pausedCount,
    activePercent,
    hasActiveFilters,
    openCreate,
    closeCreate,
    load,
    handleCreate,
    toggleActive,
    runNow,
    confirmDelete,
  };
}
