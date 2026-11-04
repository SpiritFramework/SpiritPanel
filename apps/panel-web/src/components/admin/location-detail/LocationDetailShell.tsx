import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Copy,
  Globe,
  HardDrive,
  MapPin,
  Network,
  Plus,
  Server,
  Settings,
  Wrench,
} from 'lucide-react';
import type { AdminLocationDetail } from '../../../lib/api';
import { StatusPill } from '../../ui';
import { LocationFlag } from '../../LocationFlag';
import { AdminSection, AdminToolButton } from '../primitives';

export type LocationDetailTab = 'overview' | 'settings' | 'nodes';

export const LOCATION_GRADIENT =
  'linear-gradient(135deg, color-mix(in srgb, #0d9488 72%, #0f172a), color-mix(in srgb, #38bdf8 55%, #0f172a))';

export function LocationDetailTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: LocationDetailTab; label: string; count?: number }[];
  active: LocationDetailTab;
  onChange: (tab: LocationDetailTab) => void;
}) {
  return (
    <nav className="ds-nd-header-tabs ds-adm-entity-tabs" aria-label="Location sections">
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

export function LocationDetailHeader({
  detail,
  onViewNodes,
  onManage,
  onCopyUuid,
  copied,
}: {
  detail: AdminLocationDetail;
  onViewNodes?: () => void;
  onManage?: () => void;
  onCopyUuid?: () => void;
  copied?: boolean;
}) {
  const inUse = detail.nodeCount > 0;
  const maintenanceCount = detail.nodes.filter((n) => n.maintenanceMode).length;
  const portTotal = detail.nodes.reduce((sum, n) => sum + n.allocationCount, 0);
  const uuidShort = detail.uuid.split('-')[0] ?? detail.uuid.slice(0, 8);

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Network, label: 'Nodes', value: String(detail.nodeCount) },
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    { icon: Globe, label: 'Ports', value: String(portTotal) },
    {
      icon: Wrench,
      label: 'Maintenance',
      value: maintenanceCount > 0 ? String(maintenanceCount) : '—',
    },
  ];

  return (
    <header
      className={`ds-loc-header ds-adm-entity ds-ud-header${inUse ? ' ds-loc-header--active' : ' ds-loc-header--empty'} ds-adm-entity--${inUse ? 'online' : 'offline'}`}
    >
      <nav className="ds-loc-header-crumb ds-adm-entity-crumb ds-ud-header-crumb" aria-label="Breadcrumb">
        <Link to="/admin/locations">Locations</Link>
        <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
        <span className="truncate">{detail.short}</span>
      </nav>

      <div className="ds-loc-header-body ds-ud-header-body">
        <div className="ds-ud-header-glow" aria-hidden />
        <div
          className="ds-loc-header-accent ds-ud-header-accent"
          style={{ background: LOCATION_GRADIENT }}
          aria-hidden
        />

        <div className="ds-loc-header-main ds-ud-header-main">
          <div className="ds-loc-header-identity ds-ud-header-identity">
            <div
              className="ds-loc-header-icon-wrap ds-ud-header-avatar-wrap"
              style={detail.flagUrl ? undefined : { background: LOCATION_GRADIENT }}
              aria-hidden
            >
              {detail.flagUrl ? (
                <LocationFlag url={detail.flagUrl} size="lg" className="ds-loc-header-flag" />
              ) : (
                <MapPin className="h-5 w-5 text-white/90" />
              )}
              <span
                className={`ds-loc-header-pulse ds-ud-header-pulse${inUse ? '' : ' ds-loc-header-pulse--empty'}${inUse ? ' ds-ud-header-pulse--active' : ' ds-ud-header-pulse--suspended'}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="ds-ud-header-eyebrow">Location manage</p>
              <div className="ds-loc-header-title-row ds-ud-header-title-row">
                <h1 className="ds-loc-header-title ds-ud-header-title truncate">{detail.long}</h1>
                <StatusPill
                  label={inUse ? 'In use' : 'Empty'}
                  tone={inUse ? 'success' : 'neutral'}
                  pulse={inUse}
                />
              </div>
              <p className="ds-loc-header-meta ds-ud-header-meta">
                <span className="ds-text-mono">{detail.short}</span>
                <span className="ds-ud-header-meta-sep" aria-hidden>
                  ·
                </span>
                <span>Region identifier</span>
              </p>
              <div className="ds-ud-header-endpoint">
                <span className="ds-ud-header-scheme" aria-hidden>
                  <HardDrive className="h-3 w-3" />
                </span>
                <code className="ds-ud-header-fqdn-text truncate">{uuidShort}</code>
                {onCopyUuid ? (
                  <button
                    type="button"
                    className="ds-ud-header-fqdn-copy"
                    onClick={onCopyUuid}
                    aria-label="Copy location UUID"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="ds-nd-toolstrip ds-adm-entity-actions ds-loc-header-actions ds-ud-header-actions"
            role="group"
            aria-label="Location actions"
          >
            {onViewNodes ? (
              <AdminToolButton type="button" onClick={onViewNodes}>
                <Network className="h-3.5 w-3.5" aria-hidden />
                Nodes
              </AdminToolButton>
            ) : null}
            {onManage ? (
              <AdminToolButton type="button" onClick={onManage}>
                <Settings className="h-3.5 w-3.5" aria-hidden />
                Settings
              </AdminToolButton>
            ) : null}
            <AdminToolButton to="/admin/nodes/new" primary>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add node
            </AdminToolButton>
          </div>
        </div>

        <div className="ds-loc-header-stats ds-ud-header-stats" role="list" aria-label="Location summary">
          {stats.map((stat) => (
            <div key={stat.label} className="ds-loc-header-stat ds-ud-header-stat" role="listitem">
              <span className="ds-loc-header-stat-icon ds-ud-header-stat-icon" aria-hidden>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <span className="ds-loc-header-stat-copy ds-ud-header-stat-copy">
                <span className="ds-loc-header-stat-label ds-ud-header-stat-label">{stat.label}</span>
                <span className="ds-loc-header-stat-value ds-ud-header-stat-value">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function LocationDetailPanel({
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
  tone?: 'danger' | 'warning' | 'identity' | 'capacity' | 'connection' | 'trends' | 'wings' | 'fleet';
}) {
  const sectionTone =
    tone === 'danger'
      ? 'danger'
      : tone === 'identity' ||
          tone === 'capacity' ||
          tone === 'connection' ||
          tone === 'trends' ||
          tone === 'wings' ||
          tone === 'fleet'
        ? tone
        : 'default';

  return (
    <AdminSection
      className={`ds-loc-panel ds-nst-panel${tone === 'warning' || tone === 'danger' ? ` ds-nst-panel--${tone}` : ''}${className ? ` ${className}` : ''}`}
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

export function LocationDetailMetaGrid({
  items,
}: {
  items: { label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean }[];
}) {
  return (
    <dl className="ds-loc-meta-grid ds-nst-meta-grid ds-ud-meta-grid">
      {items.map((item) => (
        <div key={item.label} className="ds-loc-meta-item ds-nst-meta-item ds-ud-meta-item">
          <dt className="ds-loc-meta-label ds-nst-meta-label ds-ud-meta-label">{item.label}</dt>
          <dd className={`ds-loc-meta-value ds-nst-meta-value ds-ud-meta-value${item.mono ? ' ds-text-mono' : ''}`}>
            <span className="truncate" title={item.value}>
              {item.value}
            </span>
            {item.onCopy ? (
              <button type="button" className="ds-loc-meta-copy ds-nst-meta-copy ds-ud-meta-copy" onClick={item.onCopy}>
                <Copy className="h-3 w-3 inline" aria-hidden />
                {item.copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LocationDetailUsageMeter({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="ds-ud-usage-meter">
      <div className="ds-ud-usage-meter-head">
        <span>{label}</span>
        <span className="ds-ud-usage-meter-value">
          {value}
          {max > 0 ? ` / ${max}` : ''}
        </span>
      </div>
      {max > 0 ? (
        <div className="ds-ud-usage-meter-track" aria-hidden>
          <span
            className="ds-ud-usage-meter-fill"
            style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="ds-ud-usage-meter-hint">{hint}</p> : null}
    </div>
  );
}

/** @deprecated Prefer LocationDetailHeader */
export const LocationDetailHeaderShell = LocationDetailHeader;
