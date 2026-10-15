import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Copy,
  Cpu,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
} from 'lucide-react';
import { useState } from 'react';
import type { ServerSummary } from '../lib/api';
import { formatAllocationAddress } from '../lib/allocation';
import { useBranding } from '../context/BrandingContext';
import { normalizeAppearance } from '../lib/branding-appearance';
import { formatResource, getServerTheme, resolveServerCardStyle } from '../lib/server-theme';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerStatusBadge } from './ServerStatusBadge';

export function ServerListTable({ servers }: { servers: ServerSummary[] }) {
  return (
    <ul className="ds-servers-rows" aria-label="Server list">
      {servers.map((server) => (
        <li key={server.id}>
          <ServerListRow server={server} />
        </li>
      ))}
    </ul>
  );
}

function ServerListRow({ server }: { server: ServerSummary }) {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const theme = getServerTheme(server.egg.name);
  const cardStyle = resolveServerCardStyle(appearance.serverCardStyle);
  const [copied, setCopied] = useState(false);
  const href = `/servers/${server.id}`;
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  const iconStyle = {
    '--row-accent': theme.accent,
    background:
      cardStyle === 'banner' || cardStyle === 'edge' || cardStyle === 'poster'
        ? theme.gradient
        : `color-mix(in srgb, ${theme.accent} 22%, var(--surface))`,
  } as React.CSSProperties;

  async function copyAddress(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openServer() {
    navigate(href);
  }

  return (
    <div
      className="ds-servers-row group"
      style={{ '--row-accent': theme.accent, '--row-glow': theme.glow } as React.CSSProperties}
      role="link"
      tabIndex={0}
      onClick={openServer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openServer();
        }
      }}
    >
      <span className="ds-servers-row-accent" aria-hidden />

      <span className="ds-servers-row-icon" style={iconStyle} aria-hidden>
        <ServerEggIcon
          eggName={server.egg.name}
          logoUrl={server.egg.logoUrl}
          className="h-5 w-5"
          iconClassName="h-5 w-5 text-white/90"
        />
      </span>

      <span className="ds-servers-row-main">
        <span className="ds-servers-row-title truncate">{server.name}</span>
        <span className="ds-servers-row-sub truncate">{server.egg.name}</span>
      </span>

      <span className="ds-servers-row-meta">
        <button
          type="button"
          className="ds-servers-row-chip ds-servers-row-chip--action"
          onClick={copyAddress}
          title={copied ? 'Copied' : 'Copy address'}
          aria-label={copied ? 'Address copied' : `Copy address ${address}`}
        >
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Network className="h-3 w-3" aria-hidden />}
          <span className="truncate font-mono">{address}</span>
          {!copied ? <Copy className="h-3 w-3 shrink-0 opacity-50" aria-hidden /> : null}
        </button>
        <span className="ds-servers-row-chip">
          <MapPin className="h-3 w-3" aria-hidden />
          <span className="truncate">{server.node.name}</span>
        </span>
      </span>

      <span className="ds-servers-row-resources" aria-label="Resources">
        <span className="ds-servers-row-resource">
          <MemoryStick className="h-3 w-3" aria-hidden />
          {formatResource(server.memory ?? 0, 'MiB')}
        </span>
        <span className="ds-servers-row-resource">
          <HardDrive className="h-3 w-3" aria-hidden />
          {formatResource(server.disk ?? 0, 'MiB')}
        </span>
        <span className="ds-servers-row-resource">
          <Cpu className="h-3 w-3" aria-hidden />
          {server.cpu ?? 0}%
        </span>
      </span>

      <span className="ds-servers-row-status">
        <ServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
        {server.nodeReachable === false ? (
          <span className="ds-servers-row-warn">Node unreachable</span>
        ) : null}
      </span>

      <span className="ds-servers-row-go" aria-hidden>
        <ChevronRight className="h-4 w-4" />
      </span>
    </div>
  );
}
