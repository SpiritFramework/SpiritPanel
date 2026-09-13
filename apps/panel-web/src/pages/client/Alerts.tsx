import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PanelName, panelNameGradientStyle, panelNameInitial } from '../../components/PanelName';
import { sanitizeImageSrc } from '../../lib/safe-url';
import { ClientLayout, Button, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, DsIcon, EmptyState, PageLoading } from '../../components/ui';

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

function kindLabel(kind: 'servers' | 'security' | 'nodes') {
  if (kind === 'security') return 'Security';
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
  const criticalCount = useMemo(() => events.filter((e) => e.severity === 'critical').length, [events]);
  const criticalUnread = useMemo(
    () => events.filter((e) => !e.readAt && e.severity === 'critical').length,
    [events],
  );
  const serverCount = useMemo(() => events.filter((e) => SERVER_METRICS.has(e.metric)).length, [events]);
  const securityCount = useMemo(() => events.filter((e) => SECURITY_METRICS.has(e.metric)).length, [events]);
  const nodeCount = useMemo(() => events.filter((e) => e.metric === 'node_offline').length, [events]);

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

  const filters: Array<{ id: InboxFilter; label: string; count: number; icon: LucideIcon }> = [
    { id: 'all', label: 'All', count: events.length, icon: Inbox },
    { id: 'unread', label: 'Unread', count: unread, icon: Bell },
    { id: 'critical', label: 'Critical', count: criticalCount, icon: Activity },
    { id: 'servers', label: 'Servers', count: serverCount, icon: Server },
    { id: 'security', label: 'Security', count: securityCount, icon: Shield },
    ...(nodeCount > 0 ? [{ id: 'nodes' as const, label: 'Nodes', count: nodeCount, icon: HardDrive }] : []),
  ];

  const summaryText =
    events.length === 0
      ? 'Nothing waiting — new notices land here automatically.'
      : unread > 0
        ? `${unread} unread${criticalUnread ? ` · ${criticalUnread} critical` : ''}`
        : `You're caught up · ${events.length} in inbox`;

  if (loading) {
    return (
      <ClientLayout>
        <Page>
          <PageLoading label="Loading alerts…" />
        </Page>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Page>
        <section className="alerts-inbox" aria-label="Alerts">
          <header className="alerts-inbox__hero">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}

            <div className="alerts-inbox__hero-top">
              <div className="alerts-inbox__identity">
                {logoSrc ? (
                  <div className="alerts-inbox__mark">
                    <img src={logoSrc} alt="" />
                  </div>
                ) : (
                  <div className="alerts-inbox__mark alerts-inbox__mark--fallback" style={panelNameGradientStyle()}>
                    {panelNameInitial(branding.panelName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="alerts-inbox__greeting">
                    {greeting()}
                    {user ? `, ${displayName(user)}` : ''}
                  </p>
                  <h1 className="alerts-inbox__title">Alerts</h1>
                  <div className="alerts-inbox__brand">
                    <PanelName name={branding.panelName} variant="compact" className="shrink-0" />
                    <span className="alerts-inbox__tagline">Inbox</span>
                  </div>
                  <p className="alerts-inbox__summary">{summaryText}</p>
                </div>
              </div>

              <div className="alerts-inbox__aside">
                <HeaderStat label="Unread" value={unread} tone={unread ? 'warn' : undefined} />
                {criticalUnread > 0 ? <HeaderStat label="Critical" value={criticalUnread} tone="danger" /> : null}
                <HeaderStat label="Total" value={events.length} />
                <button
                  type="button"
                  onClick={() => void load({ soft: true })}
                  disabled={refreshing}
                  title="Refresh inbox"
                  aria-label="Refresh inbox"
                  className="ds-icon-btn ds-icon-btn--bordered h-9 w-9"
                >
                  <RefreshCw className={`ds-icon ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAll()}
                    disabled={busyId === 'all-read'}
                    title="Mark all read"
                    aria-label="Mark all read"
                    className="ds-icon-btn ds-icon-btn--bordered h-9 w-9"
                  >
                    <CheckCheck className="ds-icon" />
                  </button>
                ) : null}
                {events.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    title="Clear inbox"
                    aria-label="Clear inbox"
                    className="ds-icon-btn ds-icon-btn--bordered h-9 w-9"
                  >
                    <Trash2 className="ds-icon" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="alerts-inbox__tools">
              <div className="alerts-inbox__pills" role="toolbar" aria-label="Filter alerts">
                {filters.map((pill) => {
                  const Icon = pill.icon;
                  const active = inboxFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setInboxFilter(pill.id)}
                      className={`ds-filter-pill ${active ? 'is-active' : ''}`}
                      aria-pressed={active}
                    >
                      <Icon className="ds-icon" />
                      {pill.label}
                      <span className="ds-filter-pill-count">{pill.count}</span>
                    </button>
                  );
                })}
              </div>

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
          </header>

          {criticalUnread > 0 ? (
            <button
              type="button"
              className="alerts-inbox__callout"
              onClick={() => {
                setInboxFilter('critical');
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

          {events.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={BellOff} className="ds-icon--md" />}
              title="Inbox is empty"
              description="We’ll notify you here if a server crashes, disk fills up, or something changes on your account."
            />
          ) : (
            <>
              <div className="alerts-inbox__meta">
                <p className="alerts-inbox__meta-text">
                  Showing <strong>{filteredEvents.length}</strong>
                  {filteredEvents.length !== events.length ? ` of ${events.length}` : ''}
                  {inboxFilter !== 'all' ? ` · ${filters.find((f) => f.id === inboxFilter)?.label}` : ''}
                </p>
              </div>

              <div className="alerts-inbox__panel">
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
                                <button type="button" className="alerts-inbox__row-open" onClick={() => openAlert(event)}>
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
                                      {unreadItem ? <span className="alerts-inbox__ping">New</span> : null}
                                      <span className={`alerts-inbox__sev alerts-inbox__sev--${event.severity || 'info'}`}>
                                        {severityLabel(event.severity)}
                                      </span>
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
                                      {event.valuePct != null ? <span>{event.valuePct.toFixed(0)}%</span> : null}
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
            </>
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
  busy,
  onDelete,
  onMarkRead,
}: {
  event: AlertEventSummary;
  busy: boolean;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  const action = eventAction(event);
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

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]'
      : tone === 'danger'
        ? 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]'
        : '';

  return (
    <div className={`ds-mini-stat ${toneClass}`}>
      {label}
      <span className="ds-mini-stat-value ds-text-mono">{value}</span>
    </div>
  );
}
