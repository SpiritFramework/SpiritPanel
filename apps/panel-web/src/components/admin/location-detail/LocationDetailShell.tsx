import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Copy,
  Globe,
  MapPin,
  Network,
  Plus,
  Server,
  Wrench,
} from 'lucide-react';
import type { AdminLocationDetail } from '../../../lib/api';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import { LocationFlag } from '../../LocationFlag';

export type LocationDetailTab = 'settings' | 'nodes';

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
    <nav className="ds-nd-header-tabs" aria-label="Location sections">
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

export function LocationDetailHeaderShell({
  detail,
  onViewNodes,
  onCopyUuid,
  copied,
  tabNav,
}: {
  detail: AdminLocationDetail;
  onViewNodes: () => void;
  onCopyUuid?: () => void;
  copied?: boolean;
  tabNav: ReactNode;
}) {
  const inUse = detail.nodeCount > 0;
  const tone = inUse ? 'active' : 'empty';
  const maintenanceCount = detail.nodes.filter((n) => n.maintenanceMode).length;
  const portTotal = detail.nodes.reduce((sum, n) => sum + n.allocationCount, 0);
  const createdLabel = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
    <div className="ds-loc-header-wrap">
      <header className={`ds-loc-header ds-loc-header--${tone}`}>
        <nav className="ds-loc-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin/locations">Locations</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span className="truncate">{detail.short}</span>
        </nav>

        <div className="ds-loc-header-body">
          <div className="ds-loc-header-accent" aria-hidden />

          <div className="ds-loc-header-main">
            <div className="ds-loc-header-identity">
              <div className="ds-loc-header-icon-wrap" aria-hidden>
                {detail.flagUrl ? (
                  <LocationFlag url={detail.flagUrl} size="lg" className="ds-loc-header-flag" />
                ) : (
                  <MapPin className="ds-icon" />
                )}
                <span className={`ds-loc-header-pulse ds-loc-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-loc-header-title-row">
                  <h1 className="ds-loc-header-title">{detail.long}</h1>
                  <StatusPill
                    label={inUse ? 'In use' : 'Empty'}
                    tone={inUse ? 'success' : 'neutral'}
                    pulse={inUse}
                  />
                </div>

                <p className="ds-loc-header-meta">
                  <span className="ds-text-mono">{detail.short}</span>
                  <span className="ds-loc-header-meta-sep" aria-hidden>
                    ·
                  </span>
                  <span>Region identifier</span>
                </p>

                <div className="ds-loc-header-code">
                  <code className="ds-loc-header-code-text">{uuidShort}</code>
                  {onCopyUuid ? (
                    <button
                      type="button"
                      className="ds-loc-header-code-copy"
                      onClick={onCopyUuid}
                      aria-label="Copy location UUID"
                    >
                      <Copy className="h-3 w-3" aria-hidden />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  ) : null}
                </div>

                <div className="ds-loc-header-tags">
                  <span className="ds-loc-header-tag">Since {createdLabel}</span>
                  {detail.flagUrl ? <span className="ds-loc-header-tag">Custom flag</span> : null}
                  {detail.serverCount > 0 ? (
                    <span className="ds-loc-header-tag">
                      {detail.serverCount} server{detail.serverCount === 1 ? '' : 's'} fleet-wide
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ds-loc-header-actions">
              <Button type="button" variant="secondary" size="sm" onClick={onViewNodes}>
                <Network className="h-3.5 w-3.5" aria-hidden />
                View nodes
              </Button>
              <Link to="/admin/nodes">
                <Button type="button" variant="ghost" size="sm">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add node
                </Button>
              </Link>
            </div>
          </div>

          <div className="ds-loc-header-stats" role="list" aria-label="Location summary">
            {stats.map((stat) => (
              <div key={stat.label} className="ds-loc-header-stat" role="listitem">
                <span className="ds-loc-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-loc-header-stat-copy">
                  <span className="ds-loc-header-stat-label">{stat.label}</span>
                  <span className="ds-loc-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
      {tabNav}
    </div>
  );
}

export { NodeOverviewSection as LocationOverviewSection } from '../node-detail/NodeDetailShell';
