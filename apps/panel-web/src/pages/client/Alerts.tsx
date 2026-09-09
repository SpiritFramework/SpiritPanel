import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Cpu,
  HardDrive,
  Plus,
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
import { isStaffOrPanelAdmin } from '../../lib/roles';
import { ClientLayout, Button, Input, Select } from '../../components/Layout';
import { AlertBanner, EmptyState, PageHeader, PageLoading, Spinner } from '../../components/ui';

type PresetInfo = {
  id: string;
  label: string;
  description: string;
  adminOnly: boolean;
  ruleCount: number;
};

const ADVANCED_METRICS: { id: AlertMetric; label: string; needsThreshold: boolean }[] = [
  { id: 'server_crashed', label: 'Server crashed', needsThreshold: false },
  { id: 'server_offline', label: 'Server stopped / offline', needsThreshold: false },
  { id: 'install_failed', label: 'Install failed', needsThreshold: false },
  { id: 'cpu', label: 'CPU over threshold', needsThreshold: true },
  { id: 'memory', label: 'Memory over threshold', needsThreshold: true },
  { id: 'disk', label: 'Disk over threshold', needsThreshold: true },
  { id: 'node_offline', label: 'Node offline (admin)', needsThreshold: false },
];

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
  if (severity === 'critical') return 'ds-alerts-event--critical';
  if (severity === 'warning') return 'ds-alerts-event--warning';
  return '';
}

export function AlertsPage() {
  const { user } = useAuth();
  const isAdmin = isStaffOrPanelAdmin(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [events, setEvents] = useState<AlertEventSummary[]>([]);
  const [rules, setRules] = useState<AlertRuleSummary[]>([]);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [serverId, setServerId] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('server_crashed');
  const [thresholdPct, setThresholdPct] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = useMemo(() => events.filter((e) => !e.readAt).length, [events]);
  const filteredEvents = useMemo(
    () => (inboxFilter === 'unread' ? events.filter((e) => !e.readAt) : events),
    [events, inboxFilter],
  );
  const selectedServer = servers.find((s) => s.id === serverId);
  const advancedMetric = ADVANCED_METRICS.find((m) => m.id === metric);
  const showAdvancedServer = metric !== 'node_offline';
  const showThreshold = Boolean(advancedMetric?.needsThreshold);

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
      await load();
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
        await api.client.createAlertRule({
          metric,
          serverId,
          thresholdPct: showThreshold ? thresholdPct : 0,
        });
      }
      setNotice('Custom watch added.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create rule');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: AlertRuleSummary) {
    await api.client.updateAlertRule(rule.id, { enabled: !rule.enabled });
    await load();
  }

  async function removeRule(id: string) {
    await api.client.deleteAlertRule(id);
    await load();
  }

  async function markRead(id: string) {
    await api.client.markAlertRead(id);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, readAt: new Date().toISOString() } : e)));
  }

  async function markAll() {
    await api.client.markAllAlertsRead();
    setEvents((prev) => prev.map((e) => ({ ...e, readAt: e.readAt ?? new Date().toISOString() })));
  }

  if (loading) {
    return (
      <ClientLayout>
        <PageLoading label="Loading alerts…" />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="ds-alerts">
        <PageHeader
          title="Alerts"
          description="Get notified when something goes wrong. Start with a preset — you can fine-tune later."
          action={
            unread > 0 ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => void markAll()}>
                Mark all read
              </Button>
            ) : null
          }
        />

        {error ? (
          <AlertBanner tone="error" className="mb-4">
            {error}
          </AlertBanner>
        ) : null}
        {notice ? (
          <AlertBanner tone="info" className="mb-4">
            {notice}
          </AlertBanner>
        ) : null}

        <section className="ds-alerts-setup">
          <div className="ds-alerts-setup-head">
            <div>
              <p className="ds-alerts-kicker">Quick setup</p>
              <h2 className="ds-alerts-setup-title">What should we watch?</h2>
              <p className="ds-alerts-setup-desc">
                Pick a server, then turn on a preset. Checks run about every 30 seconds while the panel collects stats.
              </p>
            </div>
            <div className="ds-alerts-server-pick">
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

          <div className="ds-alerts-presets">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="ds-alerts-preset"
                disabled={Boolean(applyingPreset) || (preset.id !== 'node_health' && !serverId)}
                onClick={() => void applyPreset(preset.id)}
              >
                <span className="ds-alerts-preset-icon" aria-hidden>
                  {preset.id === 'essential' ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : preset.id === 'performance' ? (
                    <Cpu className="h-4 w-4" />
                  ) : preset.id === 'storage' ? (
                    <HardDrive className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </span>
                <span className="ds-alerts-preset-copy">
                  <span className="ds-alerts-preset-label">{preset.label}</span>
                  <span className="ds-alerts-preset-desc">{preset.description}</span>
                  <span className="ds-alerts-preset-meta">
                    {preset.ruleCount} watch{preset.ruleCount === 1 ? '' : 'es'}
                    {preset.adminOnly ? ' · Admin' : ''}
                  </span>
                </span>
                <span className="ds-alerts-preset-cta">
                  {applyingPreset === preset.id ? <Spinner className="h-3.5 w-3.5" /> : 'Enable'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="ds-alerts-grid">
          <section className="ds-alerts-panel">
            <div className="ds-alerts-panel-head">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                <h2 className="ds-alerts-panel-title">Inbox</h2>
                {unread > 0 ? <span className="ds-alerts-badge">{unread} new</span> : null}
              </div>
              <div className="ds-alerts-filter" role="group" aria-label="Inbox filter">
                <button
                  type="button"
                  className={inboxFilter === 'all' ? 'is-active' : ''}
                  onClick={() => setInboxFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={inboxFilter === 'unread' ? 'is-active' : ''}
                  onClick={() => setInboxFilter('unread')}
                >
                  Unread
                </button>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <EmptyState
                icon={<BellOff className="h-5 w-5" />}
                title={inboxFilter === 'unread' ? 'You are caught up' : 'No alerts yet'}
                description="When a watch fires, it shows up here. Cooldowns stop the same issue from spamming you."
              />
            ) : (
              <ul className="ds-alerts-event-list">
                {filteredEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`ds-alerts-event ${severityTone(event.severity)}${event.readAt ? '' : ' is-unread'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="ds-alerts-event-title">{event.title}</p>
                      <p className="ds-alerts-event-msg">{event.message}</p>
                      <p className="ds-alerts-event-meta">
                        {formatWhen(event.createdAt)}
                        {event.server ? (
                          <>
                            {' · '}
                            <Link className="accent-text hover:underline" to={`/servers/${event.server.id}/console`}>
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

          <section className="ds-alerts-panel">
            <div className="ds-alerts-panel-head">
              <div>
                <h2 className="ds-alerts-panel-title">Active watches</h2>
                <p className="ds-alerts-panel-sub">Pause or remove anytime.</p>
              </div>
            </div>

            {rules.length === 0 ? (
              <p className="ds-alerts-empty-rules">No watches yet — enable a preset above.</p>
            ) : (
              <ul className="ds-alerts-rule-list">
                {rules.map((rule) => (
                  <li key={rule.id} className={`ds-alerts-rule${rule.enabled ? '' : ' is-paused'}`}>
                    <div className="min-w-0">
                      <p className="ds-alerts-rule-title">
                        {friendlyRuleLabel(rule)}
                        {rule.server ? ` · ${rule.server.name}` : ''}
                      </p>
                      <p className="ds-alerts-rule-meta">
                        {rule.enabled ? 'On' : 'Paused'} · every {Math.round(rule.cooldownSec / 60)}m max
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => void toggleRule(rule)}>
                        {rule.enabled ? 'Pause' : 'Resume'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void removeRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="ds-alerts-advanced">
              <button
                type="button"
                className="ds-alerts-advanced-toggle"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                <span>Advanced: custom watch</span>
                <ChevronDown className={`h-4 w-4 transition${advancedOpen ? ' rotate-180' : ''}`} />
              </button>

              {advancedOpen ? (
                <div className="ds-alerts-advanced-body">
                  <p className="ds-alerts-advanced-hint">
                    For power users. Prefer presets unless you need a specific threshold.
                  </p>
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
      </div>
    </ClientLayout>
  );
}
