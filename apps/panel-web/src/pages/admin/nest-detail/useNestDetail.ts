import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type AdminNestDetail, type UpdateAdminNestInput } from '../../../lib/api';
import { formFromNestDetail, nestFormHasChanges } from './helpers';

export function useNestDetail(nestId: string) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminNestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminNestInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);

  const load = useCallback(async () => {
    if (!nestId) return;
    setLoading(true);
    setError('');
    try {
      const nest = await api.admin.nest(nestId);
      setDetail(nest);
      setForm(formFromNestDetail(nest));
    } catch {
      setDetail(null);
      setError('Failed to load nest');
    } finally {
      setLoading(false);
    }
  }, [nestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasChanges = useMemo(
    () => (detail ? nestFormHasChanges(detail, form) : false),
    [detail, form],
  );

  function resetForm() {
    if (!detail) return;
    setForm(formFromNestDetail(detail));
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
      await api.admin.updateNest(nestId, form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update nest');
    } finally {
      setSaving(false);
    }
  }

  async function deleteNest() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteNest(nestId);
      navigate('/admin/nests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nest');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'id' | 'uuid') {
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
    error,
    saved,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    copied,
    load,
    resetForm,
    save,
    deleteNest,
    copyText,
  };
}

export type NestDetailController = ReturnType<typeof useNestDetail>;
