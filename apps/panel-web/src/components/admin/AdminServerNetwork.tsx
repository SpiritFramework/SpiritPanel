import { useCallback, useEffect, useState } from 'react';
import { Globe, Info, Network, Plus, Star, Trash2 } from 'lucide-react';
import {
  api,
  type AdminAllocation,
  type ServerAllocationEntry,
  type ServerAllocationsResponse,
  type ServerDomainResponse,
} from '../../lib/api';
import { Button, Input, Select } from '../Layout';
import { EmptyState, Spinner } from '../ui';
import { ConfirmModal } from '../ConfirmModal';
import { AdminEditPanel } from './AdminEditLayout';
import { AdminFormStatus } from '../AdminDetailLayout';

/**
 * Admin-side allocation manager for a server. Wired to the server allocation
 * endpoints, all of which re-sync the server config to Wings after a change.
 */
export function AdminServerNetwork({
  serverId,
  nodeId,
  fqdn,
}: {
  serverId: string;
  nodeId: string;
  fqdn: string;
}) {
  const [data, setData] = useState<ServerAllocationsResponse | null>(null);
  const [domainInfo, setDomainInfo] = useState<ServerDomainResponse | null>(null);
  const [slugDraft, setSlugDraft] = useState('');
  const [free, setFree] = useState<AdminAllocation[]>([]);
  const [selectedFree, setSelectedFree] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; address: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);

  const loadFree = useCallback(async () => {
    try {
      const rows = await api.admin.allocations(nodeId);
      setFree(rows.filter((row) => !row.assigned));
    } catch {
      /* node allocations are optional context */
    }
  }, [nodeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allocations, domain] = await Promise.all([
        api.admin.serverAllocations(serverId),
        api.admin.serverDomain(serverId).catch(() => null),
        loadFree(),
      ]);
      setData(allocations);
      setDomainInfo(domain);
      if (domain?.domain?.slug) setSlugDraft(domain.domain.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  }, [serverId, loadFree]);

  useEffect(() => {
    load();
  }, [load]);

  function afterChange(next: ServerAllocationsResponse, message: string) {
    setData(next);
    setNotice(message);
    setSelectedFree('');
    void loadFree();
  }

  async function assignSpecific() {
    if (!selectedFree) return;
    setWorking('assign');
    setError('');
    setNotice('');
    try {
      const next = await api.admin.assignServerAllocation(serverId, selectedFree);
      afterChange(next, 'Allocation assigned. Restart the server to bind the new port.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign allocation');
    } finally {
      setWorking(null);
    }
  }

  async function setPrimary(allocationId: string) {
    setWorking(allocationId);
    setError('');
    setNotice('');
    try {
      const next = await api.admin.setPrimaryServerAllocation(serverId, allocationId);
      afterChange(next, 'Primary allocation updated. Restart the server to apply.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary allocation');
    } finally {
      setWorking(null);
    }
  }

  async function confirmUnassign() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setWorking(deleteTarget.id);
    setError('');
    setNotice('');
    try {
      const next = await api.admin.unassignServerAllocation(serverId, deleteTarget.id);
      afterChange(next, 'Allocation removed. Restart the server to apply.');
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove allocation');
    } finally {
      setDeleteLoading(false);
      setWorking(null);
    }
  }

  const limit = data?.limit ?? 0;
  const used = data?.used ?? 0;
  const baseDomain = domainInfo?.feature.baseDomain || '';

  async function saveDomain() {
    setWorking('domain');
    setError('');
    setNotice('');
    try {
      const next = await api.admin.createServerDomain(serverId, {
        slug: slugDraft,
        preferSubdomain: true,
      });
      setDomainInfo(next);
      setNotice(`Subdomain ${next.domain?.fqdn ?? slugDraft} ready.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subdomain');
    } finally {
      setWorking(null);
    }
  }

  async function preferDomain(preferSubdomain: boolean) {
    setWorking('prefer');
    setError('');
    try {
      setDomainInfo(await api.admin.updateServerDomainPreference(serverId, preferSubdomain));
      setNotice(preferSubdomain ? 'Players will see the subdomain.' : 'Players will see the IP.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
    } finally {
      setWorking(null);
    }
  }

  async function confirmDeleteDomain() {
    setDeleteLoading(true);
    setWorking('domain-delete');
    setError('');
    try {
      setDomainInfo(await api.admin.deleteServerDomain(serverId));
      setSlugDraft('');
      setDeleteDomainOpen(false);
      setNotice('Subdomain removed from Cloudflare.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove subdomain');
    } finally {
      setDeleteLoading(false);
      setWorking(null);
    }
  }

  return (
    <>
    <AdminEditPanel title="Subdomain" icon={Globe}>
      {!domainInfo ? (
        <p className="text-sm text-[var(--muted)]">Unable to load subdomain settings.</p>
      ) : !domainInfo.feature.enabled || !domainInfo.feature.canManage ? (
        <p className="text-sm text-[var(--muted)]">
          {domainInfo.feature.reason || 'Configure Cloudflare DNS in Admin Settings to enable subdomains.'}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Subdomain"
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="fivemrp"
                hint={baseDomain ? `Creates slug.${baseDomain}` : undefined}
              />
            </div>
            <Button type="button" disabled={working === 'domain' || !slugDraft.trim()} onClick={() => void saveDomain()}>
              {working === 'domain' ? 'Saving…' : domainInfo.domain ? 'Update' : 'Create'}
            </Button>
          </div>
          {domainInfo.domain && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono">{domainInfo.subdomainAddress}</span>
                {domainInfo.domain.hostnameOnly && (
                  <span className="text-emerald-400">Minecraft SRV · hostname only</span>
                )}
                <Button type="button" size="sm" variant={!domainInfo.preferSubdomain ? 'primary' : 'secondary'} disabled={working === 'prefer'} onClick={() => void preferDomain(false)}>Prefer IP</Button>
                <Button type="button" size="sm" variant={domainInfo.preferSubdomain ? 'primary' : 'secondary'} disabled={working === 'prefer'} onClick={() => void preferDomain(true)}>Prefer subdomain</Button>
                <Button type="button" size="sm" variant="danger" onClick={() => setDeleteDomainOpen(true)}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminEditPanel>

    <AdminEditPanel title="Network & allocations" icon={Network}>
      <p className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2 text-[11px] text-[var(--muted)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Port changes are pushed to FeatherWings immediately, but the running container keeps its
        current bindings until the server is restarted.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="min-w-[220px] flex-1">
          <Select
            label="Assign a free port from this node"
            value={selectedFree}
            onChange={(e) => setSelectedFree(e.target.value)}
          >
            <option value="">
              {free.length === 0 ? 'No free allocations on this node' : 'Select a port…'}
            </option>
            {free.map((row) => (
              <option key={row.id} value={row.id}>
                {row.ip}:{row.port}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" disabled={!selectedFree || working === 'assign'} onClick={assignSpecific}>
          <Plus className="h-3.5 w-3.5" />
          {working === 'assign' ? 'Assigning…' : 'Assign'}
        </Button>
        <span className="ml-auto self-center text-[11px] text-[var(--muted)]">
          {limit === 0 ? `${used} assigned · disabled (limit 0)` : `${used} / ${limit} ports`}
        </span>
      </div>

      {notice && (
        <p className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
          {notice}
        </p>
      )}
      <AdminFormStatus error={error} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !data || data.allocations.length === 0 ? (
        <EmptyState title="No allocations" description="This server has no ports assigned yet." />
      ) : (
        <div className="space-y-2">
          {data.allocations.map((alloc) => (
            <AllocationCard
              key={alloc.id}
              alloc={alloc}
              fqdn={fqdn}
              busy={working === alloc.id}
              onSetPrimary={() => setPrimary(alloc.id)}
              onUnassign={() => setDeleteTarget({ id: alloc.id, address: alloc.address })}
            />
          ))}
        </div>
      )}
    </AdminEditPanel>

    <ConfirmModal
      open={deleteTarget !== null}
      title="Remove this allocation?"
      detail={deleteTarget?.address}
      description="This unassigns the port from the server. Restart the server for binding changes to take effect."
      confirmLabel="Remove allocation"
      tone="warning"
      loading={deleteLoading}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmUnassign}
    />
    <ConfirmModal
      open={deleteDomainOpen}
      title="Remove subdomain?"
      description="Deletes the Cloudflare DNS record for this server."
      confirmLabel="Remove subdomain"
      tone="warning"
      loading={deleteLoading}
      onClose={() => setDeleteDomainOpen(false)}
      onConfirm={() => void confirmDeleteDomain()}
    />
  </>
  );
}

function AllocationCard({
  alloc,
  fqdn,
  busy,
  onSetPrimary,
  onUnassign,
}: {
  alloc: ServerAllocationEntry;
  fqdn: string;
  busy: boolean;
  onSetPrimary: () => void;
  onUnassign: () => void;
}) {
  return (
    <article
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition ${
        alloc.isDefault
          ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)]/25'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/30'
      }`}
    >
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {alloc.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold accent-text">
              <Star className="h-3 w-3 fill-current" />
              Primary
            </span>
          ) : (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              Additional
            </span>
          )}
          {alloc.alias && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <Globe className="h-3 w-3" />
              {alloc.alias}
            </span>
          )}
        </div>
        <p className="font-mono text-sm font-semibold">{alloc.address || `${alloc.displayHost || fqdn}:${alloc.port}`}</p>
        <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">bind {alloc.bindAddress}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {!alloc.isDefault && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onSetPrimary} className="text-[12px]">
            {busy ? 'Updating…' : 'Make primary'}
          </Button>
        )}
        {!alloc.isDefault && (
          <button
            type="button"
            title="Remove allocation"
            disabled={busy}
            onClick={onUnassign}
            className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1.5 text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
