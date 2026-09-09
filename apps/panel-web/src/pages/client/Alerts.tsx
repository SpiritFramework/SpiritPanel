import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Plus, Trash2 } from 'lucide-react';
import {
  api,
  type AlertEventSummary,
  type AlertMetric,
  type AlertRuleSummary,
  type ServerSummary,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { isStaffOrPanelAdmin } from '../../lib/roles';
import { ClientLayout, Button, Input } from '../../components/Layout';
import { AlertBanner, EmptyState, PageHeader, PageLoading, Spinner } from '../../components/ui';

const RESOURCE_METRICS: { id: AlertMetric; label: string }[] = [
  { id: 'cpu', label: 'CPU % of allocation' },
  { id: 'memory', label: 'Memory % of allocation' },
  { id: 'disk', label: 'Disk % of allocation' },
];

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AlertsPage() {
  const { user } = useAuth();
  const isAdmin = isStaffOrPanelAdmin(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<AlertEventSummary[]>([]);
  const [rules, setRules] = useState<AlertRuleSummary[]>([]);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [saving, setSaving] = useState(false);

  const [metric, setMetric] = useState<AlertMetric>('cpu');
  const [serverId, setServerId] = useState('');
  const [thresholdPct, setThresholdPct] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ev, ru, list] = await Promise.all([
        api.client.alertEvents(),
        api.client.alertRules(),
        api.client.servers(),
      ]);
      setEvents(ev.events);
      setRules(ru.rules);
      setServers(list);
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

  async function createRule() {
    setSaving(true);
    setError('');
    try {
      if (metric === 'node_offline') {
        await api.client.createAlertRule({ metric: 'node_offline', thresholdPct: 0 });
      } else {
        if (!serverId) throw new Error('Pick a server');
        await api.client.createAlertRule({ metric, serverId, thresholdPct });
      }
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
      <PageHeader
        title="Alerts"
        description="Threshold rules for your servers. Fired events show here in near real time (~30s). Discord delivery comes later."
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <h2 className="text-sm font-semibold text-[var(--text)]">Inbox</h2>
            {unread > 0 ? (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                {unread} new
              </span>
            ) : null}
          </div>
          {events.length === 0 ? (
            <EmptyState
              icon={<BellOff className="h-5 w-5" />}
              title="No alerts yet"
              description="When a rule fires, events appear here with cooldown so you are not spammed."
            />
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className={`rounded-lg border px-3 py-2.5 ${
                    event.readAt
                      ? 'border-[var(--border)] bg-transparent'
                      : 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)]">{event.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{event.message}</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">{formatWhen(event.createdAt)}</p>
                    </div>
                    {!event.readAt ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => void markRead(event.id)}>
                        Read
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <h2 className="text-sm font-semibold text-[var(--text)]">Rules</h2>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            <label className="block text-xs text-[var(--muted)]">
              Metric
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)]"
                value={metric}
                onChange={(e) => setMetric(e.target.value as AlertMetric)}
              >
                {RESOURCE_METRICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                {isAdmin ? <option value="node_offline">Node offline (admin)</option> : null}
              </select>
            </label>

            {metric !== 'node_offline' ? (
              <>
                <label className="block text-xs text-[var(--muted)]">
                  Server
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)]"
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Threshold %"
                  type="number"
                  min={1}
                  max={100}
                  value={String(thresholdPct)}
                  onChange={(e) => setThresholdPct(Number(e.target.value) || 90)}
                />
              </>
            ) : null}

            <Button type="button" onClick={() => void createRule()} disabled={saving}>
              {saving ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              Add rule
            </Button>
          </div>

          <ul className="mt-4 space-y-2">
            {rules.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No rules configured.</p>
            ) : (
              rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--text)]">
                      {rule.metric === 'node_offline'
                        ? 'Node offline'
                        : `${rule.metric.toUpperCase()} ≥ ${rule.thresholdPct}%`}
                      {rule.server ? ` · ${rule.server.name}` : ''}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {rule.enabled ? 'Enabled' : 'Paused'} · cooldown {Math.round(rule.cooldownSec / 60)}m
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => void toggleRule(rule)}>
                      {rule.enabled ? 'Pause' : 'Enable'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void removeRule(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </ClientLayout>
  );
}
