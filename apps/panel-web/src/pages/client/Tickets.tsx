import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Inbox,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Server,
  X,
} from 'lucide-react';
import { api, type ServerSummary, type TicketMetaResponse, type TicketPriority, type TicketSummary } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import { Button, ClientLayout, Input, Page, Select, Textarea } from '../../components/Layout';
import { ModalShell } from '../../components/ModalShell';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/tickets/TicketBadges';
import { TicketCreatePriorityPicker } from '../../components/tickets/TicketCreatePriorityPicker';
import { formatTicketTime, ticketCategoryLabel, TICKET_CATEGORIES } from '../../lib/ticket-utils';
import { normalizeAppearance } from '../../lib/branding-appearance';

type StatusFilter = 'all' | 'open' | 'awaiting' | 'closed';

const OPEN_STATUSES = new Set(['open', 'awaiting_reply', 'in_progress']);
const CLOSED_STATUSES = new Set(['resolved', 'closed']);

function isOpenTicket(ticket: TicketSummary) {
  return OPEN_STATUSES.has(ticket.status);
}

function needsUserReply(ticket: TicketSummary) {
  return isOpenTicket(ticket) && ticket.lastMessageStaff;
}

export function TicketsPage() {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.client.tickets({ status: 'all' });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (branding.ticketsEnabled === false) {
      setLoading(false);
      return;
    }
    void load();
  }, [branding.ticketsEnabled, load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter(isOpenTicket).length,
      awaiting: items.filter(needsUserReply).length,
      closed: items.filter((t) => CLOSED_STATUSES.has(t.status)).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((ticket) => {
      if (filter === 'open' && !isOpenTicket(ticket)) return false;
      if (filter === 'awaiting' && !needsUserReply(ticket)) return false;
      if (filter === 'closed' && !CLOSED_STATUSES.has(ticket.status)) return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        String(ticket.number).includes(q) ||
        ticketCategoryLabel(ticket.category).toLowerCase().includes(q) ||
        ticket.server?.name.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const awaitingTickets = useMemo(() => items.filter(needsUserReply), [items]);

  const filterOptions: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'awaiting', label: 'Your reply', count: stats.awaiting },
    { id: 'closed', label: 'Closed', count: stats.closed },
  ];

  if (branding.ticketsEnabled === false) {
    return (
      <ClientLayout>
        <Page>
          <section className="tickets-page tickets-page--client">
            <header className="tickets-inbox__hero">
              {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
              <div className="tickets-inbox__hero-inner">
                <div className="tickets-inbox__hero-copy">
                  <span className="tickets-inbox__hero-icon" aria-hidden>
                    <LifeBuoy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="tickets-inbox__eyebrow">Help desk</p>
                    <h1 className="tickets-inbox__title">Support</h1>
                    <p className="tickets-inbox__desc">Get help with your servers and account.</p>
                  </div>
                </div>
              </div>
            </header>
            <EmptyState
              icon={<LifeBuoy className="h-8 w-8" />}
              title="Support tickets are disabled"
              description="Contact your host directly if you need assistance."
            />
          </section>
        </Page>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Page>
        <section className="tickets-page tickets-page--client">
          <header className="tickets-inbox__hero">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
            <div className="tickets-inbox__hero-inner">
              <div className="tickets-inbox__hero-top">
                <div className="tickets-inbox__hero-copy">
                  <span className="tickets-inbox__hero-icon" aria-hidden>
                    <LifeBuoy className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="tickets-inbox__eyebrow">Help desk</p>
                    <h1 className="tickets-inbox__title">Support</h1>
                    <p className="tickets-inbox__desc">
                      Message our team about billing, account, or server issues. Replies land in your ticket thread.
                    </p>
                  </div>
                </div>

                <div className="tickets-inbox__hero-actions">
                  <Button variant="secondary" onClick={() => void load()} disabled={loading} aria-label="Refresh tickets">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Button onClick={() => setShowCreate(true)}>
                    <MessageSquarePlus className="h-4 w-4" />
                    New ticket
                  </Button>
                </div>
              </div>

              <div className="tickets-inbox__stats" role="list" aria-label="Ticket summary">
                <div className="tickets-inbox__stat" role="listitem">
                  <span className="tickets-inbox__stat-value">{stats.open}</span>
                  <span className="tickets-inbox__stat-label">Open</span>
                </div>
                <button
                  type="button"
                  role="listitem"
                  className={`tickets-inbox__stat tickets-inbox__stat--action${stats.awaiting ? ' tickets-inbox__stat--warning' : ''}${filter === 'awaiting' ? ' is-active' : ''}`}
                  onClick={() => setFilter(filter === 'awaiting' ? 'all' : 'awaiting')}
                >
                  <span className="tickets-inbox__stat-value">{stats.awaiting}</span>
                  <span className="tickets-inbox__stat-label">Awaiting you</span>
                </button>
                <div className="tickets-inbox__stat" role="listitem">
                  <span className="tickets-inbox__stat-value">{stats.closed}</span>
                  <span className="tickets-inbox__stat-label">Closed</span>
                </div>
                <div className="tickets-inbox__stat" role="listitem">
                  <span className="tickets-inbox__stat-value">{stats.total}</span>
                  <span className="tickets-inbox__stat-label">Total</span>
                </div>
              </div>
            </div>
          </header>

          {stats.awaiting > 0 && filter !== 'awaiting' ? (
            <button
              type="button"
              className="tickets-inbox__callout"
              onClick={() => setFilter('awaiting')}
            >
              <span className="tickets-inbox__callout-icon" aria-hidden>
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="tickets-inbox__callout-body">
                <strong>
                  {stats.awaiting} ticket{stats.awaiting === 1 ? '' : 's'}{' '}
                  {stats.awaiting === 1 ? 'needs' : 'need'} your reply
                </strong>
                <span>
                  {awaitingTickets[0]
                    ? `Latest: #${awaitingTickets[0].number} — ${awaitingTickets[0].subject}`
                    : 'Staff replied and is waiting on you.'}
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
                  placeholder="Search subject, #, category, server…"
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
                    className={`tickets-inbox__filter${filter === option.id ? ' is-active' : ''}${option.id === 'awaiting' && option.count > 0 ? ' tickets-inbox__filter--pulse' : ''}`}
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
                  title={items.length ? 'No tickets match' : 'No tickets yet'}
                  description={
                    items.length
                      ? 'Try another filter or clear your search.'
                      : 'Open a ticket and our team will reply in the conversation thread.'
                  }
                  action={
                    !items.length ? (
                      <Button onClick={() => setShowCreate(true)}>
                        <MessageSquarePlus className="h-4 w-4" />
                        New ticket
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ul className="tickets-inbox__list">
                {filtered.map((ticket) => {
                  const awaiting = needsUserReply(ticket);
                  return (
                    <li key={ticket.id}>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className={`tickets-inbox__row${awaiting ? ' tickets-inbox__row--awaiting' : ''}${CLOSED_STATUSES.has(ticket.status) ? ' tickets-inbox__row--closed' : ''}`}
                      >
                        <span className="tickets-inbox__row-rail" aria-hidden />
                        <span className={`tickets-inbox__row-icon${awaiting ? ' tickets-inbox__row-icon--awaiting' : ''}`} aria-hidden>
                          {awaiting ? <MessageSquare className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
                        </span>

                        <div className="tickets-inbox__row-main">
                          <div className="tickets-inbox__row-top">
                            <span className="tickets-inbox__row-id">#{ticket.number}</span>
                            {awaiting ? <span className="tickets-inbox__ping">Your reply</span> : null}
                          </div>
                          <h2 className="tickets-inbox__row-title">{ticket.subject}</h2>
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

      {showCreate ? (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={() => void load()} />
      ) : null}
    </ClientLayout>
  );
}

function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [meta, setMeta] = useState<TicketMetaResponse | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0].id);
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [serverId, setServerId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api.client.ticketMeta().then(setMeta).catch(() => setMeta(null));
    void api.client.servers().then(setServers).catch(() => setServers([]));
  }, []);

  const showServerField = meta?.allowServerTickets !== false;
  const requireServer = Boolean(meta?.requireServer);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.client.createTicket({
        subject,
        category,
        message,
        priority,
        serverId: serverId || null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    subject.trim().length >= 3 && message.trim().length > 0 && (!requireServer || Boolean(serverId));

  return (
    <ModalShell
      wide
      onClose={onClose}
      header={
        <div className="resource-modal-header">
          <span className="resource-modal-icon resource-modal-icon--accent">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <div>
            <h2 className="resource-modal-title">New support ticket</h2>
            <p className="resource-modal-subtitle">Tell us what’s going on — we’ll reply in this thread.</p>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="resource-modal-body ticket-create">
        <section className="ticket-create__section">
          <h3 className="ticket-create__section-title">What’s the issue?</h3>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Short summary (e.g. Can’t start Minecraft server)"
            required
          />
          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={10000}
            rows={6}
            placeholder="What happened, when it started, and anything you’ve already tried…"
            required
          />
        </section>

        <section className="ticket-create__section">
          <h3 className="ticket-create__section-title">Details</h3>
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>

          <TicketCreatePriorityPicker value={priority} onChange={setPriority} disabled={saving} />

          {showServerField ? (
            <Select
              label={requireServer ? 'Related server' : 'Related server (optional)'}
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              required={requireServer}
              hint={requireServer ? 'Select the server this ticket is about.' : 'Helps staff jump straight to the right machine.'}
            >
              {!requireServer ? <option value="">No specific server</option> : null}
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : null}
        </section>

        {error ? <div className="resource-modal-error">{error}</div> : null}

        <div className="resource-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !canSubmit}>
            {saving ? 'Creating…' : 'Create ticket'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
