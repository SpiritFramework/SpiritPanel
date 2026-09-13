import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Cpu,
  HardDrive,
  Inbox,
  KeyRound,
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
import { useBranding } from '../../context/BrandingContext';
import { normalizeAppearance } from '../../lib/branding-appearance';
import { ClientLayout, Button, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';

type InboxFilter = 'all' | 'unread' | 'critical' | 'servers' | 'security' | 'nodes';

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
    default:
      return Bell;
  }
}

function metricKind(metric: AlertMetric): 'servers' | 'security' | 'nodes' {
  if (SECURITY_METRICS.has(metric)) return 'security';
  if (metric === 'node_offline') return 'nodes';
  return 'servers';
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

function eventAction(event: AlertEventSummary): { to: string; label: string } | null {
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

export function AlertsPage() {
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);

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

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const ev = await api.client.alertEvents();
      setEvents(ev.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load({ soft: true }), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = useMemo(() => events.filter((e) => !e.readAt).length, [events]);
  const criticalUnread = useMemo(
    () => events.filter((e) => !e.readAt && e.severity === 'critical').length,
    [events],
  );
  const serverCount = useMemo(
    () => events.filter((e) => SERVER_METRICS.has(e.metric)).length,
    [events],
  );
  const securityCount = useMemo(
    () => events.filter((e) => SECURITY_METRICS.has(e.metric)).length,
    [events],
  );
  const nodeCount = useMemo(
    () => events.filter((e) => e.metric === 'node_offline').length,
    [events],
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (inboxFilter === 'unread' && event.readAt) return false;
      if (inboxFilter === 'critical' && event.severity !== 'critical') return false;
      if (inboxFilter === 'servers' && !SERVER_METRICS.has(event.metric)) return false;
      if (inboxFilter === 'security' && !SECURITY_METRICS.has(event.metric)) return false;
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

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

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
      const remaining = events.filter((e) => e.id !== id);
      setEvents(remaining);
      if (selectedId === id) {
        const idx = filteredEvents.findIndex((e) => e.id === id);
        const next = filteredEvents[idx + 1] ?? filteredEvents[idx - 1] ?? null;
        setSelectedId(next && next.id !== id ? next.id : null);
      }
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
    setSelectedId(event.id);
    if (!event.readAt) void markRead(event.id);
  }

  const filters: Array<{ id: InboxFilter; label: string; count: number; pulse?: boolean }> = [
    { id: 'all', label: 'All', count: events.length },
    { id: 'unread', label: 'Unread', count: unread, pulse: unread > 0 },
    { id: 'critical', label: 'Critical', count: events.filter((e) => e.severity === 'critical').length },
    { id: 'servers', label: 'Servers', count: serverCount },
    { id: 'security', label: 'Security', count: securityCount },
    { id: 'nodes', label: 'Nodes', count: nodeCount },
  ];

  if (loading) {
    return (
      <ClientLayout>
        <Page>
          <PageLoading label="Loading inbox…" />
        </Page>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Page>
        <section className="alerts-inbox">
          <header className="alerts-inbox__hero">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
            <div className="alerts-inbox__hero-inner">
              <div className="alerts-inbox__hero-top">
                <div className="alerts-inbox__hero-copy">
                  <span className="alerts-inbox__hero-icon" aria-hidden>
                    <Inbox className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="alerts-inbox__eyebrow">Notifications</p>
                    <h1 className="alerts-inbox__title">Inbox</h1>
                    <p className="alerts-inbox__desc">
                      Crashes, resource pressure, sign-ins, and access changes land here automatically.
                    </p>
                  </div>
                </div>
                <div className="alerts-inbox__hero-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void load({ soft: true })}
                    disabled={refreshing}
                    aria-label="Refresh inbox"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  {unread > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => void markAll()} disabled={busyId === 'all-read'}>
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </Button>
                  ) : null}
                  {events.length > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => setConfirmClear(true)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear inbox</span>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="alerts-inbox__stats" role="list" aria-label="Inbox summary">
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-inbox__stat${inboxFilter === 'unread' ? ' is-active' : ''}${unread ? ' alerts-inbox__stat--warning' : ''}`}
                  onClick={() => setInboxFilter(inboxFilter === 'unread' ? 'all' : 'unread')}
                >
                  <span className="alerts-inbox__stat-value">{unread}</span>
                  <span className="alerts-inbox__stat-label">Unread</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-inbox__stat${inboxFilter === 'critical' ? ' is-active' : ''}${
                    criticalUnread ? ' alerts-inbox__stat--danger' : ''
                  }`}
                  onClick={() => setInboxFilter(inboxFilter === 'critical' ? 'all' : 'critical')}
                >
                  <span className="alerts-inbox__stat-value">{criticalUnread}</span>
                  <span className="alerts-inbox__stat-label">Critical</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-inbox__stat${inboxFilter === 'security' ? ' is-active' : ''}`}
                  onClick={() => setInboxFilter(inboxFilter === 'security' ? 'all' : 'security')}
                >
                  <span className="alerts-inbox__stat-value">{securityCount}</span>
                  <span className="alerts-inbox__stat-label">Security</span>
                </button>
                <div className="alerts-inbox__stat" role="listitem">
                  <span className="alerts-inbox__stat-value">{events.length}</span>
                  <span className="alerts-inbox__stat-label">In inbox</span>
                </div>
              </div>
            </div>
          </header>

          {criticalUnread > 0 && inboxFilter !== 'unread' ? (
            <button
              type="button"
              className="alerts-inbox__callout"
              onClick={() => {
                setInboxFilter('unread');
                const first = events.find((e) => !e.readAt && e.severity === 'critical');
                if (first) openAlert(first);
              }}
            >
              <span className="alerts-inbox__callout-icon" aria-hidden>
                <Bell className="h-4 w-4" />
              </span>
              <span className="alerts-inbox__callout-body">
                <strong>
                  {criticalUnread} critical alert{criticalUnread === 1 ? '' : 's'} need attention
                </strong>
                <span>Open the latest one to check the console or security settings.</span>
              </span>
              <ChevronRight className="alerts-inbox__callout-chevron h-4 w-4" aria-hidden />
            </button>
          ) : null}

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

          <div className={`alerts-inbox__workspace${selected ? ' is-reading' : ''}`}>
            <section className="alerts-inbox__list-pane" aria-labelledby="alerts-inbox-list-title">
              <div className="alerts-inbox__toolbar">
                <div className="alerts-inbox__search">
                  <Search className="alerts-inbox__search-icon" aria-hidden />
                  <input
                    className="alerts-inbox__search-input"
                    placeholder="Search title, message, server…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search alerts"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="alerts-inbox__search-clear"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <div className="alerts-inbox__filters" role="tablist" aria-label="Filter inbox">
                  {filters.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={inboxFilter === option.id}
                      className={`alerts-inbox__filter${inboxFilter === option.id ? ' is-active' : ''}${
                        option.pulse ? ' alerts-inbox__filter--pulse' : ''
                      }`}
                      onClick={() => setInboxFilter(option.id)}
                    >
                      {option.label}
                      <span className="alerts-inbox__filter-count">{option.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <h2 id="alerts-inbox-list-title" className="sr-only">
                Messages
              </h2>

              {filteredEvents.length === 0 ? (
                <div className="alerts-inbox__empty">
                  <EmptyState
                    icon={<BellOff className="h-8 w-8" />}
                    title={
                      events.length === 0
                        ? 'Inbox is empty'
                        : inboxFilter === 'unread'
                          ? 'You are caught up'
                          : 'No matching alerts'
                    }
                    description={
                      events.length === 0
                        ? 'We’ll notify you here if a server crashes, disk fills up, or something changes on your account.'
                        : 'Try another filter or clear your search.'
                    }
                  />
                </div>
              ) : (
                <div className="alerts-inbox__scroll">
                  {groups.map((group) => (
                    <section key={group.label} className="alerts-inbox__group">
                      <h3 className="alerts-inbox__group-title">{group.label}</h3>
                      <ul className="alerts-inbox__list">
                        {group.events.map((event) => {
                          const Icon = metricIcon(event.metric);
                          const unreadItem = !event.readAt;
                          const kind = metricKind(event.metric);
                          return (
                            <li key={event.id}>
                              <div
                                className={`alerts-inbox__row alerts-inbox__row--${event.severity || 'info'}${
                                  unreadItem ? ' is-unread' : ''
                                }${selectedId === event.id ? ' is-selected' : ''}`}
                              >
                                <button
                                  type="button"
                                  className="alerts-inbox__row-open"
                                  onClick={() => openAlert(event)}
                                >
                                  <span className="alerts-inbox__row-rail" aria-hidden />
                                  <span className={`alerts-inbox__row-icon alerts-inbox__row-icon--${event.severity || 'info'}`} aria-hidden>
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <div className="alerts-inbox__row-main">
                                    <div className="alerts-inbox__row-top">
                                      <p className="alerts-inbox__row-title">{event.title}</p>
                                      <time className="alerts-inbox__row-time" dateTime={event.createdAt}>
                                        {formatRelative(event.createdAt)}
                                      </time>
                                    </div>
                                    <p className="alerts-inbox__row-preview">{event.message}</p>
                                    <div className="alerts-inbox__row-meta">
                                      <span className="alerts-inbox__chip">
                                        {kind === 'security' ? 'Security' : kind === 'nodes' ? 'Node' : 'Server'}
                                      </span>
                                      {event.server ? <span>{event.server.name}</span> : null}
                                      {event.valuePct != null ? <span>{event.valuePct.toFixed(0)}%</span> : null}
                                    </div>
                                  </div>
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
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <section className="alerts-inbox__detail" aria-live="polite">
              {selected ? (
                <AlertDetail
                  event={selected}
                  busy={busyId === selected.id}
                  onBack={() => setSelectedId(null)}
                  onDelete={() => void deleteOne(selected.id)}
                  onMarkRead={() => void markRead(selected.id)}
                />
              ) : (
                <div className="alerts-inbox__detail-empty">
                  <Inbox className="h-8 w-8" aria-hidden />
                  <p>Select an alert to read it</p>
                  <span>Newest messages stay at the top. Opening one marks it as read.</span>
                </div>
              )}
            </section>
          </div>
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

function AlertDetail({
  event,
  busy,
  onBack,
  onDelete,
  onMarkRead,
}: {
  event: AlertEventSummary;
  busy: boolean;
  onBack: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  const Icon = metricIcon(event.metric);
  const action = eventAction(event);
  const unreadItem = !event.readAt;
  const kind = metricKind(event.metric);

  return (
    <article className={`alerts-inbox__letter alerts-inbox__letter--${event.severity || 'info'}`}>
      <div className="alerts-inbox__letter-bar">
        <button type="button" className="alerts-inbox__back" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Inbox
        </button>
        <div className="alerts-inbox__letter-tools">
          {unreadItem ? (
            <button type="button" className="alerts-inbox__tool" onClick={onMarkRead} disabled={busy}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          ) : null}
          <button type="button" className="alerts-inbox__tool alerts-inbox__tool--danger" onClick={onDelete} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <header className="alerts-inbox__letter-head">
        <span className={`alerts-inbox__letter-icon alerts-inbox__letter-icon--${event.severity || 'info'}`} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="alerts-inbox__letter-tags">
            <span className={`alerts-inbox__sev alerts-inbox__sev--${event.severity || 'info'}`}>
              {severityLabel(event.severity)}
            </span>
            <span className="alerts-inbox__chip">{kind === 'security' ? 'Security' : kind === 'nodes' ? 'Node' : 'Server'}</span>
            {unreadItem ? <span className="alerts-inbox__ping">Unread</span> : null}
          </div>
          <h2 className="alerts-inbox__letter-title">{event.title}</h2>
          <p className="alerts-inbox__letter-when">{formatExact(event.createdAt)}</p>
        </div>
      </header>

      <p className="alerts-inbox__letter-body">{event.message}</p>

      <dl className="alerts-inbox__facts">
        {event.server ? (
          <div>
            <dt>Server</dt>
            <dd>
              <Link to={`/servers/${event.server.id}/console`}>{event.server.name}</Link>
            </dd>
          </div>
        ) : null}
        {event.valuePct != null ? (
          <div>
            <dt>Reading</dt>
            <dd>{event.valuePct.toFixed(1)}%</dd>
          </div>
        ) : null}
        <div>
          <dt>Received</dt>
          <dd>{formatRelative(event.createdAt)}</dd>
        </div>
      </dl>

      {action ? (
        <Link className="alerts-inbox__letter-cta" to={action.to}>
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </article>
  );
}
