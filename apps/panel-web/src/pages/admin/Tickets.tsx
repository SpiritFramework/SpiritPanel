import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  Inbox,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  Server,
  User,
  X,
} from 'lucide-react';
import { api, type TicketSummary } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import { AdminLayout, Page } from '../../components/Layout';
import { UserAvatar } from '../../components/UserAvatar';
import {
  AdminCallout,
  AdminFilterChips,
  AdminHero,
  AdminKpiStrip,
  AdminPageStack,
  AdminSection,
  AdminToolButton,
} from '../../components/admin/primitives';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/tickets/TicketBadges';
import { displayTicketUser, formatTicketTime, ticketCategoryLabel } from '../../lib/ticket-utils';

type FilterId = 'all' | 'open' | 'needs_reply' | 'urgent' | 'closed';

const OPEN_STATUSES = new Set(['open', 'awaiting_reply', 'in_progress']);
const CLOSED_STATUSES = new Set(['resolved', 'closed']);

function isOpenTicket(ticket: TicketSummary) {
  return OPEN_STATUSES.has(ticket.status);
}

function needsStaffReply(ticket: TicketSummary) {
  return isOpenTicket(ticket) && !ticket.lastMessageStaff;
}

export function AdminTicketsPage() {
  const { branding } = useBranding();
  const ticketsEnabled = branding.ticketsEnabled !== false;
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!ticketsEnabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.admin.tickets();
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [ticketsEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter(isOpenTicket).length,
      needsReply: items.filter(needsStaffReply).length,
      urgent: items.filter((t) => t.priority === 'urgent' && isOpenTicket(t)).length,
      closed: items.filter((t) => CLOSED_STATUSES.has(t.status)).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((ticket) => {
      if (filter === 'open' && !isOpenTicket(ticket)) return false;
      if (filter === 'needs_reply' && !needsStaffReply(ticket)) return false;
      if (filter === 'urgent' && !(ticket.priority === 'urgent' && isOpenTicket(ticket))) return false;
      if (filter === 'closed' && !CLOSED_STATUSES.has(ticket.status)) return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        String(ticket.number).includes(q) ||
        ticketCategoryLabel(ticket.category).toLowerCase().includes(q) ||
        ticket.server?.name.toLowerCase().includes(q) ||
        displayTicketUser(ticket.user).toLowerCase().includes(q) ||
        ticket.user.email.toLowerCase().includes(q) ||
        ticket.user.username.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const needsReplyTickets = useMemo(() => items.filter(needsStaffReply), [items]);
  const urgentTickets = useMemo(
    () => items.filter((t) => t.priority === 'urgent' && isOpenTicket(t)),
    [items],
  );

  const filterOptions: Array<{ id: FilterId; label: string; count: number; alert?: boolean }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'needs_reply', label: 'Needs reply', count: stats.needsReply, alert: stats.needsReply > 0 },
    { id: 'urgent', label: 'Urgent', count: stats.urgent, alert: stats.urgent > 0 },
    { id: 'closed', label: 'Closed', count: stats.closed },
  ];

  const statusLabel =
    stats.total === 0
      ? 'Queue clear'
      : stats.needsReply > 0
        ? `${stats.needsReply} need reply`
        : stats.urgent > 0
          ? `${stats.urgent} urgent`
          : `${stats.open} open`;

  const pillTone =
    stats.needsReply > 0 || stats.urgent > 0 ? 'warn' : stats.open > 0 ? 'ok' : 'neutral';

  const hasActiveFilters = filter !== 'all' || Boolean(search.trim());

  function clearFilters() {
    setFilter('all');
    setSearch('');
  }

  if (!ticketsEnabled) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <Page>
        <AdminPageStack>
          <div className="ds-nd-list-top">
            <AdminHero
              eyebrow="Support"
              title="Support tickets"
              description="Staff queue for customer tickets — reply, assign, and resolve from each thread"
              pill={loading ? 'Loading…' : statusLabel}
              pillTone={loading ? 'neutral' : pillTone}
              actions={
                <AdminToolButton onClick={() => void load()} disabled={loading} aria-label="Refresh tickets">
                  <RefreshCw className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} aria-hidden />
                  Refresh
                </AdminToolButton>
              }
            />
            {!loading && stats.total > 0 ? (
              <AdminKpiStrip
                label="Ticket summary"
                columns={4}
                items={[
                  { icon: Inbox, label: 'Open', value: stats.open },
                  {
                    icon: MessageSquare,
                    label: 'Needs reply',
                    value: stats.needsReply,
                    tone: stats.needsReply > 0 ? 'warning' : undefined,
                  },
                  {
                    icon: AlertTriangle,
                    label: 'Urgent',
                    value: stats.urgent,
                    tone: stats.urgent > 0 ? 'danger' : undefined,
                  },
                  {
                    icon: CheckCircle2,
                    label: 'Closed',
                    value: stats.closed,
                    tone: stats.closed > 0 ? 'success' : undefined,
                  },
                ]}
              />
            ) : null}
          </div>

          {stats.needsReply > 0 && filter !== 'needs_reply' ? (
            <AdminCallout
              tone="warning"
              icon={MessageSquare}
              title={`${stats.needsReply} ticket${stats.needsReply === 1 ? '' : 's'} ${stats.needsReply === 1 ? 'needs' : 'need'} a staff reply`}
              description={
                needsReplyTickets[0]
                  ? `#${needsReplyTickets[0].number} · ${displayTicketUser(needsReplyTickets[0].user)} — ${needsReplyTickets[0].subject}`
                  : 'Customers are waiting on your team.'
              }
              action={
                <button
                  type="button"
                  className="ds-nd-list-alert-action"
                  onClick={() => setFilter('needs_reply')}
                >
                  Show needs reply
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              }
            />
          ) : null}

          {stats.urgent > 0 && filter !== 'urgent' ? (
            <AdminCallout
              tone="error"
              icon={AlertTriangle}
              title={`${stats.urgent} urgent open ticket${stats.urgent === 1 ? '' : 's'}`}
              description={
                urgentTickets[0]
                  ? `#${urgentTickets[0].number} — ${urgentTickets[0].subject}`
                  : 'Prioritize these first.'
              }
              action={
                <button
                  type="button"
                  className="ds-nd-list-alert-action"
                  onClick={() => setFilter('urgent')}
                >
                  Show urgent
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              }
            />
          ) : null}

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

          <AdminSection
            icon={Inbox}
            eyebrow="Queue"
            title="Ticket inbox"
            description="Filter and search the staff support queue"
          >
            <div className="tickets-inbox__toolbar">
              <div className="tickets-inbox__search">
                <Search className="tickets-inbox__search-icon" aria-hidden />
                <input
                  className="tickets-inbox__search-input"
                  placeholder="Search subject, #, user, email, or server…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search tickets"
                />
                {search ? (
                  <button
                    type="button"
                    className="tickets-inbox__search-clear"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <AdminFilterChips
              label="Filter tickets"
              value={filter}
              onChange={(id) => setFilter(id as FilterId)}
              options={filterOptions.map((opt) => ({
                id: opt.id,
                label: opt.label,
                count: opt.count,
                alert: opt.alert,
              }))}
            />

            {hasActiveFilters ? (
              <div className="ds-nd-list-meta">
                <span>
                  Showing <strong>{filtered.length}</strong>
                  {items.length ? ` of ${items.length}` : ''} tickets
                </span>
                <button type="button" className="ds-nd-list-clear" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}

            {loading ? (
              <PageLoading label="Loading tickets…" />
            ) : filtered.length === 0 ? (
              <div className="tickets-inbox__empty">
                <EmptyState
                  icon={<Inbox className="h-8 w-8" />}
                  title={items.length ? 'No tickets match' : 'No support tickets yet'}
                  description={
                    items.length
                      ? 'Try another filter or clear your search.'
                      : 'When customers open tickets, they will appear in this queue.'
                  }
                />
              </div>
            ) : (
              <ul className="tickets-inbox__list tickets-inbox__list--admin">
                {filtered.map((ticket) => {
                  const awaitingStaff = needsStaffReply(ticket);
                  const isUrgent = ticket.priority === 'urgent' && isOpenTicket(ticket);
                  return (
                    <li key={ticket.id}>
                      <Link
                        to={`/admin/tickets/${ticket.id}`}
                        className={`tickets-inbox__row tickets-inbox__row--admin${
                          awaitingStaff ? ' tickets-inbox__row--awaiting' : ''
                        }${isUrgent ? ' tickets-inbox__row--urgent' : ''}${
                          CLOSED_STATUSES.has(ticket.status) ? ' tickets-inbox__row--closed' : ''
                        }`}
                      >
                        <span className="tickets-inbox__row-rail" aria-hidden />
                        <span
                          className={`tickets-inbox__row-icon${
                            awaitingStaff
                              ? ' tickets-inbox__row-icon--awaiting'
                              : isUrgent
                                ? ' tickets-inbox__row-icon--urgent'
                                : ''
                          }`}
                          aria-hidden
                        >
                          {awaitingStaff ? (
                            <Headphones className="h-4 w-4" />
                          ) : isUrgent ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <LifeBuoy className="h-4 w-4" />
                          )}
                        </span>

                        <div className="tickets-inbox__row-main">
                          <div className="tickets-inbox__row-top">
                            <span className="tickets-inbox__row-id">#{ticket.number}</span>
                            {awaitingStaff ? <span className="tickets-inbox__ping">Needs reply</span> : null}
                            {isUrgent ? (
                              <span className="tickets-inbox__ping tickets-inbox__ping--urgent">Urgent</span>
                            ) : null}
                          </div>
                          <h2 className="tickets-inbox__row-title">{ticket.subject}</h2>

                          <div className="tickets-inbox__customer">
                            <UserAvatar user={ticket.user} size="sm" />
                            <span className="tickets-inbox__customer-name">{displayTicketUser(ticket.user)}</span>
                            <span className="tickets-inbox__customer-email">{ticket.user.email}</span>
                          </div>

                          <div className="tickets-inbox__row-meta">
                            <span>{ticketCategoryLabel(ticket.category)}</span>
                            {ticket.server ? (
                              <>
                                <span className="tickets-inbox__dot" aria-hidden>
                                  ·
                                </span>
                                <span className="tickets-inbox__server">
                                  <Server className="h-3 w-3" aria-hidden />
                                  {ticket.server.name}
                                </span>
                              </>
                            ) : null}
                            {ticket.assignee ? (
                              <>
                                <span className="tickets-inbox__dot" aria-hidden>
                                  ·
                                </span>
                                <span className="tickets-inbox__assignee">
                                  <User className="h-3 w-3" aria-hidden />
                                  {displayTicketUser(ticket.assignee)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="tickets-inbox__dot" aria-hidden>
                                  ·
                                </span>
                                <span className="tickets-inbox__unassigned">Unassigned</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="tickets-inbox__row-side">
                          <div className="tickets-inbox__row-badges">
                            <TicketStatusBadge status={ticket.status} />
                            <TicketPriorityBadge priority={ticket.priority} />
                          </div>
                          <time className="tickets-inbox__row-time" dateTime={ticket.updatedAt}>
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {formatTicketTime(ticket.updatedAt)}
                          </time>
                        </div>

                        <ChevronRight className="tickets-inbox__row-chevron h-4 w-4" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminSection>
        </AdminPageStack>
      </Page>
    </AdminLayout>
  );
}
