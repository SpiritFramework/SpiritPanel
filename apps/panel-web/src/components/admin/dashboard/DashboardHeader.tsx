import {
  HardDrive,
  LifeBuoy,
  Plus,
  RefreshCw,
  Server,
  Users,
} from 'lucide-react';
import { useBranding } from '../../../context/BrandingContext';
import {
  greetingForHour,
  type DashboardStats,
  type DashboardTicketQueue,
} from '../../../pages/admin/dashboard/types';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';

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
  const nodesOffline = stats.nodes - stats.nodesOnline;

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow={`${greetingForHour()}, ${name}`}
        title="Admin Panel"
        description={branding.tagline || 'Fleet overview across servers, nodes, and support'}
        pill={nodesOffline > 0 ? `${nodesOffline} node offline` : `${stats.nodesOnline} nodes online`}
        pillTone={nodesOffline > 0 ? 'warn' : stats.nodes > 0 ? 'ok' : 'neutral'}
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh dashboard">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            <AdminToolButton to="/admin/nodes/new">
              <HardDrive className="h-3.5 w-3.5" aria-hidden />
              Add node
            </AdminToolButton>
            <AdminToolButton to="/admin/servers/new" primary>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New server
            </AdminToolButton>
          </>
        }
      />
      <AdminKpiStrip
        label="Fleet summary"
        items={[
          { icon: Server, label: 'Servers', value: stats.servers },
          {
            icon: HardDrive,
            label: 'Nodes',
            value: `${stats.nodesOnline}/${stats.nodes}`,
            tone: nodesOffline > 0 ? 'warning' : stats.nodesOnline > 0 ? 'success' : undefined,
          },
          { icon: Users, label: 'Users', value: stats.users },
          {
            icon: LifeBuoy,
            label: 'Tickets',
            value: ticketQueue.open,
            tone: ticketQueue.open > 0 ? 'warning' : undefined,
          },
          { icon: Server, label: 'Allocations', value: `${stats.allocationsUsed}/${stats.allocationsTotal}` },
        ]}
      />
    </div>
  );
}
