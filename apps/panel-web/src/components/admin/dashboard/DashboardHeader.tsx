import { Link } from 'react-router-dom';
import {
  HardDrive,
  LifeBuoy,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useBranding } from '../../../context/BrandingContext';
import { normalizeAppearance } from '../../../lib/branding-appearance';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../PanelName';
import { Button } from '../../Layout';
import {
  fleetHealthScore,
  greetingForHour,
  type DashboardStats,
  type DashboardTicketQueue,
} from '../../../pages/admin/dashboard/types';

export function DashboardHeader({
  name,
  stats,
  ticketQueue,
  refreshing,
  onRefresh,
}: {
  name: string;
  stats: DashboardStats;
  ticketQueue: DashboardTicketQueue;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const logoSrc = sanitizeImageSrc(branding.logoUrl);
  const health = fleetHealthScore(stats);
  const nodesOffline = stats.nodes - stats.nodesOnline;

  const summary =
    stats.nodes === 0
      ? 'Register a Wings node to start provisioning.'
      : [
          `${stats.nodesOnline}/${stats.nodes} nodes online`,
          health >= 85 ? 'Fleet healthy' : health >= 60 ? 'Fleet degraded' : 'Fleet critical',
          ticketQueue.needsReply > 0 ? `${ticketQueue.needsReply} tickets need reply` : null,
        ]
          .filter(Boolean)
          .join(' · ');

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
            <h1 className="ds-servers-fleet-title">Admin</h1>
            <div className="ds-servers-fleet-brand">
              <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
              {branding.tagline ? (
                <span className="ds-servers-fleet-tagline">{branding.tagline}</span>
              ) : (
                <span className="ds-servers-fleet-tagline">Fleet overview</span>
              )}
            </div>
            {refreshing ? (
              <p className="ds-servers-fleet-summary ds-servers-fleet-summary-loading">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                Refreshing fleet…
              </p>
            ) : (
              <p className="ds-servers-fleet-summary">{summary}</p>
            )}
          </div>
        </div>

        <div className="ds-servers-fleet-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link to="/admin/nodes/new">
            <Button type="button" variant="secondary">
              <HardDrive className="h-4 w-4" aria-hidden />
              Add node
            </Button>
          </Link>
          <Link to="/admin/servers/new">
            <Button type="button">
              <Plus className="h-4 w-4" aria-hidden />
              New server
            </Button>
          </Link>
        </div>
      </div>

      <div className="ds-servers-fleet-stats" role="list" aria-label="Fleet summary">
        <HeroStat
          to="/admin/servers"
          icon={Server}
          label="Servers"
          value={stats.servers}
          tone="info"
        />
        <HeroStat
          to="/admin/nodes"
          icon={HardDrive}
          label="Nodes online"
          value={stats.nodesOnline}
          tone={nodesOffline > 0 ? 'warn' : 'success'}
        />
        <HeroStat to="/admin/users" icon={Users} label="Users" value={stats.users} />
        <HeroStat
          to="/admin/tickets"
          icon={LifeBuoy}
          label="Needs reply"
          value={ticketQueue.needsReply}
          tone={ticketQueue.needsReply > 0 ? 'warn' : undefined}
        />
        <HeroStat
          to="/admin/nodes"
          icon={HardDrive}
          label="Total nodes"
          value={stats.nodes}
          tone={nodesOffline > 0 ? 'warn' : undefined}
        />
      </div>
    </header>
  );
}

function HeroStat({
  to,
  icon: Icon,
  label,
  value,
  tone,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'warn' | 'danger';
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
    <Link to={to} role="listitem" className={`ds-servers-stat ${toneClass}`}>
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value}</span>
    </Link>
  );
}
