import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  Layers,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Server,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, type ServerSummary, type TicketMetaResponse, type TicketPriority, type TicketSummary, type User } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { Button, ClientLayout, Input, Page, Select, Textarea } from '../../components/Layout';
import { ModalShell } from '../../components/ModalShell';
import { AlertBanner, EmptyState, Spinner } from '../../components/ui';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/tickets/TicketBadges';
import { TicketCreatePriorityPicker } from '../../components/tickets/TicketCreatePriorityPicker';
import { formatTicketTime, ticketCategoryLabel, TICKET_CATEGORIES } from '../../lib/ticket-utils';
import { normalizeAppearance } from '../../lib/branding-appearance';

type StatusFilter = 'all' | 'open' | 'awaiting' | 'closed';

const OPEN_STATUSES = new Set(['open', 'awaiting_reply', 'in_progress']);
const CLOSED_STATUSES = new Set(['resolved', 'closed']);

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function displayName(user: User): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.username;
}

function isOpenTicket(ticket: TicketSummary) {
  return OPEN_STATUSES.has(ticket.status);
}

function needsUserReply(ticket: TicketSummary) {
  return isOpenTicket(ticket) && ticket.lastMessageStaff;
}

export function TicketsPage() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const logoSrc = sanitizeImageSrc(branding.logoUrl);
  const [items, setItems] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadInFlightRef = useRef(false);
  const loadedRef = useRef(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const soft = opts?.soft || loadedRef.current;
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await api.client.tickets({ status: 'all' });
      setItems(result.items);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (branding.ticketsEnabled === false) {
      setLoading(false);
      return;
    }
    void load();
  }, [branding.ticketsEnabled, load]);

  useEffect(() => {
    if (branding.ticketsEnabled === false) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load({ soft: true });
    };
    const id = window.setInterval(tick, 45_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void load({ soft: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
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

  const filterLabels: Record<StatusFilter, string> = {
    all: 'All',
    open: 'Open',
    awaiting: 'Awaiting you',
    closed: 'Closed',
  };

  const summaryText =
    branding.ticketsEnabled === false
      ? 'Get help with your servers and account.'
      : loading && !loadedRef.current
        ? 'Loading your tickets…'
        : stats.total === 0
          ? 'Nothing open — start a conversation when you need a hand.'
          : [
              `${stats.open} open`,
              stats.awaiting > 0 ? `${stats.awaiting} awaiting you` : null,
              `${stats.closed} closed`,
            ]
              .filter(Boolean)
              .join(' · ');

  function toggleFilter(next: StatusFilter) {
    setFilter((prev) => (prev === next ? 'all' : next));
  }

  const supportHero = (
    <header className="ds-servers-fleet">
      {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

      <div className="ds-servers-fleet-top">
        <div className="ds-servers-fleet-identity">
          {logoSrc ? (
            <div className="ds-servers-fleet-mark">
              <img src={logoSrc} alt="" />
            </div>
          ) : (
            <div className="ds-servers-fleet-mark ds-servers-fleet-mark-fallback" style={panelNameGradientStyle()}>
              {panelNameInitial(branding.panelName)}
            </div>
          )}
          <div className="ds-servers-fleet-copy">
            <p className="ds-servers-fleet-greeting">
              {getGreeting()}
              {user ? `, ${displayName(user)}` : ''}
            </p>
            <h1 className="ds-servers-fleet-title">Support</h1>
            <div className="ds-servers-fleet-brand">
              <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
              <span className="ds-servers-fleet-tagline">Inbox</span>
            </div>
            <p className="ds-servers-fleet-summary">{summaryText}</p>
          </div>
        </div>

        {branding.ticketsEnabled !== false ? (
          <div className="ds-servers-fleet-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load({ soft: true })}
              disabled={refreshing || (loading && !loadedRef.current)}
              aria-label="Refresh tickets"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button type="button" onClick={() => setShowCreate(true)}>
              <MessageSquarePlus className="h-4 w-4" />
              New ticket
            </Button>
          </div>
        ) : null}
      </div>

      {branding.ticketsEnabled !== false && (!loading || items.length > 0) ? (
        <div className="ds-servers-fleet-stats ds-servers-fleet-stats--4" role="list" aria-label="Ticket summary">
          <TicketFleetStat
            icon={Inbox}
            label="Open"
            value={stats.open}
            tone={stats.open > 0 ? 'info' : undefined}
            active={filter === 'open'}
            onClick={() => toggleFilter('open')}
          />
          <TicketFleetStat
            icon={MessageSquare}
            label="Awaiting you"
            value={stats.awaiting}
            tone={stats.awaiting > 0 ? 'warn' : undefined}
            active={filter === 'awaiting'}
            onClick={() => toggleFilter('awaiting')}
          />
          <TicketFleetStat
            icon={CheckCircle2}
            label="Closed"
            value={stats.closed}
            tone={stats.closed > 0 ? 'success' : undefined}
            active={filter === 'closed'}
            onClick={() => toggleFilter('closed')}
          />
          <TicketFleetStat
            icon={Layers}
            label="Total"
            value={stats.total}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
        </div>
      ) : null}
    </header>
  );

  if (branding.ticketsEnabled === false) {
    return (
      <ClientLayout>
        <Page>
          <section className="tickets-page tickets-page--client">
            {supportHero}
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
          {supportHero}

          {stats.awaiting > 0 && filter !== 'awaiting' ? (
            <button
              type="button"
              className="ds-servers-callout ds-servers-callout--warn"
              onClick={() => setFilter('awaiting')}
            >
              <span className="ds-servers-callout-icon" aria-hidden>
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="ds-servers-callout-body">
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
              <ChevronRight className="ds-servers-callout-chevron h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {error ? (
            <AlertBanner tone="error" className="flex-wrap justify-between">
              <p>{error}</p>
              <Button type="button" variant="secondary" onClick={() => void load({ soft: true })}>
                Retry
              </Button>
            </AlertBanner>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="tickets-inbox__loading" role="status" aria-live="polite">
              <Spinner className="h-7 w-7" />
              <span className="sr-only">Loading tickets</span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No tickets yet"
              description="Open a ticket and our team will reply in the conversation thread."
              action={
                <Button type="button" onClick={() => setShowCreate(true)}>
                  <MessageSquarePlus className="h-4 w-4" />
                  New ticket
                </Button>
              }
            />
          ) : (
            <div className="tickets-inbox__panel">
              <div className="tickets-inbox__panel-tools">
                <p className="tickets-inbox__meta-text">
                  Showing <strong>{filtered.length}</strong>
                  {filtered.length !== items.length ? ` of ${items.length}` : ''}
                  {filter !== 'all' ? ` · ${filterLabels[filter]}` : ''}
                </p>

                <div className="tickets-inbox__search">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets…"
                    className="ds-field ds-field--icon-left ds-field--icon-right"
                    aria-label="Search tickets"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="tickets-inbox__search-clear"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="tickets-inbox__empty">
                  <EmptyState
                    icon={<Inbox className="h-8 w-8" />}
                    title="No matching tickets"
                    description="Try another filter or clear your search."
                    action={
                      search || filter !== 'all' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setSearch('');
                            setFilter('all');
                          }}
                        >
                          Reset filters
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
                          <span
                            className={`tickets-inbox__row-icon${awaiting ? ' tickets-inbox__row-icon--awaiting' : ''}`}
                            aria-hidden
                          >
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
          )}
        </section>
      </Page>

      {showCreate ? (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={() => void load({ soft: true })} />
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

function TicketFleetStat({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'warn' | 'danger';
  active?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'success'
      ? 'ds-servers-stat--success'
      : tone === 'info'
        ? 'ds-servers-stat--info'
        : tone === 'warn'
          ? 'ds-servers-stat--warn'
          : tone === 'danger'
            ? 'ds-servers-stat--danger'
            : '';

  return (
    <button
      type="button"
      role="listitem"
      className={`ds-servers-stat ${toneClass}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="ds-servers-stat-top">
        <span className="ds-servers-stat-icon" aria-hidden>
          <Icon className="h-3 w-3" />
        </span>
        <span className="ds-servers-stat-label">{label}</span>
      </span>
      <span className="ds-servers-stat-value">{value}</span>
    </button>
  );
}
