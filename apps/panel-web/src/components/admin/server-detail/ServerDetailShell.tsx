import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Copy, ExternalLink, HardDrive, MapPin, User } from 'lucide-react';
import type { AdminServerDetail } from '../../../lib/api';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatCpuLimit, formatResource, getServerTheme } from '../../../lib/server-theme';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { LocationFlag } from '../../LocationFlag';
import { ServerEggIcon } from '../../ServerEggIcon';
import { AlertBanner, StatusPill } from '../../ui';
import type { ServerDetailTab, ServerDetailTone } from '../../../pages/admin/server-detail/helpers';
import { getServerDetailTone } from '../../../pages/admin/server-detail/helpers';
import { AdminSection, AdminToolButton } from '../primitives';

export function ServerDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: ServerDetailTab; label: string; count?: number }[];
  active: ServerDetailTab;
  onChange: (tab: ServerDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs ds-adm-entity-tabs" aria-label="Server sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-header-tab ds-adm-entity-tab${active === tab.id ? ' ds-nd-header-tab--active ds-adm-entity-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? (
            <span className="ds-nd-header-tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

function toneToPill(tone: ServerDetailTone): { label: string; status: 'success' | 'warning' | 'info' | 'neutral' } {
  if (tone === 'suspended') return { label: 'Suspended', status: 'warning' };
  if (tone === 'installing') return { label: 'Installing', status: 'info' };
  if (tone === 'running') return { label: 'Running', status: 'success' };
  return { label: 'Offline', status: 'neutral' };
}

export function ServerDetailHeader({
  detail,
  fullAdmin,
  copied,
  onCopyAddress,
}: {
  detail: AdminServerDetail;
  fullAdmin: boolean;
  copied?: boolean;
  onCopyAddress?: () => void;
}) {
  const theme = getServerTheme(detail.egg.name);
  const tone = getServerDetailTone(detail);
  const pill = toneToPill(tone);
  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });
  const created = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: HardDrive, label: 'Memory', value: formatResource(detail.memory, 'MiB') },
    { icon: HardDrive, label: 'Disk', value: formatResource(detail.disk, 'MiB') },
    { icon: HardDrive, label: 'CPU', value: formatCpuLimit(detail.cpu) },
    { icon: User, label: 'Owner', value: detail.owner.username },
  ];

  return (
    <header className={`ds-asd-header ds-adm-entity ds-asd-header--${tone} ds-adm-entity--${tone === 'running' ? 'online' : tone === 'suspended' || tone === 'installing' ? 'warn' : 'offline'}`}>
      {detail.nodeOnline === false ? (
        <AlertBanner tone="warning" className="mx-4 mt-3 md:mx-6">
          Host node is offline
          {detail.nodeReachabilityError ? ` — ${detail.nodeReachabilityError}` : ''}. Server status may be stale.
        </AlertBanner>
      ) : null}
      <nav className="ds-asd-header-crumb ds-adm-entity-crumb" aria-label="Breadcrumb">
        <Link to="/admin/servers">Servers</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-asd-header-body">
        <div className="ds-asd-header-accent" style={{ background: theme.gradient }} aria-hidden />

        <div className="ds-asd-header-main">
          <div className="ds-asd-header-identity">
            <div className="ds-asd-header-icon-wrap" style={{ background: theme.gradient }} aria-hidden>
              <ServerEggIcon eggName={detail.egg.name} logoUrl={detail.egg.logoUrl} className="h-5 w-5" />
              <span className={`ds-asd-header-pulse ds-asd-header-pulse--${tone}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="ds-asd-header-title-row">
                <h1 className="ds-asd-header-title truncate">{detail.name}</h1>
                <StatusPill label={pill.label} tone={pill.status} pulse={tone === 'running'} />
                <AdminServerStatusBadge
                  status={detail.status}
                  suspended={detail.suspended}
                  installStatus={detail.installStatus}
                  containerState={detail.containerState}
                  compact
                />
              </div>

              <p className="ds-asd-header-sub truncate">
                {detail.egg.nest.name} · {detail.egg.name}
              </p>

              <div className="ds-asd-header-address-row">
                <MapPin className="ds-icon ds-icon--sm opacity-70" aria-hidden />
                {detail.node.location.flagUrl ? (
                  <LocationFlag url={detail.node.location.flagUrl} size="sm" />
                ) : null}
                <span className="ds-text-mono truncate">{address}</span>
                {onCopyAddress ? (
                  <button type="button" className="ds-asd-header-copy" onClick={onCopyAddress}>
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="ds-asd-header-actions ds-adm-entity-actions">
            {fullAdmin ? (
              <AdminToolButton to={`/admin/servers/${detail.id}/manage`}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Manage server
              </AdminToolButton>
            ) : null}
          </div>
        </div>

        <div className="ds-asd-header-stats" role="list" aria-label="Server summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-asd-header-stat" role="listitem">
              <span className="ds-asd-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-asd-header-stat-copy">
                <span className="ds-asd-header-stat-label">{stat.label}</span>
                <span className="ds-asd-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
          <div className="ds-asd-header-stat" role="listitem">
            <span className="ds-asd-header-stat-icon" aria-hidden>
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <span className="ds-asd-header-stat-copy">
              <span className="ds-asd-header-stat-label">Created</span>
              <span className="ds-asd-header-stat-value">{created}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ServerDetailQuickDock({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string; onClick: () => void }[];
}) {
  return (
    <nav className="ds-asd-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <button key={item.label} type="button" className="ds-asd-dock-item" onClick={item.onClick}>
          <span className="ds-asd-dock-icon" aria-hidden>
            <item.icon className="ds-icon ds-icon--sm" />
          </span>
          <span className="ds-asd-dock-copy">
            <span className="ds-asd-dock-label">{item.label}</span>
            <span className="ds-asd-dock-hint">{item.hint}</span>
          </span>
          <ChevronRight className="ds-asd-dock-chevron ds-icon ds-icon--sm" aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export function ServerDetailPanel({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
  tone?: 'danger' | 'warning';
}) {
  return (
    <AdminSection
      className={`ds-asd-panel${tone ? ` ds-asd-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
      icon={Icon}
      title={title}
      description={description}
      badge={badge}
      tone={tone === 'danger' ? 'danger' : 'default'}
    >
      {children}
    </AdminSection>
  );
}

export function ServerDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-asd-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-asd-meta-item">
          <dt className="ds-asd-meta-label">{item.label}</dt>
          <dd className={`ds-asd-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-asd-meta-copy" onClick={item.onCopy}>
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
