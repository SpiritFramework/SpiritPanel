import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Copy,
  Download,
  Gauge,
  HardDrive,
  MapPin,
  Network,
  Server,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { AdminNodeDetail } from '../../../lib/api';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import { LocationFlag } from '../../LocationFlag';
import type { NodeDetailTab } from '../../../pages/admin/node-detail/helpers';

export function NodeDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: NodeDetailTab; label: string; count?: number }[];
  active: NodeDetailTab;
  onChange: (tab: NodeDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs" aria-label="Node sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-header-tab${active === tab.id ? ' ds-nd-header-tab--active' : ''}`}
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

export function NodeDetailHeader({
  detail,
  wingsVersion,
  freeAllocations,
  onDownloadConfig,
  onDiagnostics,
  onCopyFqdn,
  copied,
}: {
  detail: AdminNodeDetail;
  wingsVersion: string | null;
  freeAllocations: number;
  onDownloadConfig: () => void;
  onDiagnostics: () => void;
  onCopyFqdn?: () => void;
  copied?: boolean;
}) {
  const statusTone = detail.maintenanceMode ? 'maintenance' : detail.online ? 'online' : 'offline';
  const statusLabel = detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline';
  const createdLabel = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    {
      icon: Gauge,
      label: 'Ports',
      value: `${detail.assignedAllocations}/${detail.allocationCount}`,
    },
    { icon: Network, label: 'Free', value: String(freeAllocations) },
    {
      icon: HardDrive,
      label: 'Wings',
      value: wingsVersion ?? (detail.online ? 'Connected' : 'Offline'),
    },
    { icon: MapPin, label: 'Region', value: detail.location.short },
  ];

  return (
    <header className={`ds-nd-header ds-nd-header--${statusTone}`}>
      <nav className="ds-nd-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/nodes">Nodes</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.name}</span>
      </nav>

      <div className="ds-nd-header-body">
        <div className="ds-nd-header-accent" aria-hidden />

        <div className="ds-nd-header-main">
          <div className="ds-nd-header-identity">
            <div className="ds-nd-header-icon-wrap" aria-hidden>
              <HardDrive className="ds-icon" />
              <span className={`ds-nd-header-pulse ds-nd-header-pulse--${statusTone}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="ds-nd-header-title-row">
                <h1 className="ds-nd-header-title">{detail.name}</h1>
                <StatusPill
                  label={statusLabel}
                  tone={detail.maintenanceMode ? 'warning' : detail.online ? 'success' : 'danger'}
                  pulse={detail.online && !detail.maintenanceMode}
                />
              </div>

              <p className="ds-nd-header-meta">
                <span className="inline-flex items-center gap-1">
                  {detail.location.flagUrl ? (
                    <LocationFlag url={detail.location.flagUrl} size="sm" />
                  ) : null}
                  {detail.location.short}
                </span>
                <span className="ds-nd-header-meta-sep" aria-hidden>
                  ·
                </span>
                <span>{detail.location.long}</span>
              </p>

              <div className="ds-nd-header-fqdn">
                <code className="ds-nd-header-fqdn-text">{detail.fqdn}</code>
                {onCopyFqdn ? (
                  <button
                    type="button"
                    className="ds-nd-header-fqdn-copy"
                    onClick={onCopyFqdn}
                    aria-label="Copy FQDN"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>

              <div className="ds-nd-header-tags">
                <span className="ds-nd-header-tag">{detail.scheme.toUpperCase()}</span>
                {detail.behindProxy ? <span className="ds-nd-header-tag">Behind proxy</span> : null}
                <span className="ds-nd-header-tag">Since {createdLabel}</span>
              </div>
            </div>
          </div>

          <div className="ds-nd-header-actions">
            <Button type="button" variant="secondary" size="sm" onClick={onDownloadConfig}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Wings config
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDiagnostics}>
              <Stethoscope className="h-3.5 w-3.5" aria-hidden />
              Diagnostics
            </Button>
          </div>
        </div>

        <div className="ds-nd-header-stats" role="list" aria-label="Node summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-nd-header-stat" role="listitem">
              <span className="ds-nd-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-nd-header-stat-copy">
                <span className="ds-nd-header-stat-label">{stat.label}</span>
                <span className="ds-nd-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/** @deprecated Use NodeDetailHeader — kept for any external imports */
export function NodeDetailHero(props: Parameters<typeof NodeDetailHeader>[0]) {
  return <NodeDetailHeader {...props} />;
}

/** @deprecated Breadcrumb is integrated into NodeDetailHeader */
export function NodeDetailBreadcrumb({ name }: { name: string }) {
  return (
    <nav className="ds-nd-header-crumb ds-nd-header-crumb--solo" aria-label="Breadcrumb">
      <Link to="/admin/nodes">Nodes</Link>
      <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
      <span>{name}</span>
    </nav>
  );
}

export function NodeOverviewQuickDock({
  items,
}: {
  items: { icon: LucideIcon; label: string; hint: string; onClick: () => void }[];
}) {
  return (
    <nav className="ds-nd-ov-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <button key={item.label} type="button" className="ds-nd-ov-dock-item" onClick={item.onClick}>
          <span className="ds-nd-ov-dock-icon" aria-hidden>
            <item.icon className="ds-icon ds-icon--sm" />
          </span>
          <span className="ds-nd-ov-dock-copy">
            <span className="ds-nd-ov-dock-label">{item.label}</span>
            <span className="ds-nd-ov-dock-hint">{item.hint}</span>
          </span>
          <ChevronRight className="ds-nd-ov-dock-chevron ds-icon ds-icon--sm" aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export function NodeOverviewSection({
  id,
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  id?: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`ds-nd-ov-card${className ? ` ${className}` : ''}`}>
      <header className="ds-nd-ov-card-head">
        <span className="ds-nd-ov-card-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="ds-nd-ov-card-title">{title}</h2>
          {description ? <p className="ds-nd-ov-card-desc">{description}</p> : null}
        </div>
        {badge ? <span className="ds-nd-ov-card-badge">{badge}</span> : null}
      </header>
      <div className="ds-nd-ov-card-body">{children}</div>
    </section>
  );
}

export function NodeOverviewEndpoint({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="ds-nd-ov-endpoint">
      <span className="ds-nd-ov-endpoint-label">{label}</span>
      <span className={`ds-nd-ov-endpoint-value${mono ? ' font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export function NodeOverviewCopyField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="ds-nd-ov-copy-field">
      <span className="ds-nd-ov-copy-field-label">{label}</span>
      <div className="ds-nd-ov-copy-field-row">
        <code className="ds-nd-ov-copy-field-value">{value}</code>
        <button type="button" className="ds-nd-ov-copy-field-btn" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function NodeOverviewSpec({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="ds-nd-ov-spec">
      <span className="ds-nd-ov-spec-label">{label}</span>
      <span className={`ds-nd-ov-spec-value${mono ? ' font-mono' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}

export function NodeOverviewOfflineBanner({
  detail,
  onDownloadConfig,
}: {
  detail: AdminNodeDetail;
  onDownloadConfig: () => void;
}) {
  return (
    <div className="ds-nd-ov-offline">
      <div className="ds-nd-ov-offline-icon" aria-hidden>
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="ds-nd-ov-offline-title">FeatherWings is not reachable</p>
        <p className="ds-nd-ov-offline-text">
          Install and start FeatherWings on this host, then open ports{' '}
          <strong>{detail.daemonListen}</strong> (API) and <strong>{detail.daemonSftp}</strong> (SFTP).
        </p>
      </div>
      <Button type="button" size="sm" onClick={onDownloadConfig}>
        <Download className="h-3.5 w-3.5" aria-hidden />
        Download config
      </Button>
    </div>
  );
}
