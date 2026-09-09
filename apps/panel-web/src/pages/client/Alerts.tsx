import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  KeyRound,
  LogIn,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import {
  api,
  type AlertEventSummary,
  type AlertMetric,
  type AlertRuleSummary,
  type ServerSummary,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { normalizeAppearance } from '../../lib/branding-appearance';
import { isStaffOrPanelAdmin } from '../../lib/roles';
import { ClientLayout, Button, Input, Page, Select } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, EmptyState, PageLoading, Spinner } from '../../components/ui';

type PresetInfo = {
  id: string;
  label: string;
  description: string;
  adminOnly: boolean;
  ruleCount: number;
};

type InboxFilter = 'all' | 'unread' | 'critical' | 'security';

const ADVANCED_METRICS: {
  id: AlertMetric;
  label: string;
  needsThreshold: boolean;
  needsServer: boolean;
}[] = [
  { id: 'server_crashed', label: 'Server crashed', needsThreshold: false, needsServer: true },
  { id: 'server_offline', label: 'Unexpected stop / offline', needsThreshold: false, needsServer: true },
  { id: 'install_failed', label: 'Install failed', needsThreshold: false, needsServer: true },
  { id: 'cpu', label: 'CPU over threshold', needsThreshold: true, needsServer: true },
  { id: 'memory', label: 'Memory over threshold', needsThreshold: true, needsServer: true },
  { id: 'disk', label: 'Disk over threshold', needsThreshold: true, needsServer: true },
  { id: 'account_login_failed', label: 'Failed sign-in', needsThreshold: false, needsServer: false },
  { id: 'account_login', label: 'New sign-in', needsThreshold: false, needsServer: false },
  { id: 'account_password_changed', label: 'Password changed', needsThreshold: false, needsServer: false },
  { id: 'account_2fa_changed', label: '2FA changed', needsThreshold: false, needsServer: false },
  { id: 'account_api_key', label: 'API key created/revoked', needsThreshold: false, needsServer: false },
  { id: 'server_subuser', label: 'Subuser access changed', needsThreshold: false, needsServer: true },
  { id: 'node_offline', label: 'Node offline (admin)', needsThreshold: false, needsServer: false },
];

const PRESET_ICONS: Record<string, LucideIcon> = {
  essential: ShieldAlert,
  performance: Cpu,
  storage: HardDrive,
  security: Shield,
  server_security: UserPlus,
  full: Sparkles,
  node_health: Activity,
};

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

function friendlyRuleLabel(rule: AlertRuleSummary): string {
  switch (rule.metric) {
    case 'server_crashed':
      return 'Crashes';
    case 'server_offline':
      return 'Unexpected stop';
    case 'install_failed':
      return 'Install failures';
    case 'node_offline':
      return 'Node offline';
    case 'account_login_failed':
      return 'Failed sign-ins';
    case 'account_login':
      return 'New sign-ins';
    case 'account_password_changed':
      return 'Password changes';
    case 'account_2fa_changed':
      return '2FA changes';
    case 'account_api_key':
      return 'API key activity';
    case 'server_subuser':
      return 'Subuser access';
    case 'cpu':
      return `CPU ≥ ${rule.thresholdPct}%`;
    case 'memory':
      return `Memory ≥ ${rule.thresholdPct}%`;
    case 'disk':
      return `Disk ≥ ${rule.thresholdPct}%`;
    default:
      return rule.metric;
  }
}

function eventAction(event: AlertEventSummary): { to: string; label: string } | null {
  if (SECURITY_METRICS.has(event.metric) && event.metric !== 'server_subuser') {
    return { to: '/profile?tab=security', label: 'Security' };
  }
  if (event.server) {
    return { to: `/servers/${event.server.id}/console`, label: 'Console' };
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
  const { user } = useAuth();
  const { branding } = useBranding();
  const appearance = normalizeAppearance(branding);
  const isAdmin = isStaffOrPanelAdmin(user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [events, setEvents] = useState<AlertEventSummary[]>([]);
  const [rules, setRules] = useState<AlertRuleSummary[]>([]);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [serverId, setServerId] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('server_crashed');
  const [thresholdPct, setThresholdPct] = useState(90);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [ev, ru, list, pr] = await Promise.all([
        api.client.alertEvents(),
        api.client.alertRules(),
        api.client.servers(),
        api.client.alertPresets(),
      ]);
      setEvents(ev.events);
      setRules(ru.rules);
      setServers(list);
      setPresets(pr.presets);
      setServerId((prev) => prev || list[0]?.id || '');
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
  const activeWatches = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);
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

  const visibleRules = useMemo(() => {
    if (!serverId) return rules;
    return rules.filter(
      (r) => !r.serverId || r.serverId === serverId || SECURITY_METRICS.has(r.metric) || r.metric === 'node_offline',
    );
  }, [rules, serverId]);

  const selectedServer = servers.find((s) => s.id === serverId);
  const advancedMetric = ADVANCED_METRICS.find((m) => m.id === metric);
  const showAdvancedServer = Boolean(advancedMetric?.needsServer);
  const showThreshold = Boolean(advancedMetric?.needsThreshold);
  const deletingRule = rules.find((r) => r.id === deleteRuleId) ?? null;
  const accountOnlyPreset = (id: string) => id === 'security' || id === 'node_health';

  async function applyPreset(presetId: string) {
    setApplyingPreset(presetId);
    setError('');
    setNotice('');
    try {
      if (!accountOnlyPreset(presetId) && !serverId) throw new Error('Choose a server first');
      const result = await api.client.applyAlertPreset({
        presetId,
        serverId: accountOnlyPreset(presetId) ? null : serverId,
      });
      setNotice(
        result.created > 0
          ? `Added ${result.created} watch${result.created === 1 ? '' : 'es'}${
              !accountOnlyPreset(presetId) && selectedServer ? ` on ${selectedServer.name}` : ''
            }.`
          : 'Those watches were already enabled.',
      );
      await load({ soft: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply preset');
    } finally {
      setApplyingPreset(null);
    }
  }

  async function createAdvancedRule() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (metric === 'node_offline') {
        if (!isAdmin) throw new Error('Only admins can watch node offline');
        await api.client.createAlertRule({ metric: 'node_offline', thresholdPct: 0 });
      } else if (!showAdvancedServer) {
        await api.client.createAlertRule({ metric, thresholdPct: 0 });
      } else {
        if (!serverId) throw new Error('Pick a server');
        const pct = showThreshold ? Math.min(100, Math.max(1, thresholdPct || 90)) : 0;
        await api.client.createAlertRule({ metric, serverId, thresholdPct: pct });
      }
      setNotice('Custom watch added.');
      await load({ soft: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create rule');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: AlertRuleSummary) {
    setBusyRuleId(rule.id);
    setError('');
    try {
      await api.client.updateAlertRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update watch');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function confirmRemoveRule() {
    if (!deleteRuleId) return;
    const id = deleteRuleId;
    setBusyRuleId(id);
    setError('');
    try {
      await api.client.deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteRuleId(null);
      setNotice('Watch removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove watch');
    } finally {
      setBusyRuleId(null);
    }
  }

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
                    <p className="alerts-page__eyebrow">Monitoring</p>
                    <h1 className="alerts-page__title">Alerts</h1>
                    <p className="alerts-page__desc">
                      Catch crashes, disk pressure, and account security events. Start with a preset — open any alert for
                      the next step.
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
                  <span className="alerts-page__stat-value">{activeWatches}</span>
                  <span className="alerts-page__stat-label">Active watches</span>
                </div>
              </div>
            </div>
          </header>

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
          {notice ? <AlertBanner tone="info">{notice}</AlertBanner> : null}

          <section className="alerts-page__setup" aria-labelledby="alerts-setup-title">
            <div className="alerts-page__setup-head">
              <div>
                <p className="alerts-page__eyebrow">Quick setup</p>
                <h2 id="alerts-setup-title" className="alerts-page__setup-title">
                  What should we watch?
                </h2>
                <p className="alerts-page__setup-desc">
                  Account security needs no server. Server presets use the selection on the right.
                </p>
              </div>
              <div className="alerts-page__server-pick">
                <Select
                  id="alerts-server"
                  label="Server"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  disabled={servers.length === 0}
                >
                  {servers.length === 0 ? <option value="">No servers yet</option> : null}
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="alerts-page__presets">
              {presets.map((preset) => {
                const Icon = PRESET_ICONS[preset.id] ?? Sparkles;
                const needsServer = !accountOnlyPreset(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className="alerts-page__preset"
                    disabled={Boolean(applyingPreset) || (needsServer && !serverId)}
                    onClick={() => void applyPreset(preset.id)}
                  >
                    <span className="alerts-page__preset-icon" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="alerts-page__preset-copy">
                      <span className="alerts-page__preset-label">{preset.label}</span>
                      <span className="alerts-page__preset-desc">{preset.description}</span>
                      <span className="alerts-page__preset-meta">
                        {preset.ruleCount} watch{preset.ruleCount === 1 ? '' : 'es'}
                        {preset.adminOnly ? ' · Admin' : needsServer ? ' · Per server' : ' · Account'}
                      </span>
                    </span>
                    <span className="alerts-page__preset-cta">
                      {applyingPreset === preset.id ? <Spinner className="h-3.5 w-3.5" /> : 'Enable'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="alerts-page__grid">
            <section className="alerts-page__panel" aria-labelledby="alerts-inbox-title">
              <div className="alerts-page__panel-head">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <h2 id="alerts-inbox-title" className="alerts-page__panel-title">
                      Inbox
                    </h2>
                    <p className="alerts-page__panel-sub">Actionable events · auto-refreshes</p>
                  </div>
                  {unread > 0 ? <span className="alerts-page__badge">{unread} new</span> : null}
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
                  description="Enable Essential or Account security above — when something fires, you’ll get a clear next step here."
                />
              ) : (
                <ul className="alerts-page__scroll list-none m-0 p-0">
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

            <section className="alerts-page__panel" aria-labelledby="alerts-watches-title">
              <div className="alerts-page__panel-head">
                <div>
                  <h2 id="alerts-watches-title" className="alerts-page__panel-title">
                    Active watches
                  </h2>
                  <p className="alerts-page__panel-sub">Pause anything noisy · remove when done</p>
                </div>
              </div>

              {visibleRules.length === 0 ? (
                <EmptyState
                  icon={<ShieldAlert className="h-5 w-5" />}
                  title="No watches yet"
                  description="Enable Essential for servers, or Account security for sign-ins and password changes."
                />
              ) : (
                <ul className="alerts-page__scroll list-none m-0 p-0">
                  {visibleRules.map((rule) => {
                    const Icon = metricIcon(rule.metric);
                    return (
                      <li key={rule.id} className={`alerts-page__watch${rule.enabled ? '' : ' is-paused'}`}>
                        <span className="alerts-page__watch-icon" aria-hidden>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="alerts-page__watch-title">{friendlyRuleLabel(rule)}</p>
                          <p className="alerts-page__watch-meta">
                            <span className={`alerts-page__watch-state${rule.enabled ? ' is-on' : ''}`}>
                              {rule.enabled ? 'On' : 'Paused'}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {rule.server
                                ? rule.server.name
                                : SECURITY_METRICS.has(rule.metric)
                                  ? 'Account'
                                  : 'Panel-wide'}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {rule.lastFiredAt ? `Last ${formatRelative(rule.lastFiredAt)}` : 'Never fired'}
                            </span>
                          </p>
                        </div>
                        <div className="alerts-page__watch-actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyRuleId === rule.id}
                            onClick={() => void toggleRule(rule)}
                            aria-label={rule.enabled ? 'Pause watch' : 'Resume watch'}
                          >
                            {rule.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyRuleId === rule.id}
                            onClick={() => setDeleteRuleId(rule.id)}
                            aria-label="Remove watch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="alerts-page__advanced">
                <button
                  type="button"
                  className="alerts-page__advanced-toggle"
                  aria-expanded={advancedOpen}
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  <span>Advanced: custom watch</span>
                  <ChevronDown className={`h-4 w-4 transition${advancedOpen ? ' rotate-180' : ''}`} />
                </button>

                {advancedOpen ? (
                  <div className="alerts-page__advanced-body">
                    <p className="alerts-page__advanced-hint">
                      Prefer presets. Use this for a single threshold or security metric.
                    </p>
                    <div className="alerts-page__advanced-row">
                      <Select
                        label="What to watch"
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as AlertMetric)}
                      >
                        {ADVANCED_METRICS.filter((m) => m.id !== 'node_offline' || isAdmin).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                      {showAdvancedServer ? (
                        <Select label="Server" value={serverId} onChange={(e) => setServerId(e.target.value)}>
                          {servers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                    </div>
                    {showThreshold ? (
                      <Input
                        label="Threshold %"
                        type="number"
                        min={1}
                        max={100}
                        value={String(thresholdPct)}
                        onChange={(e) => setThresholdPct(Number(e.target.value) || 90)}
                      />
                    ) : null}
                    <Button type="button" onClick={() => void createAdvancedRule()} disabled={saving}>
                      {saving ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      Add custom watch
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <ConfirmModal
          open={Boolean(deleteRuleId)}
          title="Remove this watch?"
          description={
            deletingRule
              ? `${friendlyRuleLabel(deletingRule)}${deletingRule.server ? ` on ${deletingRule.server.name}` : ''} will stop alerting.`
              : 'This watch will stop alerting.'
          }
          confirmLabel="Remove"
          tone="danger"
          loading={busyRuleId === deleteRuleId}
          onClose={() => setDeleteRuleId(null)}
          onConfirm={() => void confirmRemoveRule()}
        />
      </Page>
    </ClientLayout>
  );
}
