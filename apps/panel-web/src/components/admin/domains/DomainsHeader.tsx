import {
  AlertTriangle,
  Globe,
  RefreshCw,
  Server,
  Settings,
  Users,
} from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
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
  const statusLabel =
    stats.total === 0 ? 'No subdomains' : stats.errors > 0 ? `${stats.errors} errors` : `${stats.total} active`;

  const pillTone = stats.errors > 0 ? 'warn' : stats.total > 0 ? 'ok' : 'neutral';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="DNS"
        title="Subdomains"
        description="Cloudflare DNS records created for game servers — one subdomain per server"
        pill={statusLabel}
        pillTone={pillTone}
        actions={
          <>
            <AdminToolButton
              onClick={onRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh subdomains"
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            <AdminToolButton to="/admin/settings">
              <Settings className="h-3.5 w-3.5" aria-hidden />
              Cloudflare DNS
            </AdminToolButton>
          </>
        }
      />
      <AdminKpiStrip
        label="Subdomain summary"
        columns={4}
        items={[
          { icon: Globe, label: 'Subdomains', value: stats.total },
          { icon: Server, label: 'Nodes', value: stats.nodes },
          { icon: Users, label: 'Owners', value: stats.owners },
          {
            icon: AlertTriangle,
            label: 'Errors',
            value: stats.errors,
            tone: stats.errors > 0 ? 'danger' : undefined,
          },
        ]}
      />
    </div>
  );
}
