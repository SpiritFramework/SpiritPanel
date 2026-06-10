import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Gamepad2,
  Globe,
  Link2,
  Network,
  Plus,
  Server,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { api, type ServerAllocationsResponse, type ServerConnectionInfo } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import { Button } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EmptyState, Spinner, StatCard } from '../../components/ui';
import { ServerErrorBanner, ServerPage, ServerPageHeader } from '../../components/server/ServerPage';

export function ServerNetworkPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);
  const [data, setData] = useState<ServerAllocationsResponse | null>(null);
  const [connection, setConnection] = useState<ServerConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; address: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [allocations, conn] = await Promise.all([
        api.client.networkAllocations(id),
        api.client.connection(id).catch(() => null),
      ]);
      setData(allocations);
      setConnection(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function refreshConnection() {
    if (!id) return;
    setConnection(await api.client.connection(id).catch(() => null));
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

  const limit = data?.limit ?? 0;
  const used = data?.used ?? 0;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;
  const primary = data?.allocations.find((a) => a.isDefault);

  return (
    <ServerPage>
      <ServerPageHeader
        title="Network"
        description={`Connection details, SFTP access, and port allocations for ${server.name}`}
        actions={
          access.canCreateAllocations && data?.canCreate ? (
            <Button type="button" disabled={working === 'create'} onClick={handleAutoAssign}>
              <Plus className="h-3.5 w-3.5" />
              {working === 'create' ? 'Assigning…' : 'Auto-assign port'}
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {connection && (
        <section className="network-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
                <Link2 className="h-4 w-4 text-green-400" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Connect to your server</h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Share the game address with players · use SFTP to upload files
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <ConnectionCard
              icon={Gamepad2}
              tone="game"
              label="Game address"
              value={connection.game.address}
              detail={`${connection.game.hostname}:${connection.game.port}`}
              hint="Paste this into your game client to join"
              copied={copiedKey === 'game'}
              onCopy={() => copyText(connection.game.address, 'game')}
            />
            <ConnectionCard
              icon={Upload}
              tone="sftp"
              label="SFTP"
              value={`${connection.sftp.username}@${connection.sftp.host}:${connection.sftp.port}`}
              detail={connection.sftp.uri}
              hint="Use your panel account password to authenticate"
              copied={copiedKey === 'sftp'}
              onCopy={() => copyText(connection.sftp.uri, 'sftp')}
            />
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Allocations used"
          value={`${used} / ${limit}`}
          hint={limit === 0 ? 'Additional ports disabled (limit 0)' : `${usagePercent}% of limit`}
          icon={<Network className="h-3.5 w-3.5" />}
          tone={used >= limit ? 'warning' : 'default'}
        />
        <StatCard
          label="Primary port"
          value={primary?.port ?? server.defaultAllocation.port}
          hint={primary?.address ?? 'Main player connection'}
          icon={<Star className="h-3.5 w-3.5" />}
          tone="success"
        />
        <StatCard
          label="Node"
          value={server.node.name}
          hint={server.node.fqdn ?? connection?.node.fqdn ?? 'Hosting node'}
          icon={<Server className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="network-panel rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-[var(--muted)]">Allocation capacity</span>
          <span className="font-medium tabular-nums">
            {used} / {limit} ports
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div
            className={`h-full rounded-full transition-all ${
              used >= limit ? 'bg-amber-500' : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <section className="network-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Globe className="h-4 w-4 accent-text" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Port allocations</h3>
              <p className="text-[11px] text-[var(--muted)]">
                Primary and additional ports · bind address is the interface on the node
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-14">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !data || data.allocations.length === 0 ? (
            <EmptyState
              title="No allocations"
              description="This server has no network allocations assigned yet."
            />
          ) : (
            <div className="space-y-3">
              {data.allocations.map((alloc) => {
                const busy = working === alloc.id;
                return (
                  <article
                    key={alloc.id}
                    className={`group rounded-xl border p-4 transition ${
                      alloc.isDefault
                        ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-muted)]/25'
                        : 'border-[var(--border)] bg-[var(--bg-elevated)]/30 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:bg-[var(--surface-hover)]/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
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
                          <span className="font-mono text-[10px] text-[var(--muted)]">:{alloc.port}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-base font-semibold tracking-tight">{alloc.address}</p>
                          <CopyButton
                            label="Copy address"
                            copied={copiedKey === alloc.id}
                            onCopy={() => copyText(alloc.address, alloc.id)}
                          />
                        </div>

                        <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                          <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--bg)]/50 px-2.5 py-2">
                            <dt className="text-[var(--muted)]">Hostname</dt>
                            <dd className="mt-0.5 font-mono">{alloc.displayHost}</dd>
                          </div>
                          <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--bg)]/50 px-2.5 py-2">
                            <dt className="text-[var(--muted)]">Bind address</dt>
                            <dd className="mt-0.5 font-mono">{alloc.bindAddress}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {access.canUpdateAllocations && !alloc.isDefault && (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => handleSetPrimary(alloc.id)}
                            className="text-[12px]"
                          >
                            {busy ? 'Updating…' : 'Make primary'}
                          </Button>
                        )}
                        {access.canDeleteAllocations && !alloc.isDefault && (
                          <button
                            type="button"
                            title="Remove allocation"
                            disabled={busy}
                            onClick={() => setDeleteTarget({ id: alloc.id, address: alloc.address })}
                            className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1.5 text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {data && !data.canCreate && access.canCreateAllocations && (
            <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              {data.limit === 0
                ? 'Additional port allocations are disabled on this server (limit 0).'
                : `Allocation limit reached (${data.limit}). Contact an administrator to increase it.`}
            </p>
          )}
        </div>
      </section>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove this allocation?"
        detail={deleteTarget?.address}
        description="This unassigns the port from your server. Restart the server for binding changes to take effect on the running container."
        confirmLabel="Remove allocation"
        tone="warning"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAllocation}
      />
    </ServerPage>
  );
}

function ConnectionCard({
  icon: Icon,
  tone,
  label,
  value,
  detail,
  hint,
  copied,
  onCopy,
}: {
  icon: typeof Gamepad2;
  tone: 'game' | 'sftp';
  label: string;
  value: string;
  detail: string;
  hint: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const toneStyles = {
    game: 'bg-green-500/15 text-green-400',
    sftp: 'bg-cyan-500/15 text-cyan-400',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <CopyButton label={`Copy ${label.toLowerCase()}`} copied={copied} onCopy={onCopy} prominent />
      </div>
      <p className="break-all font-mono text-sm font-medium leading-relaxed">{value}</p>
      <p className="mt-2 truncate font-mono text-[10px] text-[var(--muted)]">{detail}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onCopy,
  prominent,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  prominent?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onCopy}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition ${
        copied
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : prominent
            ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:accent-text'
            : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:accent-text'
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}
