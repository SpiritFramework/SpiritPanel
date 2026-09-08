import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type ServerAllocationsResponse,
  type ServerConnectionInfo,
  type ServerDomainResponse,
  type ServerAllocationEntry,
} from '../lib/api';
import { useServer } from '../context/ServerContext';
import { useServerRouteId } from './useServerRouteId';
import { getServerAccess } from '../lib/server-access';
import {
  matchesAllocationFilter,
  matchesAllocationSearch,
  type AllocationFilter,
} from '../lib/network-utils';

export function useServerNetwork() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);

  const [data, setData] = useState<ServerAllocationsResponse | null>(null);
  const [connection, setConnection] = useState<ServerConnectionInfo | null>(null);
  const [domainInfo, setDomainInfo] = useState<ServerDomainResponse | null>(null);
  const [slugDraft, setSlugDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; address: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AllocationFilter>('all');

  const allocations = data?.allocations ?? [];
  const limit = data?.limit ?? 0;
  const used = data?.used ?? 0;
  const canCreate = data !== null ? data.canCreate : false;
  const slotsLeft = Math.max(0, limit - used);
  const atLimit = limit > 0 && used >= limit;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;

  const primary = useMemo(() => allocations.find((a) => a.isDefault), [allocations]);
  const additionalCount = allocations.filter((a) => !a.isDefault).length;

  const filteredAllocations = useMemo(
    () => allocations.filter((a) => matchesAllocationFilter(a, filter) && matchesAllocationSearch(a, search)),
    [allocations, filter, search],
  );

  const hasActiveFilters = filter !== 'all' || Boolean(search.trim());

  const baseDomain = domainInfo?.feature.baseDomain || '';
  const previewFqdn = slugDraft.trim()
    ? `${slugDraft.trim().toLowerCase()}${baseDomain ? `.${baseDomain}` : ''}`
    : domainInfo?.domain?.fqdn || '';

  const joinAddress =
    connection?.game.address ??
    primary?.address ??
    `${server.defaultAllocation.ip}:${server.defaultAllocation.port}`;

  async function refreshConnection() {
    if (!id) return;
    const [conn, domain] = await Promise.all([
      api.client.connection(id).catch(() => null),
      api.client.serverDomain(id).catch(() => null),
    ]);
    setConnection(conn);
    setDomainInfo(domain);
    if (domain?.domain?.slug) setSlugDraft(domain.domain.slug);
  }

  async function load() {
    if (!id) return;
    setError('');
    try {
      const [allocationsRes, conn, domain] = await Promise.all([
        api.client.networkAllocations(id),
        api.client.connection(id).catch(() => null),
        api.client.serverDomain(id).catch(() => null),
      ]);
      setData(allocationsRes);
      setConnection(conn);
      setDomainInfo(domain);
      if (domain?.domain?.slug) setSlugDraft(domain.domain.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network settings');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  async function handleAutoAssign() {
    if (!id) return;
    setWorking('create');
    setError('');
    try {
      setData(await api.client.createNetworkAllocation(id));
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign allocation');
    } finally {
      setWorking(null);
    }
  }

  async function handleSetPrimary(allocationId: string) {
    if (!id) return;
    setWorking(allocationId);
    setError('');
    try {
      setData(await api.client.setPrimaryNetworkAllocation(id, allocationId));
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary allocation');
    } finally {
      setWorking(null);
    }
  }

  async function confirmDeleteAllocation() {
    if (!id || !deleteTarget) return;
    setDeleteLoading(true);
    setWorking(deleteTarget.id);
    setError('');
    try {
      setData(await api.client.deleteNetworkAllocation(id, deleteTarget.id));
      await refreshConnection();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove allocation');
    } finally {
      setDeleteLoading(false);
      setWorking(null);
    }
  }

  async function handleSaveDomain() {
    if (!id) return;
    setWorking('domain');
    setError('');
    try {
      const next = await api.client.createServerDomain(id, { slug: slugDraft, preferSubdomain: true });
      setDomainInfo(next);
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subdomain');
    } finally {
      setWorking(null);
    }
  }

  async function handlePrefer(preferSubdomain: boolean) {
    if (!id) return;
    setWorking('prefer');
    setError('');
    try {
      setDomainInfo(await api.client.updateServerDomainPreference(id, preferSubdomain));
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
    } finally {
      setWorking(null);
    }
  }

  async function confirmDeleteDomain() {
    if (!id) return;
    setDeleteLoading(true);
    setWorking('domain-delete');
    setError('');
    try {
      setDomainInfo(await api.client.deleteServerDomain(id));
      setSlugDraft('');
      setDeleteDomainOpen(false);
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove subdomain');
    } finally {
      setDeleteLoading(false);
      setWorking(null);
    }
  }

  function sanitizeSlug(value: string) {
    setSlugDraft(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }

  return {
    server,
    access,
    data,
    allocations,
    filteredAllocations,
    connection,
    domainInfo,
    slugDraft,
    loading,
    working,
    error,
    copiedKey,
    deleteTarget,
    setDeleteTarget,
    deleteLoading,
    deleteDomainOpen,
    setDeleteDomainOpen,
    search,
    setSearch,
    filter,
    setFilter,
    limit,
    used,
    canCreate,
    slotsLeft,
    atLimit,
    usagePercent,
    primary,
    additionalCount,
    hasActiveFilters,
    baseDomain,
    previewFqdn,
    joinAddress,
    load,
    copyText,
    sanitizeSlug,
    handleAutoAssign,
    handleSetPrimary,
    confirmDeleteAllocation,
    handleSaveDomain,
    handlePrefer,
    confirmDeleteDomain,
  };
}

export type NetworkAllocationTarget = ServerAllocationEntry;
