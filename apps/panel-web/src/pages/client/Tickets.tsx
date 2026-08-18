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
} from 'lucide-react';
import { api, type ServerSummary, type TicketMetaResponse, type TicketPriority, type TicketSummary } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import { Button, ClientLayout, Input, Page, Select, Textarea } from '../../components/Layout';
import { ModalShell } from '../../components/ModalShell';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/tickets/TicketBadges';
import { TicketCreatePriorityPicker } from '../../components/tickets/TicketCreatePriorityPicker';
import { formatTicketTime, ticketCategoryLabel } from '../../lib/ticket-utils';
import { TICKET_CATEGORIES } from '../../lib/ticket-utils';
import { normalizeAppearance } from '../../lib/branding-appearance';

type StatusFilter = 'all' | 'open' | 'closed';

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

  const filterOptions: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'closed', label: 'Closed', count: stats.closed },
  ];

  if (branding.ticketsEnabled === false) {
    return (
      <ClientLayout>
        <Page>
          <section className="tickets-page__hero">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
            <div className="tickets-page__hero-body">
              <div className="tickets-page__hero-copy">
                <div className="tickets-page__hero-icon">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="tickets-page__hero-title">Support</h1>
                  <p className="tickets-page__hero-desc">Get help with your servers and account.</p>
                </div>
              </div>
            </div>
          </section>
          <EmptyState
            icon={<LifeBuoy className="h-8 w-8" />}
            title="Support tickets are disabled"
            description="Contact your host directly if you need assistance."
          />
        </Page>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
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
                  <h1 className="tickets-page__hero-title">Support</h1>
                  <p className="tickets-page__hero-desc">
                    Open a ticket for billing, account, or server help. Our team will reply in your ticket thread.
                  </p>
                </div>
              </div>

              <div className="tickets-page__hero-actions">
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => setShowCreate(true)}>
                  <MessageSquarePlus className="h-4 w-4" />
                  New ticket
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
                <span className="tickets-page__stat-value">{stats.awaiting}</span>
                <span className="tickets-page__stat-label">Awaiting you</span>
              </div>
              <div className="tickets-page__stat">
                <span className="tickets-page__stat-value">{stats.closed}</span>
                <span className="tickets-page__stat-label">Closed</span>
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
              placeholder="Search by subject, number, category, or server…"
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
                : 'Create a ticket and our team will get back to you in the conversation thread.'
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
        ) : (
          <div className="tickets-page__list">
            {filtered.map((ticket) => {
              const awaiting = needsUserReply(ticket);
              return (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className={`tickets-page__card${awaiting ? ' tickets-page__card--needs-reply' : ''}`}
                >
                  <div className="tickets-page__card-icon" aria-hidden>
                    {awaiting ? <MessageSquare className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
                  </div>

                  <div className="tickets-page__card-main">
                    <div className="tickets-page__card-top">
                      <span className="tickets-page__card-id">Ticket #{ticket.number}</span>
                    </div>
                    <h2 className="tickets-page__card-title">{ticket.subject}</h2>
                    <div className="tickets-page__card-meta">
                      <span>{ticketCategoryLabel(ticket.category)}</span>
                      {ticket.server ? (
                        <>
                          <span className="tickets-page__card-dot">·</span>
                          <span>{ticket.server.name}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="tickets-page__card-foot">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {formatTicketTime(ticket.updatedAt)}</span>
                      {awaiting ? (
                        <span className="tickets-page__card-ping">Awaiting your reply</span>
                      ) : null}
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
            <p className="resource-modal-subtitle">
              Describe your issue and our team will follow up in this thread.
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="resource-modal-body">
        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="Brief summary of your issue"
          required
        />

        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {TICKET_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>

        <TicketCreatePriorityPicker
          value={priority}
          onChange={setPriority}
          disabled={saving}
        />

        {showServerField ? (
          <Select
            label={requireServer ? 'Related server' : 'Related server (optional)'}
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            required={requireServer}
            hint={requireServer ? 'Select the server this ticket is about.' : undefined}
          >
            {!requireServer ? <option value="">No specific server</option> : null}
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}

        <Textarea
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={10000}
          rows={6}
          placeholder="Describe the issue and any steps to reproduce it"
          required
        />

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
