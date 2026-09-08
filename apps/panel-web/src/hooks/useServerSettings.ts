import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerLiveOptional } from '../context/ServerLiveContext';
import { useServerManageBase } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import { formatAllocationAddress } from '../lib/allocation';
import { isServerInstalling } from '../lib/server-runtime';

export function useServerSettings() {
  const navigate = useNavigate();
  const { serverId: id, base } = useServerManageBase();
  const { server, refresh } = useServer();
  const live = useServerLiveOptional();
  const access = getServerAccess(server);
  const canEditSettings = access.canUpdateSettings;

  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [wipeFiles, setWipeFiles] = useState(true);
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [reinstallError, setReinstallError] = useState('');

  useEffect(() => {
    setName(server.name);
    setDescription(server.description ?? '');
  }, [server.name, server.description]);

  const hasChanges =
    name.trim() !== server.name || description.trim() !== (server.description ?? '');

  const installing = isServerInstalling(server);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  const showInstallFailedHint =
    server.installStatus === 'failed' || server.status === 'install_failed';

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  async function reload() {
    setError('');
    try {
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh settings');
    }
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    if (!id || !canEditSettings || !hasChanges || !name.trim()) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.client.updateServer(id, { name: name.trim(), description: description.trim() });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName(server.name);
    setDescription(server.description ?? '');
    setSaved(false);
    setError('');
  }

  async function handleReinstall() {
    if (!id || !access.canReinstall) return;
    setReinstalling(true);
    setReinstallError('');
    try {
      await api.client.reinstall(id, wipeFiles);
      await refresh();
      setConfirmReinstall(false);
      navigate(`${base}/console`);
    } catch (err) {
      setReinstallError(err instanceof Error ? err.message : 'Reinstall failed');
    } finally {
      setReinstalling(false);
    }
  }

  function updateName(value: string) {
    setName(value);
    setSaved(false);
  }

  function updateDescription(value: string) {
    setDescription(value);
    setSaved(false);
  }

  return {
    server,
    live,
    access,
    canEditSettings,
    name,
    setName: updateName,
    description,
    setDescription: updateDescription,
    saving,
    saved,
    error,
    copiedKey,
    hasChanges,
    installing,
    address,
    showInstallFailedHint,
    wipeFiles,
    setWipeFiles,
    confirmReinstall,
    setConfirmReinstall,
    reinstalling,
    reinstallError,
    copyText,
    reload,
    handleSave,
    resetForm,
    handleReinstall,
  };
}
