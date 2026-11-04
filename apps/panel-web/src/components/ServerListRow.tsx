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
import { prefetchServerTab } from '../lib/prefetch-server-tabs';
import { LocationFlag } from './LocationFlag';
import { ServerEggIcon } from './ServerEggIcon';
import { ServerHostNotice } from './ServerHostNotice';
import { ServerStatusBadge } from './ServerStatusBadge';
import { UserAvatar } from './UserAvatar';

export type ServerListMetaOwner = { username: string; avatarUrl?: string | null };

export function ServerListTable({
  servers,
  hrefFor,
  metaLabelFor,
  metaOwnerFor,
  compact = false,
}: {
  servers: ServerSummary[];
  hrefFor?: (server: ServerSummary) => string;
  /** Replaces the node chip label (e.g. owner on node detail). */
  metaLabelFor?: (server: ServerSummary) => string;
  /** When set, shows owner avatar + username instead of the location/node chip. */
  metaOwnerFor?: (server: ServerSummary) => ServerListMetaOwner | null | undefined;
  compact?: boolean;
}) {
  return (
    <ul className={`ds-servers-rows${compact ? ' ds-servers-rows--compact' : ''}`} aria-label="Server list">
      {servers.map((server) => (
        <li key={server.id}>
          <ServerListRow
            server={server}
            href={hrefFor?.(server)}
            metaLabel={metaLabelFor?.(server)}
            metaOwner={metaOwnerFor?.(server) ?? undefined}
            compact={compact}
          />
        </li>
      ))}
    </ul>
  );
}

function ServerListRow({
  server,
  href: hrefProp,
  metaLabel,
  metaOwner,
  compact = false,
}: {
  server: ServerSummary;
  href?: string;
  metaLabel?: string;
  metaOwner?: ServerListMetaOwner;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const theme = getServerTheme(server.egg.name);
  const cardStyle = resolveServerCardStyle(appearance.serverCardStyle);
  const [copied, setCopied] = useState(false);
  const href = hrefProp ?? `/servers/${server.id}`;
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });
  const location = server.node.location;

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
      className={`ds-servers-row group${compact ? ' ds-servers-row--compact' : ''}`}
      style={{ '--row-accent': theme.accent, '--row-glow': theme.glow } as React.CSSProperties}
      role="link"
      tabIndex={0}
      onClick={openServer}
      onMouseEnter={() => prefetchServerTab('console')}
      onFocus={() => prefetchServerTab('console')}
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
          className={compact ? 'h-4 w-4' : 'h-5 w-5'}
          iconClassName={compact ? 'h-4 w-4 text-white/90' : 'h-5 w-5 text-white/90'}
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
        {metaOwner ? (
          <span className="ds-servers-row-chip ds-servers-row-chip--owner">
            <UserAvatar user={metaOwner} size="xs" className="ds-servers-row-owner-avatar" />
            <span className="truncate">@{metaOwner.username}</span>
          </span>
        ) : (
          <span className="ds-servers-row-chip">
            {location?.flagUrl ? (
              <LocationFlag url={location.flagUrl} size="sm" />
            ) : (
              <MapPin className="h-3 w-3" aria-hidden />
            )}
            <span className="truncate">
              {metaLabel ?? location?.short ?? server.node.name}
            </span>
          </span>
        )}
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
        {!compact ? (
          <ServerHostNotice
            nodeReachable={server.nodeReachable}
            maintenanceMode={server.node.maintenanceMode}
            compact
          />
        ) : null}
      </span>

      <span className="ds-servers-row-go" aria-hidden>
        <ChevronRight className="h-4 w-4" />
      </span>
    </div>
  );
}
