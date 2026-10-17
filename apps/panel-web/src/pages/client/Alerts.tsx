import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Cpu,
  HardDrive,
  Inbox,
  KeyRound,
  LifeBuoy,
  LogIn,
  RefreshCw,
  Search,
  Server,
  Shield,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, type AlertEventSummary, type AlertMetric } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { normalizeAppearance } from '../../lib/branding-appearance';
import { isStaffOrPanelAdmin } from '../../lib/roles';
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { ClientLayout, Button, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, DsIcon, EmptyState, Spinner } from '../../components/ui';

type InboxFilter = 'all' | 'unread' | 'critical' | 'servers' | 'security' | 'tickets' | 'nodes';

const SECURITY_METRICS = new Set<AlertMetric>([
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
]);

const SERVER_METRICS = new Set<AlertMetric>([
  'cpu',
  'memory',
  'disk',
  'server_crashed',
  'server_offline',
  'install_failed',
]);

const TICKET_METRICS = new Set<AlertMetric>(['ticket_opened', 'ticket_user_reply']);

function notifyAlertsChanged() {
  window.dispatchEvent(new Event('spirit-alerts-changed'));
}

function metricIcon(metric: AlertMetric): LucideIcon {
  switch (metric) {
    case 'cpu':
      return Cpu;
    case 'memory':
    case 'disk':
      return HardDrive;
    case 'server_crashed':
    case 'server_offline':
    case 'install_failed':
      return Server;
    case 'account_login_failed':
    case 'account_login':
      return LogIn;
    case 'account_password_changed':
    case 'account_2fa_changed':
      return Shield;
    case 'account_api_key':
      return KeyRound;
    case 'server_subuser':
      return UserPlus;
    case 'node_offline':
      return Activity;
    case 'ticket_opened':
    case 'ticket_user_reply':
      return LifeBuoy;
    default:
      return Bell;
  }
}

function metricKind(metric: AlertMetric): 'servers' | 'security' | 'tickets' | 'nodes' {
  if (SECURITY_METRICS.has(metric)) return 'security';
  if (TICKET_METRICS.has(metric)) return 'tickets';
  if (metric === 'node_offline') return 'nodes';
  return 'servers';
}

function kindLabel(kind: 'servers' | 'security' | 'tickets' | 'nodes') {
  if (kind === 'security') return 'Security';
  if (kind === 'tickets') return 'Ticket';
  if (kind === 'nodes') return 'Node';
  return 'Server';
}

function formatRelative(iso: string) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Just now';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
    if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatExact(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function groupLabel(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - then.getTime()) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

function eventAction(
  event: AlertEventSummary,
  opts?: { staff?: boolean },
): { to: string; label: string } | null {
  if (TICKET_METRICS.has(event.metric) && event.ticketId && opts?.staff) {
    return { to: `/admin/tickets/${event.ticketId}`, label: 'Open ticket' };
  }
  if (TICKET_METRICS.has(event.metric) && opts?.staff) {
    return { to: '/admin/tickets', label: 'View tickets' };
  }
  if (SECURITY_METRICS.has(event.metric) && event.metric !== 'server_subuser') {
    return { to: '/profile?tab=security', label: 'Open security' };
  }
  if (event.server) {
    return { to: `/servers/${event.server.id}/console`, label: 'Open console' };
  }
  if (event.metric === 'node_offline') {
    return { to: '/admin/nodes', label: 'View nodes' };
  }
  return null;
}

function severityLabel(severity: string) {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  return 'Info';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function displayName(user: { firstName?: string | null; username: string }) {
  const first = user.firstName?.trim();
  return first || user.username;
}

export function AlertsPage() {
  const { user } = useAuth();
  const staff = isStaffOrPanelAdmin(user);
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const logoSrc = sanitizeImageSrc(branding.logoUrl);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<AlertEventSummary[]>([]);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
      const ev = await api.client.alertEvents();
      setEvents(ev.events);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load({ soft: true });
    };
    const id = window.setInterval(tick, 30_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void load({ soft: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const unread = useMemo(() => events.filter((e) => !e.readAt).length, [events]);
  const criticalCount = useMemo(() => events.filter((e) => e.severity === 'critical').length, [events]);
  const criticalUnread = useMemo(
    () => events.filter((e) => !e.readAt && e.severity === 'critical').length,
    [events],
  );
  const serverCount = useMemo(() => events.filter((e) => SERVER_METRICS.has(e.metric)).length, [events]);
  const securityCount = useMemo(() => events.filter((e) => SECURITY_METRICS.has(e.metric)).length, [events]);
  const ticketCount = useMemo(() => events.filter((e) => TICKET_METRICS.has(e.metric)).length, [events]);
  const nodeCount = useMemo(() => events.filter((e) => e.metric === 'node_offline').length, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (inboxFilter === 'unread' && event.readAt) return false;
      if (inboxFilter === 'critical' && event.severity !== 'critical') return false;
      if (inboxFilter === 'servers' && !SERVER_METRICS.has(event.metric)) return false;
      if (inboxFilter === 'security' && !SECURITY_METRICS.has(event.metric)) return false;
      if (inboxFilter === 'tickets' && !TICKET_METRICS.has(event.metric)) return false;
      if (inboxFilter === 'nodes' && event.metric !== 'node_offline') return false;
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        event.message.toLowerCase().includes(q) ||
        (event.server?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [events, inboxFilter, search]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, AlertEventSummary[]>();
    for (const event of filteredEvents) {
      const label = groupLabel(event.createdAt);
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(event);
    }
    return order.map((label) => ({ label, events: map.get(label)! }));
  }, [filteredEvents]);

  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      setSelectedId(null);
    }
  }, [events, selectedId]);

  async function markRead(id: string) {
    try {
      setBusyId(id);
      await api.client.markAlertRead(id);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, readAt: new Date().toISOString() } : e)));
      notifyAlertsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark alert read');
    } finally {
      setBusyId(null);
    }
  }

  async function markAll() {
    try {
      setBusyId('all-read');
      await api.client.markAllAlertsRead();
      setEvents((prev) => prev.map((e) => ({ ...e, readAt: e.readAt ?? new Date().toISOString() })));
      notifyAlertsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark alerts read');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOne(id: string) {
    try {
      setBusyId(id);
      await api.client.deleteAlert(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
      notifyAlertsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete alert');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAll() {
    try {
      setClearing(true);
      await api.client.deleteAllAlerts();
      setEvents([]);
      setSelectedId(null);
      setConfirmClear(false);
      notifyAlertsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear inbox');
    } finally {
      setClearing(false);
    }
  }

  function openAlert(event: AlertEventSummary) {
    if (selectedId === event.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(event.id);
    if (!event.readAt) void markRead(event.id);
  }

  function toggleFilter(next: InboxFilter) {
    setInboxFilter((prev) => (prev === next ? 'all' : next));
  }

  const filterLabels: Record<InboxFilter, string> = {
    all: 'All',
    unread: 'Unread',
    critical: 'Critical',
    servers: 'Servers',
    security: 'Security',
    tickets: 'Tickets',
    nodes: 'Nodes',
  };

  const summaryText =
    loading && !loadedRef.current
      ? 'Loading your inbox…'
      : events.length === 0
        ? 'Nothing waiting — new notices land here automatically.'
        : unread > 0
          ? `${unread} unread${criticalUnread ? ` · ${criticalUnread} critical` : ''}`
          : `You're caught up · ${events.length} in inbox`;

  const activeFilterLabel = filterLabels[inboxFilter];

  return (
    <ClientLayout>
      <Page>
        <section className="alerts-inbox" aria-label="Alerts">
          <header className="ds-servers-fleet">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

            <div className="ds-servers-fleet-top">
              <div className="ds-servers-fleet-identity">
                {logoSrc ? (
                  <div className="ds-servers-fleet-mark">
                    <img src={logoSrc} alt="" />
                  </div>
                ) : (
                  <div
                    className="ds-servers-fleet-mark ds-servers-fleet-mark-fallback"
                    style={panelNameGradientStyle()}
                  >
                    {panelNameInitial(branding.panelName)}
                  </div>
                )}
                <div className="ds-servers-fleet-copy">
                  <p className="ds-servers-fleet-greeting">
                    {greeting()}
                    {user ? `, ${displayName(user)}` : ''}
                  </p>
                  <h1 className="ds-servers-fleet-title">Alerts</h1>
                  <div className="ds-servers-fleet-brand">
                    <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
                    <span className="ds-servers-fleet-tagline">Inbox</span>
                  </div>
                  <p className="ds-servers-fleet-summary">{summaryText}</p>
                </div>
              </div>

              <div className="ds-servers-fleet-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void load({ soft: true })}
                  disabled={refreshing || (loading && !loadedRef.current)}
                  aria-label="Refresh inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {unread > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void markAll()}
                    disabled={busyId === 'all-read'}
                    aria-label="Mark all read"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Mark all</span>
                  </Button>
                ) : null}
                {events.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmClear(true)}
                    aria-label="Clear inbox"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                ) : null}
              </div>
            </div>

            {!loading || events.length > 0 ? (
              <div
                className={`ds-servers-fleet-stats${
                  ticketCount > 0 || nodeCount > 0
                    ? ` ds-servers-fleet-stats--${5 + (ticketCount > 0 ? 1 : 0) + (nodeCount > 0 ? 1 : 0)}`
                    : ''
                }`}
                role="list"
                aria-label="Inbox summary"
              >
                <AlertFleetStat
                  icon={Bell}
                  label="Unread"
                  value={unread}
                  tone={unread > 0 ? 'warn' : undefined}
                  active={inboxFilter === 'unread'}
                  onClick={() => toggleFilter('unread')}
                />
                <AlertFleetStat
                  icon={Activity}
                  label="Critical"
                  value={criticalCount}
                  tone={criticalUnread > 0 ? 'danger' : criticalCount > 0 ? 'warn' : undefined}
                  active={inboxFilter === 'critical'}
                  onClick={() => toggleFilter('critical')}
                />
                <AlertFleetStat
                  icon={Server}
                  label="Servers"
                  value={serverCount}
                  active={inboxFilter === 'servers'}
                  onClick={() => toggleFilter('servers')}
                />
                <AlertFleetStat
                  icon={Shield}
                  label="Security"
                  value={securityCount}
                  active={inboxFilter === 'security'}
                  onClick={() => toggleFilter('security')}
                />
                {ticketCount > 0 ? (
                  <AlertFleetStat
                    icon={LifeBuoy}
                    label="Tickets"
                    value={ticketCount}
                    active={inboxFilter === 'tickets'}
                    onClick={() => toggleFilter('tickets')}
                  />
                ) : null}
                {nodeCount > 0 ? (
                  <AlertFleetStat
                    icon={HardDrive}
                    label="Nodes"
                    value={nodeCount}
                    active={inboxFilter === 'nodes'}
                    onClick={() => toggleFilter('nodes')}
                  />
                ) : null}
                <AlertFleetStat
                  icon={Inbox}
                  label="Total"
                  value={events.length}
                  active={inboxFilter === 'all'}
                  onClick={() => setInboxFilter('all')}
                />
              </div>
            ) : null}
          </header>

          {criticalUnread > 0 ? (
            <button
              type="button"
              className="ds-servers-callout ds-servers-callout--warn"
              onClick={() => {
                setInboxFilter('critical');
                const first = events.find((e) => !e.readAt && e.severity === 'critical');
                if (first) openAlert(first);
              }}
            >
              <span className="ds-servers-callout-icon" aria-hidden>
                <Bell className="h-4 w-4" />
              </span>
              <span className="ds-servers-callout-body">
                <strong>
                  {criticalUnread} critical alert{criticalUnread === 1 ? '' : 's'} need attention
                </strong>
                <span>Open the latest one to check the console or security settings.</span>
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

          {loading && events.length === 0 ? (
            <div className="alerts-inbox__loading" role="status" aria-live="polite">
              <Spinner className="h-7 w-7" />
              <span className="sr-only">Loading alerts</span>
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={BellOff} className="ds-icon--md" />}
              title="Inbox is empty"
              description="We’ll notify you here if a server crashes, disk fills up, or something changes on your account."
            />
          ) : (
            <div className="alerts-inbox__panel">
              <div className="alerts-inbox__panel-tools">
                <p className="alerts-inbox__meta-text">
                  Showing <strong>{filteredEvents.length}</strong>
                  {filteredEvents.length !== events.length ? ` of ${events.length}` : ''}
                  {inboxFilter !== 'all' ? ` · ${activeFilterLabel}` : ''}
                </p>

                <div className="alerts-inbox__search">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search alerts…"
                    className="ds-field ds-field--icon-left ds-field--icon-right"
                    aria-label="Search alerts"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="alerts-inbox__search-clear"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="alerts-inbox__empty">
                  <EmptyState
                    icon={<Inbox className="h-8 w-8" />}
                    title="No matching alerts"
                    description="Try another filter or clear your search."
                    action={
                      search || inboxFilter !== 'all' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setSearch('');
                            setInboxFilter('all');
                          }}
                        >
                          Reset filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                groups.map((group) => (
                  <section key={group.label} className="alerts-inbox__group">
                    <h2 className="alerts-inbox__group-title">{group.label}</h2>
                    <ul className="alerts-inbox__list">
                      {group.events.map((event) => {
                        const Icon = metricIcon(event.metric);
                        const unreadItem = !event.readAt;
                        const kind = metricKind(event.metric);
                        const selected = selectedId === event.id;
                        return (
                          <li key={event.id} className={selected ? 'is-open' : undefined}>
                            <div
                              className={`alerts-inbox__row alerts-inbox__row--${event.severity || 'info'}${
                                unreadItem ? ' is-unread' : ''
                              }${selected ? ' is-selected' : ''}`}
                            >
                              <button
                                type="button"
                                className="alerts-inbox__row-open"
                                onClick={() => openAlert(event)}
                              >
                                <span className="alerts-inbox__row-rail" aria-hidden />
                                <span
                                  className={`alerts-inbox__row-icon alerts-inbox__row-icon--${event.severity || 'info'}`}
                                  aria-hidden
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="alerts-inbox__row-main">
                                  <div className="alerts-inbox__row-top">
                                    <span className="alerts-inbox__row-kind">{kindLabel(kind)}</span>
                                    <span
                                      className={`alerts-inbox__sev alerts-inbox__sev--${event.severity || 'info'}`}
                                    >
                                      {severityLabel(event.severity)}
                                    </span>
                                    {unreadItem ? <span className="alerts-inbox__ping">New</span> : null}
                                  </div>
                                  <h3 className="alerts-inbox__row-title">{event.title}</h3>
                                  <p className="alerts-inbox__row-preview">{event.message}</p>
                                  <div className="alerts-inbox__row-meta">
                                    {event.server ? (
                                      <span className="alerts-inbox__server">
                                        <Server className="h-3 w-3" aria-hidden />
                                        {event.server.name}
                                      </span>
                                    ) : null}
                                    {event.valuePct != null ? (
                                      <span>{event.valuePct.toFixed(0)}%</span>
                                    ) : null}
                                  </div>
                                </div>
                                <time className="alerts-inbox__row-time" dateTime={event.createdAt}>
                                  {formatRelative(event.createdAt)}
                                </time>
                                <ChevronRight className="alerts-inbox__row-chevron h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="alerts-inbox__row-delete"
                                aria-label="Delete alert"
                                disabled={busyId === event.id}
                                onClick={() => void deleteOne(event.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {selected ? (
                              <AlertLetter
                                event={event}
                                staff={staff}
                                busy={busyId === event.id}
                                onDelete={() => void deleteOne(event.id)}
                                onMarkRead={() => void markRead(event.id)}
                              />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          )}
        </section>
      </Page>

      <ConfirmModal
        open={confirmClear}
        title="Clear inbox?"
        description="This permanently deletes every alert in your inbox. New ones will still arrive automatically."
        detail={events.length === 1 ? '1 alert will be removed.' : `${events.length} alerts will be removed.`}
        confirmLabel="Delete all"
        tone="danger"
        loading={clearing}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void deleteAll()}
      />
    </ClientLayout>
  );
}

function AlertLetter({
  event,
  staff,
  busy,
  onDelete,
  onMarkRead,
}: {
  event: AlertEventSummary;
  staff?: boolean;
  busy: boolean;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  const action = eventAction(event, { staff });
  const unreadItem = !event.readAt;

  return (
    <article className={`alerts-inbox__letter alerts-inbox__letter--${event.severity || 'info'}`}>
      <p className="alerts-inbox__letter-body">{event.message}</p>
      <div className="alerts-inbox__facts">
        <span>{formatExact(event.createdAt)}</span>
        {event.server ? (
          <Link to={`/servers/${event.server.id}/console`}>{event.server.name}</Link>
        ) : null}
        {event.valuePct != null ? <span>{event.valuePct.toFixed(1)}% of allocation</span> : null}
      </div>
      <div className="alerts-inbox__letter-actions">
        {action ? (
          <Link className="ds-btn ds-btn--primary ds-btn--sm" to={action.to}>
            {action.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {unreadItem ? (
          <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm" onClick={onMarkRead} disabled={busy}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark read
          </button>
        ) : null}
        <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" onClick={onDelete} disabled={busy}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </article>
  );
}

function AlertFleetStat({
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
