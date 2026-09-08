import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type AdminServerDetail,
  type AdminUserSummary,
  type UpdateAdminServerInput,
} from '../../../lib/api';
import { shouldBlockStartForInstall } from '../../../lib/server-runtime';
import { formFromServerDetail, serverFormHasChanges } from './helpers';

export function useServerDetail(serverId: string, fullAdmin: boolean) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminServerInput>({});
  const [saving, setSaving] = useState(false);
  const [powering, setPowering] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [wipeFiles, setWipeFiles] = useState(true);
  const [copied, setCopied] = useState<'address' | 'id' | 'uuid' | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  const load = useCallback(
    async (options?: { silent?: boolean }): Promise<AdminServerDetail | null> => {
      if (!serverId) return null;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError('');
      try {
        const server = await api.admin.server(serverId);
        setDetail(server);
        if (!silent) {
          setForm(formFromServerDetail(server));
        }
        return server;
      } catch {
        if (!silent) {
          setDetail(null);
          setError('Failed to load server');
        }
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    api.admin
      .users()
      .then((rows) => {
        if (active) setUsers(rows);
      })
      .catch(() => {
        if (active) setUsersError('Could not load users. Refresh before transferring ownership.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasChanges = useMemo(
    () => (detail ? serverFormHasChanges(detail, form, fullAdmin) : false),
    [detail, form, fullAdmin],
  );

  function resetForm() {
    if (!detail) return;
    setForm(formFromServerDetail(detail));
    setError('');
    setSaved(false);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = fullAdmin ? form : { suspended: form.suspended };
      await api.admin.updateServer(serverId, payload);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update server');
    } finally {
      setSaving(false);
    }
  }

  async function power(action: string) {
    setPowering(action);
    setError('');
    try {
      const fresh = await load({ silent: true });
      if (action === 'start' && fresh && shouldBlockStartForInstall(fresh)) {
        setError(
          'This server is still installing. Open the console to watch progress, or wait for installation to finish.',
        );
        return;
      }
      await api.admin.serverPower(serverId, action);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setPowering(null);
    }
  }

  async function clearStuckPower() {
    setPowering('clear');
    setError('');
    try {
      await api.admin.clearServerPowerState(serverId);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear stuck power state');
    } finally {
      setPowering(null);
    }
  }

  async function reinstall() {
    setSaving(true);
    setError('');
    try {
      await api.admin.reinstallServer(serverId, wipeFiles);
      setConfirmReinstall(false);
      await load();
      navigate(`/admin/servers/${serverId}/manage/console`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reinstall');
    } finally {
      setSaving(false);
    }
  }

  async function deleteServer() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteServer(serverId);
      navigate('/admin/servers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'address' | 'id' | 'uuid') {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return {
    detail,
    loading,
    form,
    setForm,
    saving,
    powering,
    error,
    saved,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    confirmReinstall,
    setConfirmReinstall,
    wipeFiles,
    setWipeFiles,
    copied,
    users,
    usersLoading,
    usersError,
    load,
    resetForm,
    save,
    power,
    clearStuckPower,
    reinstall,
    deleteServer,
    copyText,
  };
}

export type ServerDetailController = ReturnType<typeof useServerDetail>;
