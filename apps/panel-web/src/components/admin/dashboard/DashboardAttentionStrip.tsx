import { Link } from 'react-router-dom';
import { AlertTriangle, Ban, ChevronRight, LifeBuoy, Loader2, type LucideIcon } from 'lucide-react';
import type { DashboardStats, DashboardTicketQueue } from '../../../pages/admin/dashboard/types';

type Callout = {
  key: string;
  to: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: 'warn' | 'danger' | 'info';
  spin?: boolean;
};

export function DashboardAttentionStrip({
  stats,
  ticketQueue,
}: {
  stats: DashboardStats;
  ticketQueue: DashboardTicketQueue;
}) {
  const nodesOffline = stats.nodes - stats.nodesOnline;
  const callouts: Callout[] = [];

  if (ticketQueue.urgent > 0) {
    callouts.push({
      key: 'urgent',
      to: '/admin/tickets',
      title: `${ticketQueue.urgent} urgent open ticket${ticketQueue.urgent === 1 ? '' : 's'}`,
      detail: 'Prioritize these in the support queue.',
      icon: AlertTriangle,
      tone: 'danger',
    });
  }

  if (ticketQueue.needsReply > 0) {
    callouts.push({
      key: 'needs-reply',
      to: '/admin/tickets',
      title: `${ticketQueue.needsReply} ticket${ticketQueue.needsReply === 1 ? '' : 's'} need${ticketQueue.needsReply === 1 ? 's' : ''} a staff reply`,
      detail: 'Customers are waiting on your team.',
      icon: LifeBuoy,
      tone: 'warn',
    });
  }

  if (nodesOffline > 0) {
    callouts.push({
      key: 'nodes',
      to: '/admin/nodes',
      title: `${nodesOffline} node${nodesOffline === 1 ? '' : 's'} unreachable`,
      detail: 'Check Wings connectivity and health.',
      icon: AlertTriangle,
      tone: 'danger',
    });
  }

  if (stats.suspended > 0) {
    callouts.push({
      key: 'suspended',
      to: '/admin/servers',
      title: `${stats.suspended} suspended server${stats.suspended === 1 ? '' : 's'}`,
      detail: 'Review billing holds or admin suspensions.',
      icon: Ban,
      tone: 'warn',
    });
  }

  if (stats.installing > 0) {
    callouts.push({
      key: 'installing',
      to: '/admin/servers',
      title: `${stats.installing} server${stats.installing === 1 ? '' : 's'} still installing`,
      detail: 'Install scripts are still running.',
      icon: Loader2,
      tone: 'info',
      spin: true,
    });
  }

  if (callouts.length === 0) return null;

  return (
    <div className="ds-admin-dash__attention" aria-label="Items needing attention">
      {callouts.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`ds-admin-dash__callout ds-admin-dash__callout--${item.tone}`}
          >
            <span className="ds-admin-dash__callout-icon" aria-hidden>
              <Icon className={`h-4 w-4${item.spin ? ' animate-spin' : ''}`} />
            </span>
            <span className="ds-admin-dash__callout-body">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </span>
            <ChevronRight className="ds-admin-dash__callout-chevron h-4 w-4" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}
