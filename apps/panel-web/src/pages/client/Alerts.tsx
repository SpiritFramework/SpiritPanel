import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Cpu,
  HardDrive,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  Trash2,
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

type InboxFilter = 'all' | 'unread' | 'critical';

const ADVANCED_METRICS: { id: AlertMetric; label: string; needsThreshold: boolean }[] = [
  { id: 'server_crashed', label: 'Server crashed', needsThreshold: false },
  { id: 'server_offline', label: 'Unexpected stop / offline', needsThreshold: false },
  { id: 'install_failed', label: 'Install failed', needsThreshold: false },
  { id: 'cpu', label: 'CPU over threshold', needsThreshold: true },
  { id: 'memory', label: 'Memory over threshold', needsThreshold: true },
  { id: 'disk', label: 'Disk over threshold', needsThreshold: true },
  { id: 'node_offline', label: 'Node offline (admin)', needsThreshold: false },
];

const PRESET_ICONS: Record<string, typeof ShieldAlert> = {
  essential: ShieldAlert,
  performance: Cpu,
  storage: HardDrive,
  full: Sparkles,
  node_health: Activity,
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
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

function severityTone(severity: string): string {
  if (severity === 'critical') return 'alerts-page__event--critical';
  if (severity === 'warning') return 'alerts-page__event--warning';
  return '';
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
  const watchedServers = useMemo(() => {
    const ids = new Set(rules.filter((r) => r.serverId).map((r) => r.serverId!));
    return ids.size;
  }, [rules]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (inboxFilter === 'unread') return !event.readAt;
      if (inboxFilter === 'critical') return event.severity === 'critical';
      return true;
    });
  }, [events, inboxFilter]);

  const visibleRules = useMemo(() => {
    if (!serverId) return rules;
    return rules.filter((r) => !r.serverId || r.serverId === serverId || r.metric === 'node_offline');
  }, [rules, serverId]);

  const selectedServer = servers.find((s) => s.id === serverId);
  const advancedMetric = ADVANCED_METRICS.find((m) => m.id === metric);
  const showAdvancedServer = metric !== 'node_offline';
  const showThreshold = Boolean(advancedMetric?.needsThreshold);
  const deletingRule = rules.find((r) => r.id === deleteRuleId) ?? null;

  async function applyPreset(presetId: string) {
    setApplyingPreset(presetId);
    setError('');
    setNotice('');
    try {
      if (presetId !== 'node_health' && !serverId) throw new Error('Choose a server first');
      const result = await api.client.applyAlertPreset({
        presetId,
        serverId: presetId === 'node_health' ? null : serverId,
      });
      setNotice(
        result.created > 0
          ? `Added ${result.created} watch${result.created === 1 ? '' : 'es'}${selectedServer ? ` on ${selectedServer.name}` : ''}.`
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
      } else {
        if (!serverId) throw new Error('Pick a server');
        const pct = showThreshold ? Math.min(100, Math.max(1, thresholdPct || 90)) : 0;
        await api.client.createAlertRule({
          metric,
          serverId,
          thresholdPct: pct,
        });
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
                      Get notified when a server crashes, fills disk, or hits pressure. Start with a preset — fine-tune
                      only if you need to.
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
                <div className="alerts-page__stat" role="listitem">
                  <span className="alerts-page__stat-value">{activeWatches}</span>
                  <span className="alerts-page__stat-label">Active watches</span>
                </div>
                <div className="alerts-page__stat" role="listitem">
                  <span className="alerts-page__stat-value">{watchedServers}</span>
                  <span className="alerts-page__stat-label">Servers watched</span>
                </div>
              </div>
            </div>
          </header>

          {error ? (
            <AlertBanner tone="error">{error}</AlertBanner>
          ) : null}
          {notice ? (
            <AlertBanner tone="info">{notice}</AlertBanner>
          ) : null}

          <section className="alerts-page__setup" aria-labelledby="alerts-setup-title">
            <div className="alerts-page__setup-head">
              <div>
                <p className="alerts-page__eyebrow">Quick setup</p>
                <h2 id="alerts-setup-title" className="alerts-page__setup-title">
                  What should we watch?
                </h2>
                <p className="alerts-page__setup-desc">
                  Choose a server, then enable a preset. Resource checks run about every 30 seconds; crash and stop
                  alerts fire when state changes.
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

            {servers.length === 0 ? (
              <EmptyState
                icon={<Server className="h-5 w-5" />}
                title="No servers to watch"
                description="Once you have a server, presets will appear here."
              />
            ) : (
              <div className="alerts-page__presets">
                {presets.map((preset) => {
                  const Icon = PRESET_ICONS[preset.id] ?? Sparkles;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className="alerts-page__preset"
                      disabled={Boolean(applyingPreset) || (preset.id !== 'node_health' && !serverId)}
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
                          {preset.adminOnly ? ' · Admin' : ''}
                        </span>
                      </span>
                      <span className="alerts-page__preset-cta">
                        {applyingPreset === preset.id ? <Spinner className="h-3.5 w-3.5" /> : 'Enable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
                    <p className="alerts-page__panel-sub">Newest first · auto-refreshes</p>
                  </div>
                  {unread > 0 ? <span className="alerts-page__badge">{unread} new</span> : null}
                </div>
                <div className="alerts-page__filters" role="group" aria-label="Inbox filter">
                  {(
                    [
                      ['all', 'All'],
                      ['unread', 'Unread'],
                      ['critical', 'Critical'],
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
                        : 'No alerts yet'
                  }
                  description="When a watch fires, it shows up here. Cooldowns keep the same issue from spamming you."
                />
              ) : (
                <ul className="alerts-page__scroll list-none m-0 p-0">
                  {filteredEvents.map((event) => (
                    <li
                      key={event.id}
                      className={`alerts-page__event ${severityTone(event.severity)}${
                        event.readAt ? '' : ' is-unread'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="alerts-page__event-title">{event.title}</p>
                        <p className="alerts-page__event-msg">{event.message}</p>
                        <p className="alerts-page__event-meta">
                          {formatWhen(event.createdAt)}
                          {event.server ? (
                            <>
                              {' · '}
                              <Link
                                className="accent-text hover:underline"
                                to={`/servers/${event.server.id}/console`}
                              >
                                {event.server.name}
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                      {!event.readAt ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void markRead(event.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Read
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="alerts-page__panel" aria-labelledby="alerts-watches-title">
              <div className="alerts-page__panel-head">
                <div>
                  <h2 id="alerts-watches-title" className="alerts-page__panel-title">
                    Active watches
                  </h2>
                  <p className="alerts-page__panel-sub">
                    {selectedServer ? `Showing ${selectedServer.name} + panel-wide` : 'Pause or remove anytime'}
                  </p>
                </div>
              </div>

              {visibleRules.length === 0 ? (
                <EmptyState
                  icon={<ShieldAlert className="h-5 w-5" />}
                  title="No watches yet"
                  description="Enable a preset above to start monitoring."
                />
              ) : (
                <ul className="alerts-page__scroll list-none m-0 p-0">
                  {visibleRules.map((rule) => (
                    <li key={rule.id} className={`alerts-page__rule${rule.enabled ? '' : ' is-paused'}`}>
                      <div className="min-w-0">
                        <p className="alerts-page__rule-title">
                          {friendlyRuleLabel(rule)}
                          {rule.server ? ` · ${rule.server.name}` : ''}
                        </p>
                        <p className="alerts-page__rule-meta">
                          {rule.enabled ? 'On' : 'Paused'} · cooldown {Math.round(rule.cooldownSec / 60)}m
                        </p>
                      </div>
                      <div className="alerts-page__rule-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyRuleId === rule.id}
                          onClick={() => void toggleRule(rule)}
                        >
                          {rule.enabled ? 'Pause' : 'Resume'}
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
                  ))}
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
                      For power users. Prefer presets unless you need a specific threshold.
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
