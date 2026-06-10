import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type AdminLocationSummary,
  type AdminNodeDetail,
  type NodeDiagnostics,
  type UpdateAdminNodeInput,
} from '../../../lib/api';
import { formFromDetail, nodeFormHasChanges } from './helpers';

export function useNodeDetail(nodeId: string) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminNodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminNodeInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [allocForm, setAllocForm] = useState({ ip: '0.0.0.0', ports: '25565-25584' });
  const [allocNotice, setAllocNotice] = useState('');
  const [selectedAllocIds, setSelectedAllocIds] = useState<string[]>([]);
  const [locations, setLocations] = useState<AdminLocationSummary[]>([]);
  const [copied, setCopied] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NodeDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const node = await api.admin.node(nodeId);
      setDetail(node);
      setForm(formFromDetail(node));
    } catch {
      setDetail(null);
      setError('Failed to load node');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api.admin.locations().then(setLocations).catch(() => {});
  }, []);

  const hasChanges = useMemo(
    () => (detail ? nodeFormHasChanges(detail, form) : false),
    [detail, form],
  );

  const allocationGroups = useMemo(() => {
    if (!detail) return [];
    const groups = new Map<string, AdminNodeDetail['allocations']>();
    for (const alloc of detail.allocations) {
      const list = groups.get(alloc.ip) ?? [];
      list.push(alloc);
      groups.set(alloc.ip, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ip, allocations]) => ({
        ip,
        allocations,
        total: allocations.length,
        free: allocations.filter((row) => !row.assigned).length,
        assigned: allocations.filter((row) => row.assigned).length,
      }));
  }, [detail]);

  const selectedFreeCount = useMemo(() => {
    if (!detail) return 0;
    const freeIds = new Set(detail.allocations.filter((row) => !row.assigned).map((row) => row.id));
    return selectedAllocIds.filter((id) => freeIds.has(id)).length;
  }, [detail, selectedAllocIds]);

  function resetForm() {
    if (!detail) return;
    setForm(formFromDetail(detail));
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
      await api.admin.updateNode(nodeId, form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node');
    } finally {
      setSaving(false);
    }
  }

  async function downloadConfig() {
    if (!detail) return;
    const yaml = await api.admin.nodeConfig(nodeId);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wings-${detail.name}.yml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function rotateToken() {
    setSaving(true);
    setError('');
    try {
      await api.admin.rotateNodeToken(nodeId);
      setConfirmRotate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate token');
    } finally {
      setSaving(false);
    }
  }

  async function deleteNode() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteNode(nodeId);
      navigate('/admin/nodes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function createAllocations() {
    if (!detail) return;
    setSaving(true);
    setError('');
    setAllocNotice('');
    try {
      const result = await api.admin.createAllocations(nodeId, {
        ip: allocForm.ip,
        ports: [allocForm.ports],
      });
      await load();
      setAllocNotice(
        `Added ${result.created} allocation(s) on ${result.ip}${
          result.skipped ? ` · ${result.skipped} already existed` : ''
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create allocations');
    } finally {
      setSaving(false);
    }
  }

  async function saveAllocationAlias(allocationId: string, alias: string) {
    try {
      await api.admin.updateAllocation(allocationId, { alias: alias.trim() || null });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update allocation');
    }
  }

  async function deleteAllocation(allocationId: string) {
    if (!confirm('Delete this allocation?')) return;
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteAllocation(allocationId);
      setSelectedAllocIds((current) => current.filter((id) => id !== allocationId));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete allocation');
    } finally {
      setSaving(false);
    }
  }

  function toggleAllocationSelection(id: string, checked: boolean) {
    setSelectedAllocIds((current) =>
      checked ? (current.includes(id) ? current : [...current, id]) : current.filter((rowId) => rowId !== id),
    );
  }

  function toggleIpSelection(ip: string, checked: boolean) {
    const group = allocationGroups.find((row) => row.ip === ip);
    if (!group) return;
    const freeIds = group.allocations.filter((row) => !row.assigned).map((row) => row.id);
    setSelectedAllocIds((current) => {
      if (!checked) return current.filter((id) => !freeIds.includes(id));
      return [...new Set([...current, ...freeIds])];
    });
  }

  async function bulkDeleteAllocations(input: { ip?: string; ids?: string[] }, confirmMessage: string) {
    if (!nodeId || !confirm(confirmMessage)) return;
    setSaving(true);
    setError('');
    setAllocNotice('');
    try {
      const result = await api.admin.bulkDeleteAllocations(nodeId, input);
      setSelectedAllocIds([]);
      setAllocNotice(
        `Deleted ${result.deleted} allocation(s)${
          result.skippedAssigned ? `. ${result.skippedAssigned} assigned allocation(s) were kept.` : '.'
        }`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete allocations');
    } finally {
      setSaving(false);
    }
  }

  async function deleteFreeOnIp(ip: string, freeCount: number, assignedCount: number) {
    const assignedNote =
      assignedCount > 0 ? ` ${assignedCount} assigned allocation(s) on this IP will be kept.` : '';
    await bulkDeleteAllocations(
      { ip },
      `Delete all ${freeCount} unassigned allocation(s) on ${ip}?${assignedNote}`,
    );
  }

  async function deleteSelectedAllocations() {
    if (selectedFreeCount === 0) return;
    await bulkDeleteAllocations(
      { ids: selectedAllocIds },
      `Delete ${selectedFreeCount} selected unassigned allocation(s)? Assigned ports in the selection will be skipped.`,
    );
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function runDiagnostics() {
    setDiagLoading(true);
    setError('');
    try {
      setDiagnostics(await api.admin.nodeDiagnostics(nodeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics failed');
    } finally {
      setDiagLoading(false);
    }
  }

  return {
    detail,
    loading,
    form,
    setForm,
    saving,
    error,
    saved,
    confirmDelete,
    setConfirmDelete,
    confirmRotate,
    setConfirmRotate,
    allocForm,
    setAllocForm,
    allocNotice,
    selectedAllocIds,
    setSelectedAllocIds,
    locations,
    copied,
    diagnostics,
    diagLoading,
    hasChanges,
    allocationGroups,
    selectedFreeCount,
    load,
    resetForm,
    save,
    downloadConfig,
    rotateToken,
    deleteNode,
    createAllocations,
    saveAllocationAlias,
    deleteAllocation,
    toggleAllocationSelection,
    toggleIpSelection,
    deleteFreeOnIp,
    deleteSelectedAllocations,
    copyText,
    runDiagnostics,
  };
}

export type NodeDetailController = ReturnType<typeof useNodeDetail>;
