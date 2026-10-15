import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Globe,
  RefreshCw,
  Server,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';
import type { DomainFleetStats } from './domain-fleet-utils';

export function DomainsHeader({
  stats,
  refreshing,
  loading,
  onRefresh,
}: {
  stats: DomainFleetStats;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const tone = stats.total === 0 ? 'idle' : stats.errors > 0 ? 'warn' : 'live';
  const statusLabel =
    stats.total === 0 ? 'No subdomains' : stats.errors > 0 ? `${stats.errors} errors` : `${stats.total} active`;

  const headerStats = [
    { icon: Globe, label: 'Subdomains', value: String(stats.total) },
    { icon: Server, label: 'Nodes', value: String(stats.nodes) },
    { icon: Users, label: 'Owners', value: String(stats.owners) },
    { icon: AlertTriangle, label: 'Errors', value: String(stats.errors) },
  ];

  return (
    <div className="ds-plg-header-wrap">
      <header className={`ds-plg-header ds-plg-header--${tone === 'warn' ? 'idle' : tone}`}>
        <nav className="ds-plg-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Subdomains</span>
        </nav>

        <div className="ds-plg-header-body">
          <div className="ds-plg-header-accent" aria-hidden />

          <div className="ds-plg-header-main">
            <div className="ds-plg-header-identity">
              <div className="ds-plg-header-icon-wrap" aria-hidden>
                <Globe className="ds-icon" />
                <span className={`ds-plg-header-pulse ds-plg-header-pulse--${tone === 'warn' ? 'idle' : tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-plg-header-title-row">
                  <h1 className="ds-plg-header-title">Subdomains</h1>
                  <StatusPill
                    label={statusLabel}
                    tone={tone === 'live' ? 'success' : tone === 'warn' ? 'warning' : 'neutral'}
                    pulse={tone === 'warn'}
                  />
                </div>
                <p className="ds-plg-header-meta">
                  Cloudflare DNS records created for game servers — one subdomain per server
                </p>
              </div>
            </div>

            <div className="ds-plg-header-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing || loading}
                aria-label="Refresh subdomains"
              >
                <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Link to="/admin/settings">
                <Button type="button" variant="secondary" size="sm">
                  <Settings className="h-3.5 w-3.5" aria-hidden />
                  Cloudflare DNS
                </Button>
              </Link>
            </div>
          </div>

          <div className="ds-plg-header-stats" role="list" aria-label="Subdomain summary">
            {headerStats.map((stat) => (
              <div key={stat.label} className="ds-plg-header-stat" role="listitem">
                <span className="ds-plg-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-plg-header-stat-copy">
                  <span className="ds-plg-header-stat-label">{stat.label}</span>
                  <span className="ds-plg-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
