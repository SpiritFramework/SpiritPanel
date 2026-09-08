import { Link } from 'react-router-dom';
import { HardDrive, Plus, RefreshCw } from 'lucide-react';
import { useBranding } from '../../../context/BrandingContext';
import { sanitizeImageSrc } from '../../../lib/safe-url';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../PanelName';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import { greetingForHour } from '../../../pages/admin/dashboard/types';

export function DashboardHeader({
  name,
  panelName,
  health,
  healthTone,
  nodesOnline,
  nodesTotal,
  refreshing,
  onRefresh,
}: {
  name: string;
  panelName: string;
  health: number;
  healthTone: 'good' | 'warn' | 'bad';
  nodesOnline: number;
  nodesTotal: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { branding } = useBranding();
  const logoSrc = sanitizeImageSrc(branding.logoUrl);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const statusLabel =
    healthTone === 'good' ? 'Operational' : healthTone === 'warn' ? 'Degraded' : 'Critical';
  const statusTone = healthTone === 'good' ? 'success' : healthTone === 'warn' ? 'warning' : 'danger';

  return (
    <header className={`ds-ad-bar ds-ad-bar--${healthTone}`}>
      <div className="ds-ad-bar-accent" aria-hidden />

      <div className="ds-ad-bar-main">
        <div className="ds-ad-bar-identity">
          <div className="ds-ad-bar-icon" aria-hidden>
            {logoSrc ? (
              <img src={logoSrc} alt="" className="ds-ad-bar-icon-img" />
            ) : (
              <span className="ds-ad-bar-icon-fallback" style={panelNameGradientStyle()}>
                {panelNameInitial(panelName)}
              </span>
            )}
            <span className={`ds-ad-bar-pulse ds-ad-bar-pulse--${healthTone}`} />
          </div>

          <div className="min-w-0">
            <p className="ds-ad-bar-eyebrow">
              {greetingForHour()}, {name}
              <span aria-hidden>·</span>
              {today}
            </p>
            <h1 className="ds-ad-bar-title">
              <PanelName name={panelName} variant="compact" />
            </h1>
            <p className="ds-ad-bar-sub">Admin overview — fleet health, capacity, and provisioning</p>
          </div>
        </div>

        <div className="ds-ad-bar-side">
          <div className="ds-ad-bar-status">
            <StatusPill label={statusLabel} tone={statusTone} pulse={healthTone === 'good'} />
            <div className="ds-ad-bar-health">
              <span className="ds-ad-bar-health-label">Fleet health</span>
              <strong className="ds-ad-bar-health-value">{health}%</strong>
              <span className="ds-ad-bar-health-meta">
                {nodesOnline}/{nodesTotal} nodes online
              </span>
            </div>
          </div>

          <div className="ds-ad-bar-actions">
            <Link to="/admin/servers/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New server
              </Button>
            </Link>
            <Link to="/admin/nodes/new">
              <Button type="button" variant="secondary" size="sm">
                <HardDrive className="h-3.5 w-3.5" aria-hidden />
                Add node
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="ds-ad-bar-foot">
        <span>{branding.tagline?.trim() || 'Admin dashboard'}</span>
      </div>
    </header>
  );
}
