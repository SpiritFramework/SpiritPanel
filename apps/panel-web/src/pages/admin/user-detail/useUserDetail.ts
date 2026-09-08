import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type AdminUserDetail,
  type ApiKeySummary,
  type UpdateAdminUserInput,
} from '../../../lib/api';
import { formFromUserDetail, userFormHasChanges } from './helpers';

export function useUserDetail(userId: string) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminUserInput>({});
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | 'email' | 'discord' | null>(null);
  const [userKeys, setUserKeys] = useState<ApiKeySummary[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const user = await api.admin.user(userId);
      setDetail(user);
      setForm(formFromUserDetail(user));
      setNewPassword('');
    } catch {
      setDetail(null);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadKeys = useCallback(async () => {
    if (!userId) return;
    setKeysLoading(true);
    try {
      setUserKeys(await api.admin.userApiKeys(userId));
    } catch {
      setUserKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, [userId]);

  const hasChanges = useMemo(
    () => (detail ? userFormHasChanges(detail, form, newPassword) : false),
    [detail, form, newPassword],
  );

  function resetForm() {
    if (!detail) return;
    setForm(formFromUserDetail(detail));
    setNewPassword('');
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
      const payload: UpdateAdminUserInput = { ...form };
      if (newPassword.trim()) payload.password = newPassword;
      await api.admin.updateUser(userId, payload);
      setNewPassword('');
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteUser(userId);
      navigate('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'id' | 'uuid' | 'email' | 'discord') {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return {
    detail,
    loading,
    form,
    setForm,
    newPassword,
    setNewPassword,
    saving,
    error,
    saved,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    copied,
    userKeys,
    keysLoading,
    creatingKey,
    setCreatingKey,
    load,
    loadKeys,
    resetForm,
    save,
    deleteUser,
    copyText,
  };
}

export type UserDetailController = ReturnType<typeof useUserDetail>;
