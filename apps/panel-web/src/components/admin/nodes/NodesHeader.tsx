import { Link } from 'react-router-dom';
import {
  HardDrive,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { normalizeAppearance } from '../../../lib/branding-appearance';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../PanelName';
import { Button } from '../../Layout';
import type { FleetStats, NodeFleetFilter } from './node-fleet-utils';

function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function NodesHeader({
  stats,
  statusFilter,
  onStatusChange,
  refreshing,
  loading,
  fullAdmin,
  onRefresh,
}: {
  stats: FleetStats;
  statusFilter: NodeFleetFilter;
  onStatusChange: (filter: NodeFleetFilter) => void;
  refreshing: boolean;
  loading: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const logoSrc = sanitizeImageSrc(branding.logoUrl);
  const name = user?.firstName?.trim() || user?.username || 'Admin';

  return (
    <header className="ds-servers-fleet">
      {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

      <div className="ds-servers-fleet-top">
        <div className="ds-servers-fleet-identity">
          {logoSrc ? (
            <div className="ds-servers-fleet-mark">
              <img src={logoSrc} alt="" />
            </div>
          ) : (
            <div className="ds-servers-fleet-mark ds-servers-fleet-mark-fallback" style={panelNameGradientStyle()}>
              {panelNameInitial(branding.panelName)}
            </div>
          )}
          <div className="ds-servers-fleet-copy">
            <p className="ds-servers-fleet-greeting">
              {greetingForHour()}, {name}
            </p>
            <h1 className="ds-servers-fleet-title">Nodes</h1>
            <div className="ds-servers-fleet-brand">
              <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
              <span className="ds-servers-fleet-tagline">Wings fleet</span>
            </div>
          </div>
        </div>

        <div className="ds-servers-fleet-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh nodes"
          >
            <RefreshCw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link to="/admin/locations">
            <Button type="button" variant="secondary">
              <MapPin className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Locations</span>
            </Button>
          </Link>
          {fullAdmin ? (
            <Link to="/admin/nodes/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden />
                Add node
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="ds-servers-fleet-stats" role="list" aria-label="Node status filters and totals">
        <FilterStat
          icon={Wifi}
          label="Online"
          value={stats.online}
          tone="success"
          active={statusFilter === 'online'}
          onClick={() => onStatusChange(statusFilter === 'online' ? 'all' : 'online')}
        />
        <FilterStat
          icon={WifiOff}
          label="Offline"
          value={stats.offline}
          tone="danger"
          active={statusFilter === 'offline'}
          onClick={() => onStatusChange(statusFilter === 'offline' ? 'all' : 'offline')}
        />
        <FilterStat
          icon={Wrench}
          label="Maintenance"
          value={stats.maintenance}
          tone="warn"
          active={statusFilter === 'maintenance'}
          onClick={() => onStatusChange(statusFilter === 'maintenance' ? 'all' : 'maintenance')}
        />
        <FilterStat
          icon={HardDrive}
          label="Total"
          value={stats.total}
          tone="info"
          active={statusFilter === 'all'}
          onClick={() => onStatusChange('all')}
        />
        <StaticStat icon={Server} label="Servers" value={stats.servers} />
        <StaticStat icon={Network} label="Ports" value={stats.allocations} />
      </div>
    </header>
  );
}

function FilterStat({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'warn' | 'danger';
  active?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'success'
      ? 'ds-servers-stat--success'
      : tone === 'info'
        ? 'ds-servers-stat--info'
        : tone === 'warn'
          ? 'ds-servers-stat--warn'
          : tone === 'danger'
            ? 'ds-servers-stat--danger'
            : '';

  return (
    <button
      type="button"
      role="listitem"
      className={`ds-servers-stat ${toneClass}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value.toLocaleString()}</span>
    </button>
  );
}

function StaticStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="ds-servers-stat" role="listitem">
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value.toLocaleString()}</span>
    </div>
  );
}
