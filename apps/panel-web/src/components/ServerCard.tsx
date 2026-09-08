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
import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';
import { formatResource, getServerTheme, resolveServerCardStyle } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerStatusBadge } from './ServerStatusBadge';

const BANNER_PATTERN =
  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)';

interface ServerCardProps {
  server: ServerSummary;
}

export function ServerCard({ server }: ServerCardProps) {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const theme = getServerTheme(server.egg.name);
  const cardStyle = resolveServerCardStyle(appearance.serverCardStyle);
  const [copied, setCopied] = useState(false);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  const cardVars = {
    '--card-glow': theme.glow,
    '--card-accent': theme.accent,
  } as React.CSSProperties;

  async function copyAddress(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article
      className={`server-card server-card--${cardStyle} group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)]`}
      style={cardVars}
    >
      {cardStyle === 'neon' && <div className="server-card-neon-mesh" aria-hidden />}

      <Link to={`/servers/${server.id}`} className="relative flex flex-1 flex-col">
        <CardHeader server={server} theme={theme} cardStyle={cardStyle} />

        <div className={`relative flex flex-1 flex-col ${
          cardStyle === 'banner' || cardStyle === 'poster'
            ? '-mt-2.5 px-4 pb-4'
            : cardStyle === 'split'
              ? 'px-4 pb-4 pt-2'
              : 'px-4 pb-4 pt-1'
        }`}>
          <CardBody
            server={server}
            address={address}
            copied={copied}
            flat={cardStyle === 'minimal' || cardStyle === 'outline'}
            onCopyAddress={copyAddress}
          />

          <div className="mt-2.5 flex items-center justify-end px-0.5">
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-[var(--muted)] transition group-hover:text-[var(--accent)]">
              Manage
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      <div className="relative flex gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]/40 px-4 py-2.5">
        <QuickLink to={`/servers/${server.id}/console`} icon={Terminal} label="Console" />
        <QuickLink to={`/servers/${server.id}/files`} icon={FolderOpen} label="Files" />
      </div>
    </article>
  );
}

function CardHeader({
  server,
  theme,
  cardStyle,
}: {
  server: ServerSummary;
  theme: ReturnType<typeof getServerTheme>;
  cardStyle: ReturnType<typeof resolveServerCardStyle>;
}) {
  const iconBox = (
    <div
      className={`server-card-icon-box flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        cardStyle === 'banner' || cardStyle === 'poster'
          ? 'bg-black/25 ring-1 ring-white/15 shadow-lg'
          : 'rounded-lg'
      }`}
      style={cardStyle === 'banner' || cardStyle === 'poster' ? undefined : { borderColor: theme.accent }}
    >
      <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-6 w-6" />
    </div>
  );

  const titleOnDark = cardStyle === 'banner' || cardStyle === 'poster';

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <p
        className={`text-[11px] font-semibold uppercase tracking-wider leading-snug ${
          titleOnDark ? 'text-white/55' : 'text-[var(--muted)]'
        }`}
      >
        {theme.label}
      </p>
      <h3
        className={`mt-1 line-clamp-2 font-semibold leading-snug ${
          titleOnDark ? 'text-base text-white' : 'text-base text-[var(--text)]'
        }`}
      >
        {server.name}
      </h3>
      {server.description && (
        <p
          className={`mt-1.5 line-clamp-1 text-xs leading-relaxed ${
            titleOnDark ? 'text-white/60' : 'text-[var(--muted)]'
          }`}
        >
          {server.description}
        </p>
      )}
    </div>
  );

  if (cardStyle === 'stacked') {
    return (
      <div className="server-card-stacked-head px-4 pt-4 text-center">
        <div className="server-card-icon-box mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl">
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-7 w-7" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider leading-snug text-[var(--muted)]">{theme.label}</p>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug">{server.name}</h3>
        {server.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{server.description}</p>
        )}
      </div>
    );
  }

  if (cardStyle === 'minimal') {
    return (
      <div className="server-card-minimal-head flex items-center gap-3 px-4 pt-4">
        {iconBox}
        {titleBlock}
      </div>
    );
  }

  if (cardStyle === 'poster') {
    return (
      <div className="server-card-poster relative flex min-h-[7.5rem] shrink-0 items-end px-4 pb-5 pt-6" style={{ background: theme.gradient }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{ backgroundImage: BANNER_PATTERN, backgroundSize: '18px 18px' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="relative flex w-full items-end gap-3">
          {iconBox}
          {titleBlock}
        </div>
      </div>
    );
  }

  if (cardStyle === 'split') {
    return (
      <div className="server-card-split-head flex overflow-hidden">
        <div
          className="flex w-[4.25rem] shrink-0 items-center justify-center"
          style={{ background: theme.gradient }}
        >
          <div className="server-card-icon-box flex h-11 w-11 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/15">
            <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-6 w-6" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-start px-3 py-3.5">{titleBlock}</div>
      </div>
    );
  }

  if (cardStyle === 'outline') {
    return (
      <div className="server-card-outline-head mx-3 mt-3 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-3 py-3">
        {iconBox}
        {titleBlock}
      </div>
    );
  }

  if (cardStyle === 'tile') {
    return (
      <div className="server-card-tile-head relative overflow-hidden px-4 pt-4 pb-1">
        <div className="server-card-tile-mark pointer-events-none absolute -right-2 -top-1 opacity-[0.12]" aria-hidden>
          <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-24 w-24" />
        </div>
        <div className="relative flex items-start gap-3">
          {iconBox}
          {titleBlock}
        </div>
      </div>
    );
  }

  if (cardStyle === 'banner') {
    return (
      <div className="server-card-banner relative shrink-0 px-4 pb-5 pt-4" style={{ background: theme.gradient }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ backgroundImage: BANNER_PATTERN, backgroundSize: '18px 18px' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="relative flex items-start gap-3">
          {iconBox}
          {titleBlock}
        </div>
      </div>
    );
  }

  const headClass =
    cardStyle === 'stripe'
      ? 'server-card-stripe-head'
      : cardStyle === 'edge'
        ? 'server-card-edge-head'
        : cardStyle === 'neon'
          ? 'server-card-neon-head'
          : 'server-card-glass-head';

  return (
    <div className={headClass}>
      {iconBox}
      {titleBlock}
    </div>
  );
}

function CardBody({
  server,
  address,
  copied,
  flat,
  onCopyAddress,
}: {
  server: ServerSummary;
  address: string;
  copied: boolean;
  flat?: boolean;
  onCopyAddress: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`flex flex-1 flex-col ${flat ? 'border-t border-[var(--border)] pt-3' : 'glass-panel rounded-xl p-3'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <ServerStatusBadge
            status={server.status}
            suspended={server.suspended}
            installStatus={server.installStatus}
            containerState={server.containerState}
            compact
          />
          {server.nodeReachable === false ? (
            <p className="mt-1 text-[11px] leading-snug text-[var(--warning-fg)]">Node unreachable</p>
          ) : null}
        </div>
        <span className="truncate text-[11px] leading-snug text-[var(--muted)]">{server.egg.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide leading-snug text-[var(--muted)]">Address</p>
          <p className="mt-0.5 truncate font-mono text-xs font-medium leading-snug">{address}</p>
        </div>
        <button
          type="button"
          onClick={onCopyAddress}
          aria-label={copied ? 'Copied' : 'Copy address'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition ${
            copied
              ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]'
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--border)] pt-2.5 text-[11px] leading-snug text-[var(--muted)]">
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
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
