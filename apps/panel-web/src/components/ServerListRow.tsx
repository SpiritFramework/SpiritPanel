import { Link } from 'react-router-dom';
import { ChevronRight, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import type { ServerSummary } from '../lib/api';
import { formatAllocationAddress } from '../lib/allocation';
import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';
import { formatResource, getServerTheme, resolveServerCardStyle } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerStatusBadge } from './ServerStatusBadge';

export function ServerListTable({ servers }: { servers: ServerSummary[] }) {
  return (
    <div className="ds-table-wrap overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Server</th>
            <th className="hidden md:table-cell">Address</th>
            <th className="hidden lg:table-cell">Node</th>
            <th className="hidden sm:table-cell">Resources</th>
            <th>Status</th>
            <th className="w-10" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => (
            <ServerListRow key={server.id} server={server} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServerListRow({ server }: { server: ServerSummary }) {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const theme = getServerTheme(server.egg.name);
  const cardStyle = resolveServerCardStyle(appearance.serverCardStyle);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  const rowClass =
    cardStyle === 'edge'
      ? 'server-list-row--edge'
      : cardStyle === 'stripe'
        ? 'server-list-row--stripe'
        : '';

  const iconClass =
    cardStyle === 'glass'
      ? 'server-list-icon--glass'
      : cardStyle === 'neon'
        ? 'server-list-icon--neon'
        : '';

  const iconStyle = {
    '--row-accent': theme.accent,
    '--row-glow': theme.glow,
    background: cardStyle === 'banner' || cardStyle === 'edge' ? theme.gradient : undefined,
  } as React.CSSProperties;

  return (
    <tr
      className={`group ${rowClass}`}
      style={{ '--row-accent': theme.accent, '--row-glow': theme.glow } as React.CSSProperties}
    >
      <td>
        <Link to={`/servers/${server.id}`} className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10 ${iconClass}`}
            style={iconStyle}
          >
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium transition group-hover:text-[var(--accent)]">{server.name}</span>
            <span className="block truncate text-[11px] text-[var(--muted)]">{server.egg.name}</span>
          </span>
        </Link>
      </td>
      <td className="hidden md:table-cell">
        <span className="font-mono text-xs text-[var(--muted)]">{address}</span>
      </td>
      <td className="hidden lg:table-cell">
        <span className="text-xs text-[var(--muted)]">{server.node.name}</span>
      </td>
      <td className="hidden sm:table-cell">
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
      <td>
        <ServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </td>
      <td>
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
      </td>
    </tr>
  );
}
