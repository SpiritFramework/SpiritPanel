import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FolderOpen, Hash, Info, LifeBuoy, MessageSquare, Server, User, X } from 'lucide-react';
import type { TicketDetail } from '../../lib/api';
import { AlertBanner } from '../ui';
import { TicketPriorityBadge, TicketStatusBadge } from './TicketBadges';
import { TicketChat, TicketReplyBox } from './TicketChat';
import { displayTicketUser, formatTicketTime, ticketCategoryLabel } from '../../lib/ticket-utils';

export function TicketDetailShell({
  ticket,
  backHref,
  backLabel,
  headerActions,
  error,
  currentUserId,
  reply,
  onReplyChange,
  onSendReply,
  sending,
  closed,
  closedMessage,
  replyPlaceholder,
  sidebar,
  variant = 'client',
}: {
  ticket: TicketDetail;
  backHref: string;
  backLabel: string;
  headerActions?: ReactNode;
  error?: string;
  currentUserId?: string;
  reply: string;
  onReplyChange: (value: string) => void;
  onSendReply: (payload: { body: string; images: File[] }) => void;
  sending?: boolean;
  closed?: boolean;
  closedMessage?: ReactNode;
  replyPlaceholder?: string;
  sidebar: ReactNode;
  variant?: 'client' | 'admin';
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('ticket-chat-page');
    return () => document.documentElement.classList.remove('ticket-chat-page');
  }, []);

  useEffect(() => {
    setDetailsOpen(false);
  }, [ticket.id]);

  useEffect(() => {
    if (!detailsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailsOpen]);

  return (
    <div className={`ticket-page ticket-page--${variant}${error ? ' ticket-page--has-error' : ''}`}>
      <header className="ticket-page__header glass">
        <Link to={backHref} className="ticket-page__back" aria-label={backLabel} title={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="ticket-page__header-icon" aria-hidden>
          <LifeBuoy className="h-4 w-4" />
        </div>

        <div className="ticket-page__heading">
          <div className="ticket-page__id-row">
            <span className="ticket-page__id">Ticket #{ticket.number}</span>
            <span className="ticket-page__id-sep" aria-hidden>
              ·
            </span>
            <span className="ticket-page__id-cat">{ticketCategoryLabel(ticket.category)}</span>
          </div>
          <h1 className="ticket-page__title">{ticket.subject}</h1>
        </div>

        <div className="ticket-page__badges">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        <div className="ticket-page__actions">
          {headerActions}
          <button
            type="button"
            className="ticket-page__details-btn"
            aria-label="Show ticket details"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen(true)}
          >
            <Info className="h-4 w-4" />
            <span className="ticket-page__details-btn-label">Details</span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="ticket-page__error">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className="ticket-page__body">
        <section className="ticket-page__chat" aria-label="Conversation">
          <div className="ticket-page__chat-label">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Conversation</span>
            <span className="ticket-page__chat-count">{ticket.messages.length}</span>
          </div>

          <div className="ticket-page__thread">
            <div className="ticket-page__messages">
              <TicketChat messages={ticket.messages} currentUserId={currentUserId} />
            </div>

            <div className="ticket-page__footer">
              {closed ? (
                <div className="ticket-page__closed">{closedMessage}</div>
              ) : (
                <TicketReplyBox
                  value={reply}
                  onChange={onReplyChange}
                  onSubmit={onSendReply}
                  disabled={sending}
                  placeholder={replyPlaceholder}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="ticket-page__aside" aria-label="Ticket details">
          {sidebar}
        </aside>
      </div>

      {detailsOpen ? (
        <>
          <button
            type="button"
            className="ticket-page__overlay"
            aria-label="Close details"
            onClick={() => setDetailsOpen(false)}
          />
          <div className="ticket-page__sheet" role="dialog" aria-label="Ticket details">
            <div className="ticket-page__sheet-head">
              <span className="ticket-page__sheet-title">Ticket details</span>
              <button
                type="button"
                className="ticket-page__sheet-close"
                aria-label="Close"
                onClick={() => setDetailsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ticket-page__sheet-body">{sidebar}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TicketDetailsCard({
  ticket,
  showUser,
  userHref,
  serverHref,
}: {
  ticket: TicketDetail;
  showUser?: boolean;
  userHref?: string;
  serverHref?: string;
}) {
  const rows: Array<{ icon: ReactNode; label: string; value: ReactNode }> = [];

  if (showUser) {
    rows.push({
      icon: <User className="h-3.5 w-3.5" />,
      label: 'Customer',
      value: (
        <>
          {userHref ? (
            <Link to={userHref} className="ticket-page__details-link">
              {displayTicketUser(ticket.user)}
            </Link>
          ) : (
            displayTicketUser(ticket.user)
          )}
          <span className="ticket-page__details-sub">{ticket.user.email}</span>
        </>
      ),
    });
  }

  rows.push(
    { icon: <Hash className="h-3.5 w-3.5" />, label: 'Ticket', value: `#${ticket.number}` },
    { icon: <FolderOpen className="h-3.5 w-3.5" />, label: 'Category', value: ticketCategoryLabel(ticket.category) },
    { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Messages', value: String(ticket.messages.length) },
    { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Opened', value: formatTicketTime(ticket.createdAt) },
    { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Last update', value: formatTicketTime(ticket.updatedAt) },
  );

  if (ticket.server) {
    rows.push({
      icon: <Server className="h-3.5 w-3.5" />,
      label: 'Server',
      value: serverHref ? (
        <Link to={serverHref} className="ticket-page__details-link">
          {ticket.server.name}
        </Link>
      ) : (
        ticket.server.name
      ),
    });
  }

  if (ticket.assignee) {
    rows.push({
      icon: <User className="h-3.5 w-3.5" />,
      label: 'Assigned to',
      value: displayTicketUser(ticket.assignee),
    });
  }

  return (
    <div className="ticket-page__card ds-card">
      <div className="ticket-page__card-head">
        <h3 className="ticket-page__card-title">Ticket details</h3>
        <div className="ticket-page__card-head-badges">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="ticket-page__card-body ticket-page__card-body--details">
        <dl className="ticket-page__details-list">
          {rows.map((row) => (
            <div key={row.label} className="ticket-page__details-row">
              <dt>
                <span className="ticket-page__details-icon" aria-hidden>
                  {row.icon}
                </span>
                {row.label}
              </dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function TicketMetaCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="ticket-page__card ds-card">
      <div className="ticket-page__card-head">
        <h3 className="ticket-page__card-title">{title}</h3>
      </div>
      <div className="ticket-page__card-body">{children}</div>
    </div>
  );
}

export function TicketMetaList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; icon?: ReactNode }>;
}) {
  return (
    <dl className="ticket-page__meta">
      {items.map((item) => (
        <div key={item.label} className="ticket-page__meta-row">
          <dt>
            {item.icon ? <span className="ticket-page__meta-icon">{item.icon}</span> : null}
            {item.label}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
