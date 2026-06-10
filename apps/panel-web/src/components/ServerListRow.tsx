import { Link } from 'react-router-dom';
import { ChevronRight, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import type { ServerSummary } from '../lib/api';
import { formatAllocationAddress } from '../lib/allocation';
import { formatResource, getServerTheme } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerStatusBadge } from './ServerStatusBadge';

export function ServerListTable({ servers }: { servers: ServerSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Server</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Address</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Node</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Resources</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <ServerListRow key={server.id} server={server} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServerListRow({ server }: { server: ServerSummary }) {
  const theme = getServerTheme(server.egg.name);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  return (
    <tr className="group border-b border-[var(--border)]/60 last:border-0 transition hover:bg-[var(--surface-hover)]/50">
      <td className="px-4 py-3">
        <Link to={`/servers/${server.id}`} className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: theme.gradient }}
          >
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium transition group-hover:accent-text">{server.name}</span>
            <span className="block truncate text-[11px] text-[var(--muted)]">{server.egg.name}</span>
          </span>
        </Link>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="font-mono text-xs text-[var(--muted)]">{address}</span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-xs text-[var(--muted)]">{server.node.name}</span>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <MemoryStick className="h-3 w-3" />
            {formatResource(server.memory ?? 0, 'MiB')}
          </span>
          <span className="inline-flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatResource(server.disk ?? 0, 'MiB')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            {server.cpu ?? 0}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/servers/${server.id}`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--muted)] transition group-hover:accent-text"
        >
          Open
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}
