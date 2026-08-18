import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Gamepad2,
  Globe,
  HardDrive,
  Network,
  Plus,
  Server,
  Star,
  Trash2,
} from 'lucide-react';
import { api, type ServerAllocationsResponse, type ServerConnectionInfo, type ServerDomainResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import { Button, Input } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ResourceQuotaStrip } from '../../components/server/ResourceQuotaStrip';
import { EmptyState, Spinner } from '../../components/ui';
import {
  ServerErrorBanner,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
} from '../../components/server/ServerPage';

export function ServerNetworkPage() {
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

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [allocations, conn, domain] = await Promise.all([
        api.client.networkAllocations(id),
        api.client.connection(id).catch(() => null),
        api.client.serverDomain(id).catch(() => null),
      ]);
      setData(allocations);
      setConnection(conn);
      setDomainInfo(domain);
      if (domain?.domain?.slug) setSlugDraft(domain.domain.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function refreshConnection() {
    if (!id) return;
    const [conn, domain] = await Promise.all([
      api.client.connection(id).catch(() => null),
      api.client.serverDomain(id).catch(() => null),
    ]);
    setConnection(conn);
    setDomainInfo(domain);
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

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
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

  const limit = data?.limit ?? 0;
  const used = data?.used ?? 0;
  const primary = data?.allocations.find((a) => a.isDefault);
  const baseDomain = domainInfo?.feature.baseDomain || '';
  const previewFqdn = slugDraft.trim()
    ? `${slugDraft.trim().toLowerCase()}${baseDomain ? `.${baseDomain}` : ''}`
    : domainInfo?.domain?.fqdn || '';
  const joinAddress =
    connection?.game.address ??
    primary?.address ??
    `${server.defaultAllocation.ip}:${server.defaultAllocation.port}`;

  return (
    <ServerPage>
      <ServerPageHeader
        title="Network"
        description="Connection details, ports, and optional subdomain"
        actions={
          access.canCreateAllocations && data?.canCreate ? (
            <Button type="button" disabled={working === 'create'} onClick={() => void handleAutoAssign()}>
              <Plus className="h-3.5 w-3.5" />
              {working === 'create' ? 'Assigning…' : 'Add port'}
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      <ServerPanel
        icon={Gamepad2}
        iconTone="green"
        title="Connection"
        description="Share these with players and tools"
        noPadding
        bodyClassName="p-0"
      >
        <dl className="divide-y divide-[var(--border)]/50">
          <CopyRow
            icon={Gamepad2}
            label="Game address"
            value={joinAddress}
            hint={
              connection
                ? `${connection.game.hostname}:${connection.game.port}`
                : `Primary :${primary?.port ?? server.defaultAllocation.port}`
            }
            copied={copiedKey === 'game'}
            onCopy={() => void copyText(joinAddress, 'game')}
          />
          {connection ? (
            <CopyRow
              icon={HardDrive}
              label="SFTP"
              value={`${connection.sftp.username}@${connection.sftp.host}:${connection.sftp.port}`}
              hint="Authenticate with your panel password"
              copied={copiedKey === 'sftp'}
              onCopy={() => void copyText(connection.sftp.uri, 'sftp')}
            />
          ) : null}
          <InfoRow
            icon={Server}
            label="Node"
            value={server.node.name}
            hint={server.node.fqdn ?? connection?.node.fqdn}
          />
        </dl>
      </ServerPanel>

      <ResourceQuotaStrip
        label="Ports"
        used={used}
        limit={limit}
        canCreate={Boolean(access.canCreateAllocations && data?.canCreate)}
        icon={<Network className="h-3.5 w-3.5" />}
      />

      <ServerPanel
        icon={Network}
        title="Port allocations"
        description="Primary and additional ports on this node"
        noPadding
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !data || data.allocations.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState title="No ports assigned" description="This server has no network allocations yet." />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]/50">
            {data.allocations.map((alloc) => {
              const busy = working === alloc.id;
              return (
                <li key={alloc.id} className="net-alloc">
                  <div className="net-alloc-main min-w-0">
                    <div className="net-alloc-top">
                      {alloc.isDefault ? (
                        <span className="net-alloc-badge net-alloc-badge--primary">
                          <Star className="h-3 w-3 fill-current" />
                          Primary
                        </span>
                      ) : (
                        <span className="net-alloc-badge">Additional</span>
                      )}
                      <span className="net-alloc-port">:{alloc.port}</span>
                    </div>
                    <div className="net-alloc-address">
                      <p className="font-mono text-sm font-semibold">{alloc.address}</p>
                      <button
                        type="button"
                        className="net-alloc-copy"
                        title="Copy address"
                        onClick={() => void copyText(alloc.address, alloc.id)}
                      >
                        {copiedKey === alloc.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="net-alloc-meta">
                      Host {alloc.displayHost}
                      <span aria-hidden>·</span>
                      Bind {alloc.bindAddress}
                    </p>
                  </div>
                  <div className="net-alloc-actions">
                    {access.canUpdateAllocations && !alloc.isDefault ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleSetPrimary(alloc.id)}
                      >
                        {busy ? 'Updating…' : 'Make primary'}
                      </Button>
                    ) : null}
                    {access.canDeleteAllocations && !alloc.isDefault ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setDeleteTarget({ id: alloc.id, address: alloc.address })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data && !data.canCreate && access.canCreateAllocations ? (
          <div className="border-t border-[var(--border)]/50 p-4">
            <ServerNotice tone="warning">
              {data.limit === 0
                ? 'Additional ports are disabled on this server (limit 0).'
                : `Port limit reached (${data.limit}). Ask an admin to raise it.`}
            </ServerNotice>
          </div>
        ) : null}
      </ServerPanel>

      {domainInfo ? (
        <ServerPanel
          icon={Globe}
          iconTone="cyan"
          title="Subdomain"
          description="Optional DNS name for this server"
        >
          {!domainInfo.feature.enabled || !domainInfo.feature.canManage ? (
            <ServerNotice tone="muted">
              {domainInfo.feature.reason || 'Subdomains are not available on this node yet.'}
            </ServerNotice>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Subdomain slug"
                    value={slugDraft}
                    onChange={(e) =>
                      setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    placeholder="myserver"
                    disabled={!access.canUpdateAllocations}
                    hint={
                      previewFqdn
                        ? `Resolves as ${previewFqdn}`
                        : baseDomain
                          ? `Creates slug.${baseDomain}`
                          : undefined
                    }
                  />
                </div>
                {access.canUpdateAllocations ? (
                  <Button
                    type="button"
                    disabled={working === 'domain' || !slugDraft.trim()}
                    onClick={() => void handleSaveDomain()}
                  >
                    {working === 'domain'
                      ? 'Saving…'
                      : domainInfo.domain
                        ? 'Update subdomain'
                        : 'Create subdomain'}
                  </Button>
                ) : null}
              </div>

              {domainInfo.domain ? (
                <>
                  <dl className="overflow-hidden rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]/50">
                    <InfoRow icon={Server} label="IP" value={domainInfo.ipAddress} mono />
                    <InfoRow
                      icon={Globe}
                      label="Hostname"
                      value={domainInfo.subdomainAddress ?? '—'}
                      hint={
                        domainInfo.domain.hostnameOnly
                          ? 'Minecraft SRV active — hostname only'
                          : domainInfo.feature.hostnameOnlySupported
                            ? 'Re-save to create Minecraft SRV'
                            : 'This game needs hostname:port'
                      }
                      mono
                    />
                  </dl>

                  {access.canUpdateAllocations ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">Show players:</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={!domainInfo.preferSubdomain ? 'primary' : 'secondary'}
                        disabled={working === 'prefer'}
                        onClick={() => void handlePrefer(false)}
                      >
                        Use IP
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={domainInfo.preferSubdomain ? 'primary' : 'secondary'}
                        disabled={working === 'prefer'}
                        onClick={() => void handlePrefer(true)}
                      >
                        Use subdomain
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={working === 'domain-delete'}
                        onClick={() => setDeleteDomainOpen(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </ServerPanel>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove this allocation?"
        detail={deleteTarget?.address}
        description="This unassigns the port from your server. Restart the server for binding changes to take effect on the running container."
        confirmLabel="Remove allocation"
        tone="warning"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteAllocation()}
      />
      <ConfirmModal
        open={deleteDomainOpen}
        title="Remove subdomain?"
        description="This deletes the Cloudflare DNS record. Players using the subdomain will stop connecting until you create a new one."
        confirmLabel="Remove subdomain"
        tone="warning"
        loading={deleteLoading}
        onClose={() => setDeleteDomainOpen(false)}
        onConfirm={() => void confirmDeleteDomain()}
      />
    </ServerPage>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
  mono,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,9rem)_1fr] sm:items-start sm:gap-4">
      <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {label}
      </dt>
      <dd className="min-w-0">
        <p className={`text-sm font-medium ${mono ? 'break-all font-mono text-[12px]' : ''}`}>{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p> : null}
      </dd>
    </div>
  );
}

function CopyRow({
  icon: Icon,
  label,
  value,
  hint,
  copied,
  onCopy,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,9rem)_1fr_auto] sm:items-center sm:gap-4">
      <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {label}
      </dt>
      <dd className="min-w-0">
        <p className="break-all font-mono text-[13px] font-semibold">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p> : null}
      </dd>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1.5 justify-self-start rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition sm:justify-self-end ${
          copied
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
