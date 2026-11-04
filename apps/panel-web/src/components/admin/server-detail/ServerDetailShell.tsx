import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Copy,
  Cpu,
  ExternalLink,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
  Settings,
  User,
} from 'lucide-react';
import type { AdminServerDetail } from '../../../lib/api';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatCpuLimit, formatResource, getServerTheme } from '../../../lib/server-theme';
import { LocationFlag } from '../../LocationFlag';
import { ServerEggIcon } from '../../ServerEggIcon';
import { AdminSection, AdminToolButton } from '../primitives';
import { StatusPill } from '../../ui';
import type { ServerDetailTab, ServerDetailTone } from '../../../pages/admin/server-detail/helpers';
import { getServerDetailTone } from '../../../pages/admin/server-detail/helpers';

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

function toneToPill(tone: ServerDetailTone): {
  label: string;
  status: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
} {
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
  onManage,
  onNetwork,
}: {
  detail: AdminServerDetail;
  fullAdmin: boolean;
  copied?: boolean;
  onCopyAddress?: () => void;
  onManage?: () => void;
  onNetwork?: () => void;
}) {
  const theme = getServerTheme(detail.egg.name);
  const tone = getServerDetailTone(detail);
  const entityTone =
    tone === 'running' ? 'online' : tone === 'suspended' || tone === 'installing' ? 'warn' : 'offline';
  const pill = toneToPill(tone);
  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: MemoryStick, label: 'Memory', value: formatResource(detail.memory, 'MiB') },
    { icon: HardDrive, label: 'Disk', value: formatResource(detail.disk, 'MiB') },
    { icon: Cpu, label: 'CPU', value: formatCpuLimit(detail.cpu) },
    { icon: User, label: 'Owner', value: detail.owner.username },
  ];

  const nestLabel = detail.egg.nest.name;
  const eggLabel = detail.egg.name;
  const eggMeta =
    nestLabel.toLowerCase() === eggLabel.toLowerCase()
      ? nestLabel
      : `${nestLabel} · ${eggLabel}`;

  return (
    <header
      className={`ds-asd-header ds-adm-entity ds-asd-header--${tone} ds-adm-entity--${entityTone}`}
    >
      <nav className="ds-asd-header-crumb ds-adm-entity-crumb" aria-label="Breadcrumb">
        <Link to="/admin/servers">Servers</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-asd-header-body">
        <div className="ds-asd-header-glow" aria-hidden />
        <div className="ds-asd-header-accent" style={{ background: theme.gradient }} aria-hidden />

        <div className="ds-asd-header-main">
          <div className="ds-asd-header-identity">
            <div
              className="ds-asd-header-icon-wrap"
              style={{ background: theme.gradient }}
              aria-hidden
            >
              <ServerEggIcon
                eggName={detail.egg.name}
                logoUrl={detail.egg.logoUrl}
                className="h-5 w-5"
              />
              <span className={`ds-asd-header-pulse ds-asd-header-pulse--${tone}`} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="ds-asd-header-eyebrow">Server manage</p>
              <div className="ds-asd-header-title-row">
                <h1 className="ds-asd-header-title truncate">{detail.name}</h1>
                <StatusPill
                  label={pill.label}
                  tone={pill.status}
                  pulse={tone === 'running'}
                />
              </div>

              <p className="ds-asd-header-meta">
                <span className="ds-asd-header-meta-loc">
                  {detail.node.location.flagUrl ? (
                    <LocationFlag url={detail.node.location.flagUrl} size="sm" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  )}
                  <span>{eggMeta}</span>
                </span>
                <span className="ds-asd-header-meta-sep" aria-hidden>
                  ·
                </span>
                <span>{detail.node.name}</span>
              </p>

              <div className="ds-asd-header-endpoint">
                <span className="ds-asd-header-scheme" aria-hidden>
                  <Network className="h-3 w-3" />
                </span>
                <code className="ds-asd-header-fqdn-text">{address}</code>
                {onCopyAddress ? (
                  <button
                    type="button"
                    className="ds-asd-header-fqdn-copy"
                    onClick={onCopyAddress}
                    aria-label="Copy address"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="ds-nd-toolstrip ds-adm-entity-actions ds-asd-header-actions"
            role="group"
            aria-label="Server actions"
          >
            {onNetwork ? (
              <AdminToolButton type="button" onClick={onNetwork}>
                <Network className="h-3.5 w-3.5" aria-hidden />
                Network
              </AdminToolButton>
            ) : null}
            {onManage ? (
              <AdminToolButton type="button" onClick={onManage}>
                <Settings className="h-3.5 w-3.5" aria-hidden />
                Manage
              </AdminToolButton>
            ) : null}
            {fullAdmin ? (
              <AdminToolButton to={`/admin/servers/${detail.id}/manage`} primary>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Open console
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
        </div>
      </div>
    </header>
  );
}

export function ServerDetailPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className,
  tone,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'danger' | 'warning' | 'identity' | 'capacity' | 'connection' | 'trends' | 'wings';
}) {
  const sectionTone =
    tone === 'danger'
      ? 'danger'
      : tone === 'identity' ||
          tone === 'capacity' ||
          tone === 'connection' ||
          tone === 'trends' ||
          tone === 'wings'
        ? tone
        : 'default';

  return (
    <AdminSection
      className={`ds-asd-panel${tone === 'warning' || tone === 'danger' ? ` ds-asd-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      badge={badge}
      actions={actions}
      tone={sectionTone}
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
