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
  User,
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
      if (filter === 'urgent' && ticket.priority !== 'urgent') return false;
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
        <section className="tickets-page__hero">
          {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
          <div className="tickets-page__hero-body">
            <div className="tickets-page__hero-top">
              <div className="tickets-page__hero-copy">
                <div className="tickets-page__hero-icon">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="tickets-page__hero-title">Support tickets</h1>
                  <p className="tickets-page__hero-desc">
                    Review user requests, reply in ticket threads, and manage priority and status.
                  </p>
                </div>
              </div>

              <div className="tickets-page__hero-actions">
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="tickets-page__stats">
              <div className="tickets-page__stat">
                <span className="tickets-page__stat-value">{stats.total}</span>
                <span className="tickets-page__stat-label">Total</span>
              </div>
              <div className="tickets-page__stat tickets-page__stat--accent">
                <span className="tickets-page__stat-value">{stats.open}</span>
                <span className="tickets-page__stat-label">Open</span>
              </div>
              <div className="tickets-page__stat tickets-page__stat--warning">
                <span className="tickets-page__stat-value">{stats.needsReply}</span>
                <span className="tickets-page__stat-label">Needs reply</span>
              </div>
              <div className="tickets-page__stat tickets-page__stat--danger">
                <span className="tickets-page__stat-value">{stats.urgent}</span>
                <span className="tickets-page__stat-label">Urgent open</span>
              </div>
            </div>
          </div>
        </section>

        {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

        <div className="tickets-page__toolbar">
          <div className="tickets-page__search">
            <Search className="tickets-page__search-icon" />
            <input
              className="tickets-page__search-input"
              placeholder="Search by subject, #, user, email, or server…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tickets-page__filters">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`tickets-page__filter${filter === option.id ? ' tickets-page__filter--active' : ''}`}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
                <span className="tickets-page__filter-count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoading label="Loading tickets…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title={items.length ? 'No tickets match your filters' : 'No support tickets yet'}
            description={
              items.length
                ? 'Try a different search or filter.'
                : 'Tickets opened by users will appear here.'
            }
          />
        ) : (
          <div className="tickets-page__list">
            {filtered.map((ticket) => {
              const awaitingStaff = needsStaffReply(ticket);
              const isUrgent = ticket.priority === 'urgent' && isOpenTicket(ticket);
              const cardClass = [
                'tickets-page__card',
                awaitingStaff ? 'tickets-page__card--needs-reply' : '',
                isUrgent ? 'tickets-page__card--urgent' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <Link key={ticket.id} to={`/admin/tickets/${ticket.id}`} className={cardClass}>
                  <div className="tickets-page__card-icon" aria-hidden>
                    {awaitingStaff ? (
                      <Headphones className="h-4 w-4" />
                    ) : isUrgent ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>

                  <div className="tickets-page__card-main">
                    <div className="tickets-page__card-top">
                      <span className="tickets-page__card-id">Ticket #{ticket.number}</span>
                    </div>
                    <h2 className="tickets-page__card-title">{ticket.subject}</h2>

                    <div className="tickets-page__card-user">
                      <UserAvatar user={ticket.user} size="sm" />
                      <span className="tickets-page__card-user-name">{displayTicketUser(ticket.user)}</span>
                      <span className="tickets-page__card-dot">·</span>
                      <span className="tickets-page__card-user-email">{ticket.user.email}</span>
                    </div>

                    <div className="tickets-page__card-meta">
                      <span>{ticketCategoryLabel(ticket.category)}</span>
                      {ticket.server ? (
                        <>
                          <span className="tickets-page__card-dot">·</span>
                          <span>{ticket.server.name}</span>
                        </>
                      ) : null}
                      {ticket.assignee ? (
                        <>
                          <span className="tickets-page__card-dot">·</span>
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {displayTicketUser(ticket.assignee)}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div className="tickets-page__card-foot">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {formatTicketTime(ticket.updatedAt)}</span>
                      {awaitingStaff ? (
                        <span className="tickets-page__card-ping">Awaiting staff reply</span>
                      ) : null}
                      {isUrgent ? <span className="tickets-page__card-ping tickets-page__card-ping--urgent">Urgent</span> : null}
                    </div>
                  </div>

                  <div className="tickets-page__card-side">
                    <div className="tickets-page__card-badges">
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} />
                    </div>
                    <ChevronRight className="tickets-page__card-chevron h-4 w-4" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Page>
    </AdminLayout>
  );
}
