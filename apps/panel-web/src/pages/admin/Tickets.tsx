import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
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
import { AdminLayout, Button, Page } from '../../components/Layout';
import { UserAvatar } from '../../components/UserAvatar';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/tickets/TicketBadges';
import { displayTicketUser, formatTicketTime, ticketCategoryLabel } from '../../lib/ticket-utils';
import { normalizeAppearance } from '../../lib/branding-appearance';

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
  const appearance = normalizeAppearance(branding);
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
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
  }, []);

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

  const filterOptions: Array<{ id: FilterId; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'needs_reply', label: 'Needs reply', count: stats.needsReply },
    { id: 'urgent', label: 'Urgent', count: stats.urgent },
    { id: 'closed', label: 'Closed', count: stats.closed },
  ];

  return (
    <AdminLayout>
      <Page>
        <section className="tickets-page tickets-page--admin">
          <header className="tickets-inbox__hero tickets-inbox__hero--admin">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
            <div className="tickets-inbox__hero-inner">
              <div className="tickets-inbox__hero-top">
                <div className="tickets-inbox__hero-copy">
                  <span className="tickets-inbox__hero-icon tickets-inbox__hero-icon--admin" aria-hidden>
                    <Headphones className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="tickets-inbox__eyebrow">Staff queue</p>
                    <h1 className="tickets-inbox__title">Support tickets</h1>
                    <p className="tickets-inbox__desc">
                      Triage customer requests, reply in threads, and keep priority and status current.
                    </p>
                  </div>
                </div>

                <div className="tickets-inbox__hero-actions">
                  <Button variant="secondary" onClick={() => void load()} disabled={loading} aria-label="Refresh tickets">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>

              <div className="tickets-inbox__stats" role="list" aria-label="Ticket summary">
                <button
                  type="button"
                  role="listitem"
                  className={`tickets-inbox__stat tickets-inbox__stat--action${filter === 'open' ? ' is-active' : ''}`}
                  onClick={() => setFilter(filter === 'open' ? 'all' : 'open')}
                >
                  <span className="tickets-inbox__stat-value">{stats.open}</span>
                  <span className="tickets-inbox__stat-label">Open</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`tickets-inbox__stat tickets-inbox__stat--action${stats.needsReply ? ' tickets-inbox__stat--warning' : ''}${filter === 'needs_reply' ? ' is-active' : ''}`}
                  onClick={() => setFilter(filter === 'needs_reply' ? 'all' : 'needs_reply')}
                >
                  <span className="tickets-inbox__stat-value">{stats.needsReply}</span>
                  <span className="tickets-inbox__stat-label">Needs reply</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`tickets-inbox__stat tickets-inbox__stat--action${stats.urgent ? ' tickets-inbox__stat--danger' : ''}${filter === 'urgent' ? ' is-active' : ''}`}
                  onClick={() => setFilter(filter === 'urgent' ? 'all' : 'urgent')}
                >
                  <span className="tickets-inbox__stat-value">{stats.urgent}</span>
                  <span className="tickets-inbox__stat-label">Urgent</span>
                </button>
                <div className="tickets-inbox__stat" role="listitem">
                  <span className="tickets-inbox__stat-value">{stats.closed}</span>
                  <span className="tickets-inbox__stat-label">Closed</span>
                </div>
              </div>
            </div>
          </header>

          {stats.needsReply > 0 && filter !== 'needs_reply' ? (
            <button
              type="button"
              className="tickets-inbox__callout"
              onClick={() => setFilter('needs_reply')}
            >
              <span className="tickets-inbox__callout-icon" aria-hidden>
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="tickets-inbox__callout-body">
                <strong>
                  {stats.needsReply} ticket{stats.needsReply === 1 ? '' : 's'}{' '}
                  {stats.needsReply === 1 ? 'needs' : 'need'} a staff reply
                </strong>
                <span>
                  {needsReplyTickets[0]
                    ? `#${needsReplyTickets[0].number} · ${displayTicketUser(needsReplyTickets[0].user)} — ${needsReplyTickets[0].subject}`
                    : 'Customers are waiting on your team.'}
                </span>
              </span>
              <ChevronRight className="tickets-inbox__callout-chevron h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {stats.urgent > 0 && filter !== 'urgent' ? (
            <button
              type="button"
              className="tickets-inbox__callout tickets-inbox__callout--danger"
              onClick={() => setFilter('urgent')}
            >
              <span className="tickets-inbox__callout-icon tickets-inbox__callout-icon--danger" aria-hidden>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="tickets-inbox__callout-body">
                <strong>
                  {stats.urgent} urgent open ticket{stats.urgent === 1 ? '' : 's'}
                </strong>
                <span>
                  {urgentTickets[0]
                    ? `#${urgentTickets[0].number} — ${urgentTickets[0].subject}`
                    : 'Prioritize these first.'}
                </span>
              </span>
              <ChevronRight className="tickets-inbox__callout-chevron h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

          <div className="tickets-inbox__panel">
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

              <div className="tickets-inbox__filters" role="tablist" aria-label="Filter tickets">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === option.id}
                    className={`tickets-inbox__filter${filter === option.id ? ' is-active' : ''}${
                      option.id === 'needs_reply' && option.count > 0 ? ' tickets-inbox__filter--pulse' : ''
                    }${option.id === 'urgent' && option.count > 0 ? ' tickets-inbox__filter--urgent' : ''}`}
                    onClick={() => setFilter(option.id)}
                  >
                    {option.label}
                    <span className="tickets-inbox__filter-count">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>

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
          </div>
        </section>
      </Page>
    </AdminLayout>
  );
}
