import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Cpu, HardDrive, MemoryStick, Trash2 } from 'lucide-react';
import { api, type AdminServerSummary } from '../lib/api';
import { formatAllocationAddress } from '../lib/allocation';
import { formatResource, getServerTheme } from '../lib/server-theme';
import { ConfirmModal } from './ConfirmModal';
import { ServerEggIcon } from './ServerEggIcon';
import { AdminServerStatusBadge } from './admin/AdminServerStatus';
import { AdminMobileCard, AdminResponsiveTable } from './admin/AdminMobileCard';

export function AdminServerTable({
  servers,
  onServerDeleted,
}: {
  servers: AdminServerSummary[];
  onServerDeleted?: () => void;
}) {
  return (
    <AdminResponsiveTable
      mobile={servers.map((server) => (
        <AdminServerMobileCard key={server.id} server={server} />
      ))}
      desktop={
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-2.5 font-semibold">Server</th>
              <th className="px-4 py-2.5 font-semibold">Owner</th>
              <th className="px-4 py-2.5 font-semibold">Node</th>
              <th className="px-4 py-2.5 font-semibold">Connection</th>
              <th className="px-4 py-2.5 font-semibold">Resources</th>
              <th className="px-4 py-2.5 font-semibold">Created</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="w-16 px-2 py-2.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <AdminServerRow key={server.id} server={server} onDeleted={onServerDeleted} />
            ))}
          </tbody>
        </table>
      }
    />
  );
}

function AdminServerMobileCard({ server }: { server: AdminServerSummary }) {
  const navigate = useNavigate();
  const theme = getServerTheme(server.egg.name);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  return (
    <AdminMobileCard
      onClick={() => navigate(`/admin/servers/${server.id}`)}
      leading={
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
          style={{ background: theme.gradient }}
        >
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
        </div>
      }
      title={server.name}
      subtitle={server.egg.name}
      badges={
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      }
      meta={
        <>
          <p>
            <span className="text-[var(--text)]">{server.owner.username}</span>
            <span className="mx-1 opacity-40">·</span>
            {server.node.name}
          </p>
          <p className="font-mono text-[10px]">{address}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <ResourceChip icon={MemoryStick} label={formatResource(server.memory, 'MiB')} />
            <ResourceChip icon={HardDrive} label={formatResource(server.disk, 'MiB')} />
            <ResourceChip icon={Cpu} label={`${server.cpu}%`} />
          </div>
        </>
      }
    />
  );
}

function AdminServerRow({
  server,
  onDeleted,
}: {
  server: AdminServerSummary;
  onDeleted?: () => void;
}) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const theme = getServerTheme(server.egg.name);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });
  const created = new Date(server.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  async function deleteServer(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteError('');
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteServer() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.admin.deleteServer(server.id);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete server');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <tr
      onClick={() => navigate(`/admin/servers/${server.id}`)}
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[180px] items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: theme.gradient }}
          >
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:accent-text">{server.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">{server.egg.name}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[120px]">
          <p className="truncate font-medium">{server.owner.username}</p>
          <p className="truncate text-[11px] text-[var(--muted)]">{server.owner.email}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[100px]">
          <p className="truncate">{server.node.name}</p>
          <p className="truncate text-[11px] text-[var(--muted)]">{server.node.location.short}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[120px]">
          <p className="font-mono text-[11px]">{address}</p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{server.uuidShort}</p>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex min-w-[150px] flex-wrap gap-1.5">
          <ResourceChip icon={MemoryStick} label={formatResource(server.memory, 'MiB')} />
          <ResourceChip icon={HardDrive} label={formatResource(server.disk, 'MiB')} />
          <ResourceChip icon={Cpu} label={`${server.cpu}%`} />
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]">{created}</td>

      <td className="px-4 py-3">
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </td>

      <td className="px-2 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="Delete server"
            disabled={deleting}
            onClick={deleteServer}
            className="rounded-md p-1.5 text-[var(--muted)] opacity-100 transition hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
        </div>
      </td>
    </tr>

    <ConfirmModal
      open={showDeleteConfirm}
      title="Permanently delete this server?"
      detail={server.name}
      description="This removes the server and all data on the node. Backups, databases, and files on the daemon will be deleted."
      confirmLabel="Delete server"
      tone="danger"
      loading={deleting}
      error={deleteError}
      onClose={() => {
        if (!deleting) {
          setShowDeleteConfirm(false);
          setDeleteError('');
        }
      }}
      onConfirm={confirmDeleteServer}
    />
    </>
  );
}

function ResourceChip({
  icon: Icon,
  label,
}: {
  icon: typeof MemoryStick;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-[10px] tabular-nums text-[var(--muted)]">
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      {label}
    </span>
  );
}
