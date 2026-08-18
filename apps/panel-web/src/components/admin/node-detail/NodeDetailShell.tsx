import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Gauge, HardDrive, Network, Server, Terminal } from 'lucide-react';
import type { AdminNodeDetail } from '../../../lib/api';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
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
    <nav className="ds-nd-tabs" aria-label="Node sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-nd-tab${active === tab.id ? ' ds-nd-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 ? (
            <span className="ds-nd-tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export function NodeDetailHero({
  detail,
  wingsVersion,
  freeAllocations,
  onDownloadConfig,
  onDiagnostics,
}: {
  detail: AdminNodeDetail;
  wingsVersion: string | null;
  freeAllocations: number;
  onDownloadConfig: () => void;
  onDiagnostics: () => void;
}) {
  const statusTone = detail.maintenanceMode ? 'maintenance' : detail.online ? 'online' : 'offline';

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Server, label: 'Servers', value: String(detail.serverCount) },
    {
      icon: Gauge,
      label: 'Ports',
      value: `${detail.assignedAllocations} / ${detail.allocationCount}`,
    },
    { icon: Network, label: 'Free ports', value: String(freeAllocations) },
    {
      icon: Terminal,
      label: 'Wings',
      value: wingsVersion ?? (detail.online ? 'Connected' : 'Offline'),
    },
  ];

  return (
    <header className={`ds-nd-hero ds-nd-hero--${statusTone}`}>
      <div className="ds-nd-hero-glow" aria-hidden />
      <div className="ds-nd-hero-inner">
        <div className="ds-nd-hero-main">
          <div className="ds-nd-hero-icon" aria-hidden>
            <HardDrive className="ds-icon" />
          </div>
          <div className="min-w-0">
            <h1 className="ds-nd-hero-title">{detail.name}</h1>
            <p className="ds-nd-hero-sub">
              {detail.location.short} — {detail.location.long} ·{' '}
              <span className="font-mono">{detail.fqdn}</span>
            </p>
            <div className="ds-nd-hero-badges">
              <StatusPill
                label={detail.maintenanceMode ? 'Maintenance' : detail.online ? 'Online' : 'Offline'}
                tone={detail.maintenanceMode ? 'warning' : detail.online ? 'success' : 'danger'}
                pulse={detail.online && !detail.maintenanceMode}
              />
              {detail.behindProxy ? <span className="ds-nd-tag">Behind proxy</span> : null}
              <span className="ds-nd-tag">{detail.scheme.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="ds-nd-hero-actions">
          <Button type="button" variant="ghost" size="sm" onClick={onDownloadConfig}>
            Wings config
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDiagnostics}>
            Diagnostics
          </Button>
        </div>
      </div>

      <div className="ds-nd-hero-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="ds-nd-hero-stat">
            <span className="ds-nd-hero-stat-label">{stat.label}</span>
            <span className="ds-nd-hero-stat-value">{stat.value}</span>
          </div>
        ))}
      </div>
    </header>
  );
}

export function NodeDetailBreadcrumb({ name }: { name: string }) {
  return (
    <nav className="ds-nd-breadcrumb" aria-label="Breadcrumb">
      <Link to="/admin/nodes">Nodes</Link>
      <ChevronRight className="ds-icon ds-icon--sm opacity-50" aria-hidden />
      <span>{name}</span>
    </nav>
  );
}
