import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Cpu,
  HardDrive,
  KeyRound,
  LogIn,
  RefreshCw,
  Server,
  Shield,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { api, type AlertEventSummary, type AlertMetric } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import { normalizeAppearance } from '../../lib/branding-appearance';
import { ClientLayout, Button, Page } from '../../components/Layout';
import { AlertBanner, EmptyState, PageLoading } from '../../components/ui';

type InboxFilter = 'all' | 'unread' | 'critical' | 'security';

const SECURITY_METRICS = new Set<AlertMetric>([
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
]);

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

function eventAction(event: AlertEventSummary): { to: string; label: string } | null {
  if (SECURITY_METRICS.has(event.metric) && event.metric !== 'server_subuser') {
    return { to: '/profile?tab=security', label: 'Security' };
  }
  if (event.server) {
    return { to: `/servers/${event.server.id}/console`, label: 'Open console' };
  }
  if (event.metric === 'node_offline') {
    return { to: '/admin/nodes', label: 'Nodes' };
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
  const securityUnread = useMemo(
    () => events.filter((e) => !e.readAt && SECURITY_METRICS.has(e.metric)).length,
    [events],
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (inboxFilter === 'unread') return !event.readAt;
      if (inboxFilter === 'critical') return event.severity === 'critical';
      if (inboxFilter === 'security') return SECURITY_METRICS.has(event.metric);
      return true;
    });
  }, [events, inboxFilter]);

  async function markRead(id: string) {
    try {
      await api.client.markAlertRead(id);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, readAt: new Date().toISOString() } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark alert read');
    }
  }

  async function markAll() {
    try {
      await api.client.markAllAlertsRead();
      setEvents((prev) => prev.map((e) => ({ ...e, readAt: e.readAt ?? new Date().toISOString() })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark alerts read');
    }
  }

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
        <section className="alerts-page">
          <header className="alerts-page__hero">
            {appearance.showHeroStripe ? <div className="ds-hero-stripe" /> : null}
            <div className="alerts-page__hero-inner">
              <div className="alerts-page__hero-top">
                <div className="alerts-page__hero-copy">
                  <span className="alerts-page__hero-icon" aria-hidden>
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="alerts-page__eyebrow">Inbox</p>
                    <h1 className="alerts-page__title">Alerts</h1>
                    <p className="alerts-page__desc">
                      Crashes, disk pressure, sign-ins, and access changes land here automatically. Nothing to set up.
                    </p>
                  </div>
                </div>
                <div className="alerts-page__hero-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void load({ soft: true })}
                    disabled={refreshing}
                    aria-label="Refresh alerts"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  {unread > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => void markAll()}>
                      Mark all read
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="alerts-page__stats" role="list" aria-label="Alert summary">
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-page__stat${inboxFilter === 'unread' ? ' is-active' : ''}${
                    unread ? ' alerts-page__stat--warning' : ''
                  }`}
                  onClick={() => setInboxFilter(inboxFilter === 'unread' ? 'all' : 'unread')}
                >
                  <span className="alerts-page__stat-value">{unread}</span>
                  <span className="alerts-page__stat-label">Unread</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-page__stat${inboxFilter === 'critical' ? ' is-active' : ''}${
                    criticalUnread ? ' alerts-page__stat--danger' : ''
                  }`}
                  onClick={() => setInboxFilter(inboxFilter === 'critical' ? 'all' : 'critical')}
                >
                  <span className="alerts-page__stat-value">{criticalUnread}</span>
                  <span className="alerts-page__stat-label">Critical</span>
                </button>
                <button
                  type="button"
                  role="listitem"
                  className={`alerts-page__stat${inboxFilter === 'security' ? ' is-active' : ''}`}
                  onClick={() => setInboxFilter(inboxFilter === 'security' ? 'all' : 'security')}
                >
                  <span className="alerts-page__stat-value">{securityUnread}</span>
                  <span className="alerts-page__stat-label">Security</span>
                </button>
                <div className="alerts-page__stat" role="listitem">
                  <span className="alerts-page__stat-value">{events.length}</span>
                  <span className="alerts-page__stat-label">In inbox</span>
                </div>
              </div>
            </div>
          </header>

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

          <section className="alerts-page__panel" aria-labelledby="alerts-inbox-title">
            <div className="alerts-page__panel-head">
              <div className="min-w-0">
                <h2 id="alerts-inbox-title" className="alerts-page__panel-title">
                  Latest
                </h2>
                <p className="alerts-page__panel-sub">Auto-refreshes every 30 seconds</p>
              </div>
              <div className="alerts-page__filters" role="group" aria-label="Inbox filter">
                {(
                  [
                    ['all', 'All'],
                    ['unread', 'Unread'],
                    ['critical', 'Critical'],
                    ['security', 'Security'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`alerts-page__filter${inboxFilter === id ? ' is-active' : ''}`}
                    onClick={() => setInboxFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <EmptyState
                icon={<BellOff className="h-5 w-5" />}
                title={
                  inboxFilter === 'unread'
                    ? 'You are caught up'
                    : inboxFilter === 'critical'
                      ? 'No critical alerts'
                      : inboxFilter === 'security'
                        ? 'No security alerts'
                        : 'No alerts yet'
                }
                description="We’ll notify you here if a server crashes, disk fills up, or something changes on your account."
              />
            ) : (
              <ul className="alerts-page__scroll alerts-page__scroll--inbox list-none m-0 p-0">
                {filteredEvents.map((event) => {
                  const Icon = metricIcon(event.metric);
                  const action = eventAction(event);
                  const unreadItem = !event.readAt;
                  return (
                    <li
                      key={event.id}
                      className={`alerts-page__msg alerts-page__msg--${event.severity || 'info'}${
                        unreadItem ? ' is-unread' : ''
                      }`}
                    >
                      <span className={`alerts-page__msg-icon alerts-page__msg-icon--${event.severity || 'info'}`} aria-hidden>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="alerts-page__msg-body min-w-0 flex-1">
                        <div className="alerts-page__msg-top">
                          <p className="alerts-page__msg-title">{event.title}</p>
                          <span className={`alerts-page__sev alerts-page__sev--${event.severity || 'info'}`}>
                            {severityLabel(event.severity)}
                          </span>
                        </div>
                        <p className="alerts-page__msg-text">{event.message}</p>
                        <div className="alerts-page__msg-meta">
                          <span>{formatRelative(event.createdAt)}</span>
                          {event.server ? (
                            <>
                              <span aria-hidden>·</span>
                              <Link className="accent-text hover:underline" to={`/servers/${event.server.id}/console`}>
                                {event.server.name}
                              </Link>
                            </>
                          ) : null}
                          {event.valuePct != null ? (
                            <>
                              <span aria-hidden>·</span>
                              <span>{event.valuePct.toFixed(0)}%</span>
                            </>
                          ) : null}
                        </div>
                        <div className="alerts-page__msg-actions">
                          {action ? (
                            <Link className="alerts-page__msg-link" to={action.to}>
                              {action.label}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                          {unreadItem ? (
                            <button type="button" className="alerts-page__msg-read" onClick={() => void markRead(event.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark read
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </section>
      </Page>
    </ClientLayout>
  );
}
