import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type AdminEggDetail, type UpdateAdminEggInput } from '../../../lib/api';
import { formFromEggDetail, eggFormHasChanges } from './helpers';

export function useEggDetail(eggId: string) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminEggDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminEggInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);
  const [reimportJson, setReimportJson] = useState('');
  const [reimporting, setReimporting] = useState(false);
  const [reimportError, setReimportError] = useState('');
  const [reimported, setReimported] = useState(false);

  const load = useCallback(async () => {
    if (!eggId) return;
    setLoading(true);
    setError('');
    try {
      const egg = await api.admin.egg(eggId);
      setDetail(egg);
      setForm(formFromEggDetail(egg));
    } catch {
      setDetail(null);
      setError('Failed to load egg');
    } finally {
      setLoading(false);
    }
  }, [eggId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasChanges = useMemo(
    () => (detail ? eggFormHasChanges(detail, form) : false),
    [detail, form],
  );

  const dockerImageEntries = useMemo(
    () => (detail ? Object.entries(detail.dockerImages) : []),
    [detail],
  );

  function resetForm() {
    if (!detail) return;
    setForm(formFromEggDetail(detail));
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
      await api.admin.updateEgg(eggId, form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update egg');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEgg() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteEgg(eggId);
      navigate(detail ? `/admin/nests/${detail.nestId}` : '/admin/nests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete egg');
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

  async function reimport() {
    setReimporting(true);
    setReimportError('');
    setReimported(false);
    try {
      const parsed = JSON.parse(reimportJson);
      await api.admin.reimportEgg(eggId, parsed);
      setReimportJson('');
      setReimported(true);
      await load();
    } catch (err) {
      setReimportError(
        err instanceof SyntaxError
          ? 'That is not valid JSON. Paste a Pterodactyl egg export (egg-*.json).'
          : err instanceof Error
            ? err.message
            : 'Failed to re-import egg',
      );
    } finally {
      setReimporting(false);
    }
  }

  async function onReimportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReimportJson(await file.text());
    e.target.value = '';
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
    dockerImageEntries,
    reimportJson,
    setReimportJson,
    reimporting,
    reimportError,
    reimported,
    setReimported,
    setReimportError,
    load,
    resetForm,
    save,
    deleteEgg,
    copyText,
    reimport,
    onReimportFile,
  };
}

export type EggDetailController = ReturnType<typeof useEggDetail>;
