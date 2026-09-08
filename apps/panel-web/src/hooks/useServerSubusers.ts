import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_INVITE_PERMISSIONS,
  matchesSubuserSearch,
  type SubuserSummary,
} from '../lib/subuser-utils';

export function useServerSubusers() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);

  const [subusers, setSubusers] = useState<SubuserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_INVITE_PERMISSIONS);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<SubuserSummary | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filteredSubusers = useMemo(
    () => subusers.filter((s) => matchesSubuserSearch(s, search)),
    [subusers, search],
  );

  const totalPermissionsGranted = useMemo(
    () => subusers.reduce((sum, s) => sum + s.permissions.length, 0),
    [subusers],
  );

  const avgPermissions = subusers.length > 0 ? Math.round(totalPermissionsGranted / subusers.length) : 0;
  const hasSearch = Boolean(search.trim());

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await api.client.subusers(id);
      setSubusers(list as unknown as SubuserSummary[]);
    } catch (err) {
      setSubusers([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load subusers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addSubuser(e?: FormEvent) {
    e?.preventDefault();
    if (!id || !email.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.client.addSubuser(id, email.trim(), permissions);
      setEmail('');
      setPermissions(DEFAULT_INVITE_PERMISSIONS);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subuser');
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!id || !removeTarget) return;
    setRemoveLoading(true);
    setError('');
    try {
      await api.client.removeSubuser(id, removeTarget.id);
      if (editingId === removeTarget.id) setEditingId(null);
      setRemoveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove subuser');
    } finally {
      setRemoveLoading(false);
    }
  }

  function startEdit(subuser: SubuserSummary) {
    setEditingId(subuser.id);
    setEditPermissions([...subuser.permissions]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPermissions([]);
  }

  function toggleEdit(subuser: SubuserSummary) {
    if (editingId === subuser.id) cancelEdit();
    else startEdit(subuser);
  }

  async function saveEdit(subuserId: string) {
    if (!id) return;
    setSavingEdit(true);
    setError('');
    try {
      await api.client.updateSubuser(id, subuserId, editPermissions);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subuser');
    } finally {
      setSavingEdit(false);
    }
  }

  return {
    server,
    access,
    subusers,
    filteredSubusers,
    loading,
    email,
    setEmail,
    permissions,
    setPermissions,
    adding,
    editingId,
    editPermissions,
    setEditPermissions,
    savingEdit,
    error,
    loadError,
    removeTarget,
    setRemoveTarget,
    removeLoading,
    search,
    setSearch,
    hasSearch,
    totalPermissionsGranted,
    avgPermissions,
    catalogSize: ALL_PERMISSION_KEYS.length,
    load,
    addSubuser,
    confirmRemove,
    toggleEdit,
    cancelEdit,
    saveEdit,
  };
}
