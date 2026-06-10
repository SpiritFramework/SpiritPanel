import { Link } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Copy,
  Cpu,
  FolderOpen,
  HardDrive,
  MapPin,
  MemoryStick,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';
import type { ServerSummary } from '../lib/api';
import { formatAllocationAddress } from '../lib/allocation';
import { formatResource, getServerTheme } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerStatusBadge } from './ServerStatusBadge';

const BANNER_PATTERN =
  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)';

interface ServerCardProps {
  server: ServerSummary;
}

export function ServerCard({ server }: ServerCardProps) {
  const theme = getServerTheme(server.egg.name);
  const [copied, setCopied] = useState(false);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  async function copyAddress(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article
      className="server-card group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)]"
      style={{ '--card-glow': theme.glow } as React.CSSProperties}
    >
      <Link to={`/servers/${server.id}`} className="flex flex-1 flex-col">
        <div className="server-card-banner relative shrink-0 px-4 pb-5 pt-4" style={{ background: theme.gradient }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ backgroundImage: BANNER_PATTERN, backgroundSize: '18px 18px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/15 shadow-lg">
              <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">{theme.label}</p>
              <h3 className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug text-white">{server.name}</h3>
              {server.description && (
                <p className="mt-1 line-clamp-1 text-xs text-white/60">{server.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative -mt-2.5 flex flex-1 flex-col px-4 pb-4">
          <div className="glass-panel flex flex-1 flex-col rounded-xl p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <ServerStatusBadge
                status={server.status}
                suspended={server.suspended}
                installStatus={server.installStatus}
                containerState={server.containerState}
                compact
              />
              <span className="truncate text-[10px] text-[var(--muted)]">{server.egg.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Address</p>
                <p className="truncate font-mono text-xs font-medium">{address}</p>
              </div>
              <button
                type="button"
                onClick={copyAddress}
                aria-label={copied ? 'Copied' : 'Copy address'}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
                  copied
                    ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:accent-text hover:border-[var(--accent)]/40'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2.5 text-[10px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {server.node.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <MemoryStick className="h-3 w-3 shrink-0" />
                {formatResource(server.memory ?? 0, 'MiB')}
              </span>
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3 w-3 shrink-0" />
                {formatResource(server.disk ?? 0, 'MiB')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Cpu className="h-3 w-3 shrink-0" />
                {server.cpu ?? 0}%
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end px-0.5">
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-[var(--muted)] transition group-hover:accent-text">
              Manage
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]/40 px-4 py-2.5">
        <QuickLink to={`/servers/${server.id}/console`} icon={Terminal} label="Console" />
        <QuickLink to={`/servers/${server.id}/files`} icon={FolderOpen} label="Files" />
      </div>
    </article>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Terminal;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:accent-text"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
