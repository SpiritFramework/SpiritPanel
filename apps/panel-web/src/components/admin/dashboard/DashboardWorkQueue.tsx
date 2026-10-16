import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  Loader2,
  Server,
} from 'lucide-react';
import type {
  DashboardAttentionServer,
  DashboardTicketQueue,
} from '../../../pages/admin/dashboard/types';
import { ServerEggIcon } from '../../ServerEggIcon';
import { formatTicketTime } from '../../../lib/ticket-utils';

function ticketUserLabel(user: DashboardTicketQueue['items'][number]['user']) {
  const first = user.firstName?.trim();
  return first || user.username;
}

function serverReason(server: DashboardAttentionServer): { label: string; tone: 'warn' | 'danger' | 'info' } {
  if (server.suspended) return { label: 'Suspended', tone: 'warn' };
  if (server.status === 'install_failed' || server.installStatus === 'failed') {
    return { label: 'Install failed', tone: 'danger' };
  }
  if (server.status === 'installing' || server.installStatus === 'installing') {
    return { label: 'Installing', tone: 'info' };
  }
  return { label: server.status, tone: 'warn' };
}

export function DashboardWorkQueue({
  ticketQueue,
  attentionServers,
}: {
  ticketQueue: DashboardTicketQueue;
  attentionServers: DashboardAttentionServer[];
}) {
  const tickets = ticketQueue.items;
  const clear = tickets.length === 0 && attentionServers.length === 0;

  return (
    <section className="ds-admin-dash__card ds-admin-dash__card--queue">
      <header className="ds-admin-dash__card-head">
        <div className="ds-admin-dash__card-head-icon" aria-hidden>
          <ClipboardList className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-admin-dash__card-title">Needs attention</h2>
          <p className="ds-admin-dash__card-desc">
            {clear
              ? 'Queue is clear'
              : [
                  ticketQueue.needsReply > 0 ? `${ticketQueue.needsReply} ticket replies` : null,
                  ticketQueue.urgent > 0 ? `${ticketQueue.urgent} urgent` : null,
                  attentionServers.length > 0 ? `${attentionServers.length} servers` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
        <div className="ds-admin-dash__card-actions">
          <Link to="/admin/tickets" className="ds-admin-dash__card-link">
            Tickets
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link to="/admin/servers" className="ds-admin-dash__card-link">
            Servers
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {clear ? (
        <div className="ds-admin-dash__queue-clear">
          <span className="ds-admin-dash__queue-clear-icon" aria-hidden>
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="ds-admin-dash__queue-clear-title">Nothing waiting</p>
            <p className="ds-admin-dash__queue-clear-desc">
              No ticket replies due and no suspended or installing servers.
            </p>
          </div>
        </div>
      ) : (
        <div className="ds-admin-dash__queue-grid">
          <div className="ds-admin-dash__queue-col">
            <h3 className="ds-admin-dash__queue-col-title">
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
              Support
            </h3>
            {tickets.length === 0 ? (
              <p className="ds-admin-dash__queue-empty">No tickets need a staff reply.</p>
            ) : (
              <ul className="ds-admin-dash__queue-list">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link to={`/admin/tickets/${ticket.id}`} className="ds-admin-dash__queue-row">
                      <span
                        className={`ds-admin-dash__queue-mark ds-admin-dash__queue-mark--${
                          ticket.priority === 'urgent' ? 'danger' : 'warn'
                        }`}
                        aria-hidden
                      >
                        {ticket.priority === 'urgent' ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <LifeBuoy className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="ds-admin-dash__queue-copy">
                        <span className="ds-admin-dash__queue-title">
                          #{ticket.number} · {ticket.subject}
                        </span>
                        <span className="ds-admin-dash__queue-meta">
                          {ticket.priority === 'urgent' ? 'Urgent · ' : ''}
                          {ticket.needsReply ? 'Needs reply · ' : ''}
                          {ticketUserLabel(ticket.user)} · {formatTicketTime(ticket.updatedAt)}
                        </span>
                      </span>
                      <ArrowUpRight className="ds-admin-dash__queue-arrow" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ds-admin-dash__queue-col">
            <h3 className="ds-admin-dash__queue-col-title">
              <Server className="h-3.5 w-3.5" aria-hidden />
              Servers
            </h3>
            {attentionServers.length === 0 ? (
              <p className="ds-admin-dash__queue-empty">No suspended or installing servers.</p>
            ) : (
              <ul className="ds-admin-dash__queue-list">
                {attentionServers.map((server) => {
                  const reason = serverReason(server);
                  return (
                    <li key={server.id}>
                      <Link to={`/admin/servers/${server.id}`} className="ds-admin-dash__queue-row">
                        <span className="ds-admin-dash__queue-egg" aria-hidden>
                          <ServerEggIcon
                            eggName={server.egg.name}
                            logoUrl={server.egg.logoUrl}
                            className="h-4 w-4"
                          />
                        </span>
                        <span className="ds-admin-dash__queue-copy">
                          <span className="ds-admin-dash__queue-title">{server.name}</span>
                          <span className="ds-admin-dash__queue-meta">
                            @{server.owner.username} · {server.node.name}
                          </span>
                        </span>
                        <span className={`ds-admin-dash__queue-pill ds-admin-dash__queue-pill--${reason.tone}`}>
                          {reason.tone === 'info' ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          ) : reason.tone === 'danger' ? (
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                          ) : (
                            <Ban className="h-3 w-3" aria-hidden />
                          )}
                          {reason.label}
                        </span>
                        <ArrowUpRight className="ds-admin-dash__queue-arrow" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
