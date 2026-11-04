import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  HardDrive,
  Info,
  Pencil,
  Plus,
  Server,
  Trash2,
  Wifi,
} from 'lucide-react';
import {
  api,
  type CreateDatabaseHostInput,
  type DatabaseHostSummary,
  type UpdateDatabaseHostInput,
} from '../lib/api';
import { Button, Input } from './Layout';
import { ModalShell } from './ModalShell';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState, Spinner } from './ui';
import { AdminCallout, AdminToolButton } from './admin/primitives';

type ConnectionCreds = { host: string; port: number; username: string; password: string };

export function DatabaseHostsPanel({
  nodeId,
  nodeFqdn,
  embedded,
  onActionsChange,
}: {
  nodeId: string;
  nodeFqdn?: string;
  /** When true, skip outer chrome (parent already provides a section header). */
  embedded?: boolean;
  /** Lets the parent panel mount the Add host action in its header. */
  onActionsChange?: (actions: ReactNode | null) => void;
}) {
  const [hosts, setHosts] = useState<DatabaseHostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | DatabaseHostSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setHosts(await api.admin.databaseHosts(nodeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database hosts');
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [nodeId]);

  function openCreate() {
    setSuccess('');
    setError('');
    setModal('create');
  }

  const addHostButton = (
    <AdminToolButton type="button" onClick={openCreate} primary={embedded}>
      <Plus className="h-3.5 w-3.5" aria-hidden />
      Add host
    </AdminToolButton>
  );

  useEffect(() => {
    if (!onActionsChange) return;
    onActionsChange(addHostButton);
    return () => onActionsChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate when hosts/loading change is unnecessary
  }, [onActionsChange, embedded]);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    setSuccess('');
    try {
      await api.admin.deleteDatabaseHost(nodeId, pendingDeleteId);
      setHosts((current) => current.filter((h) => h.id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete host');
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const databases = hosts.reduce((sum, h) => sum + h.databaseCount, 0);
    const capped = hosts.filter((h) => h.maxDatabases > 0).length;
    return { databases, capped };
  }, [hosts]);

  const pendingHost = pendingDeleteId ? hosts.find((h) => h.id === pendingDeleteId) : null;

  return (
    <div className={embedded ? 'ds-nd-db' : 'ds-nd-db ds-nd-db--standalone rounded-xl border border-[var(--border)] bg-[var(--surface)]/50'}>
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 accent-text" aria-hidden />
              <h3 className="text-sm font-semibold">Database hosts</h3>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              MySQL/MariaDB servers the panel connects to when users create databases on this node.
            </p>
          </div>
          {addHostButton}
        </div>
      ) : null}

      <div className={embedded ? undefined : 'p-4'}>
        <AdminCallout
          tone="info"
          icon={Info}
          title="Panel connects outbound to MySQL"
          description={
            <>
              Use an address the panel can reach — typically this node&apos;s FQDN (
              <span className="font-mono text-[var(--text)]">{nodeFqdn || 'see node settings'}</span>
              ), not <span className="font-mono">127.0.0.1</span> unless MySQL runs on the same machine as
              the panel.
            </>
          }
        />

        {!loading && hosts.length > 0 ? (
          <div className="ds-nd-db-kpis" aria-label="Host summary">
            <div className="ds-nd-db-kpi">
              <span className="ds-nd-db-kpi-label">Hosts</span>
              <strong className="ds-nd-db-kpi-value">{hosts.length}</strong>
            </div>
            <div className="ds-nd-db-kpi">
              <span className="ds-nd-db-kpi-label">Databases</span>
              <strong className="ds-nd-db-kpi-value">{stats.databases}</strong>
            </div>
            <div className="ds-nd-db-kpi">
              <span className="ds-nd-db-kpi-label">Capped hosts</span>
              <strong className="ds-nd-db-kpi-value">{stats.capped}</strong>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="ds-nd-notice ds-nd-notice--success mt-3" role="status">
            <p className="ds-nd-notice-title">{success}</p>
          </div>
        ) : null}

        {error ? (
          <div className="ds-nd-notice ds-nd-notice--danger mt-3" role="alert">
            <p className="ds-nd-notice-title">{error}</p>
          </div>
        ) : null}

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : hosts.length === 0 ? (
            <div className="ds-nd-db-empty">
              <EmptyState
                icon={<Database className="h-5 w-5" />}
                title="No database hosts"
                description="Add a MySQL host so users can create databases for their servers on this node."
                action={
                  <AdminToolButton type="button" onClick={openCreate} primary>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add host
                  </AdminToolButton>
                }
              />
            </div>
          ) : (
            <ul className="ds-nd-db-list">
              {hosts.map((host) => {
                const usageLabel =
                  host.maxDatabases > 0
                    ? `${host.databaseCount} / ${host.maxDatabases}`
                    : `${host.databaseCount}`;
                const usagePct =
                  host.maxDatabases > 0
                    ? Math.min(100, Math.round((host.databaseCount / host.maxDatabases) * 100))
                    : 0;
                const nearCap = host.maxDatabases > 0 && usagePct >= 85;

                return (
                  <li key={host.id}>
                    <article className="ds-nd-db-card">
                      <div className="ds-nd-db-card-accent" aria-hidden />
                      <div className="ds-nd-db-card-icon" aria-hidden>
                        <HardDrive className="h-4 w-4" />
                      </div>
                      <div className="ds-nd-db-card-main min-w-0">
                        <div className="ds-nd-db-card-top">
                          <h3 className="ds-nd-db-card-title truncate">{host.name}</h3>
                          <span
                            className={`ds-nd-db-card-badge${nearCap ? ' ds-nd-db-card-badge--warn' : ''}`}
                          >
                            {host.maxDatabases > 0 ? 'Capped' : 'Unlimited'}
                          </span>
                        </div>
                        <p className="ds-nd-db-card-endpoint truncate font-mono">
                          {host.username}@{host.host}:{host.port}
                        </p>
                        <div className="ds-nd-db-card-meta">
                          <span className="ds-nd-db-card-chip">
                            <Database className="h-3 w-3" aria-hidden />
                            {usageLabel} db
                            {host.databaseCount === 1 && host.maxDatabases === 0 ? '' : 's'}
                          </span>
                          <span className="ds-nd-db-card-chip">
                            <Server className="h-3 w-3" aria-hidden />
                            Port {host.port}
                          </span>
                        </div>
                        {host.maxDatabases > 0 ? (
                          <div className="ds-nd-db-card-meter" aria-hidden>
                            <span
                              className={`ds-nd-db-card-meter-fill${nearCap ? ' ds-nd-db-card-meter-fill--warn' : ''}`}
                              style={{ width: `${Math.max(usagePct > 0 ? 4 : 0, usagePct)}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="ds-nd-db-card-actions">
                        <AdminToolButton
                          type="button"
                          onClick={() => {
                            setSuccess('');
                            setError('');
                            setModal(host);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </AdminToolButton>
                        <AdminToolButton
                          type="button"
                          disabled={deletingId === host.id}
                          onClick={() => setPendingDeleteId(host.id)}
                        >
                          {deletingId === host.id ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                          Delete
                        </AdminToolButton>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {modal === 'create' ? (
        <DatabaseHostModal
          nodeFqdn={nodeFqdn}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            const created = await api.admin.createDatabaseHost(nodeId, data as CreateDatabaseHostInput);
            setHosts((current) =>
              [...current.filter((h) => h.id !== created.id), created].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
            );
            setModal(null);
            setSuccess(`Database host "${created.name}" added.`);
            setError('');
          }}
          onTest={async (data) => api.admin.testDatabaseHostConnection(nodeId, data)}
        />
      ) : null}

      {modal && modal !== 'create' ? (
        <DatabaseHostModal
          nodeFqdn={nodeFqdn}
          host={modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            const updated = await api.admin.updateDatabaseHost(
              nodeId,
              modal.id,
              data as UpdateDatabaseHostInput,
            );
            setHosts((current) =>
              current
                .map((h) => (h.id === updated.id ? updated : h))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
            setModal(null);
            setSuccess(`Database host "${updated.name}" updated.`);
            setError('');
          }}
          onTest={async (data) => api.admin.testDatabaseHostConnection(nodeId, data)}
        />
      ) : null}

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Delete this database host?"
        description={
          pendingHost
            ? `Remove “${pendingHost.name}”? Servers will no longer create databases on this host. Existing MySQL databases are not deleted.`
            : 'Servers will no longer be able to create databases on this host. Existing databases are not removed from MySQL.'
        }
        confirmLabel="Delete host"
        tone="danger"
        loading={deletingId !== null}
        onClose={() => {
          if (!deletingId) setPendingDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function DatabaseHostModal({
  nodeFqdn,
  host,
  onClose,
  onSave,
  onTest,
}: {
  nodeFqdn?: string;
  host?: DatabaseHostSummary;
  onClose: () => void;
  onSave: (data: CreateDatabaseHostInput | UpdateDatabaseHostInput) => Promise<void>;
  onTest: (data: ConnectionCreds) => Promise<{ ok: boolean }>;
}) {
  const isEdit = Boolean(host);
  const defaultHost = nodeFqdn?.trim() || '';
  const verifiedCredsRef = useRef<ConnectionCreds | null>(null);

  const [form, setForm] = useState({
    name: host?.name ?? (defaultHost ? `${defaultHost} MySQL` : 'Node MySQL'),
    host: host?.host ?? defaultHost,
    port: host?.port ?? 3306,
    username: host?.username ?? 'root',
    password: '',
    maxDatabases: host?.maxDatabases ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [testOk, setTestOk] = useState(false);

  const endpointPreview = `${form.username.trim() || 'user'}@${form.host.trim() || 'host'}:${form.port || 3306}`;
  const createStep = !isEdit ? (testOk ? 2 : 1) : null;

  function invalidateTest() {
    verifiedCredsRef.current = null;
    setTestOk(false);
  }

  function resolvePassword(): string {
    if (form.password.trim()) return form.password;
    if (verifiedCredsRef.current?.password) return verifiedCredsRef.current.password;
    return '';
  }

  function buildConnectionCreds(): ConnectionCreds {
    const password = resolvePassword();
    if (!form.host.trim() || !form.username.trim()) {
      throw new Error('Host and username are required');
    }
    if (!password) {
      throw new Error(isEdit ? 'Enter the admin password to test or save' : 'Enter the admin password');
    }
    return {
      host: form.host.trim(),
      port: form.port || 3306,
      username: form.username.trim(),
      password,
    };
  }

  async function handleTest() {
    setTesting(true);
    setError('');
    try {
      const creds = buildConnectionCreds();
      await onTest(creds);
      verifiedCredsRef.current = creds;
      setTestOk(true);
    } catch (err) {
      invalidateTest();
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (isEdit && host) {
        const payload: UpdateDatabaseHostInput = {
          name: form.name.trim(),
          maxDatabases: form.maxDatabases,
        };
        const password = form.password.trim();
        const connectionChanged =
          form.host.trim() !== host.host ||
          (form.port || 3306) !== host.port ||
          form.username.trim() !== host.username ||
          password.length > 0;

        if (connectionChanged) {
          const creds = buildConnectionCreds();
          payload.host = creds.host;
          payload.port = creds.port;
          payload.username = creds.username;
          payload.password = creds.password;
        }

        await onSave(payload);
        return;
      }

      if (!testOk) {
        throw new Error('Run Test connection before adding this host');
      }

      const creds = buildConnectionCreds();
      const payload: CreateDatabaseHostInput = {
        name: form.name.trim(),
        host: creds.host,
        port: creds.port,
        username: creds.username,
        password: creds.password,
        maxDatabases: form.maxDatabases,
      };

      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save database host');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      wide
      header={
        <div className="ds-nd-db-modal-header relative overflow-hidden border-b border-[var(--border)] pr-12">
          <div className="ds-nd-db-modal-header-glow" aria-hidden />
          <div className="relative flex items-start gap-3 px-5 py-5">
            <div className="ds-nd-db-modal-mark" aria-hidden>
              <Database className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="ds-nd-db-modal-eyebrow">{isEdit ? 'Database host' : 'New MySQL host'}</p>
              <h2 className="text-base font-bold tracking-tight">
                {isEdit ? 'Edit database host' : 'Add database host'}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {isEdit
                  ? 'Update identity, connection, or capacity. Credentials stay encrypted.'
                  : 'Test the connection from the panel, then save. Credentials are stored encrypted.'}
              </p>
            </div>
          </div>
          {!isEdit ? (
            <ol className="ds-nd-db-modal-steps" aria-label="Add host steps">
              <li className={`ds-nd-db-modal-step${createStep === 1 ? ' is-active' : ''}${testOk ? ' is-done' : ''}`}>
                <span className="ds-nd-db-modal-step-num" aria-hidden>
                  {testOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
                </span>
                <span>Test connection</span>
              </li>
              <li className={`ds-nd-db-modal-step${createStep === 2 ? ' is-active' : ''}`}>
                <span className="ds-nd-db-modal-step-num" aria-hidden>
                  2
                </span>
                <span>Save host</span>
              </li>
            </ol>
          ) : null}
        </div>
      }
      footer={
        <div className="ds-nd-db-modal-footer">
          <div className="ds-nd-db-modal-footer-status min-w-0">
            {testOk ? (
              <span className="ds-nd-db-modal-footer-ok">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Connection verified
              </span>
            ) : !isEdit ? (
              <span className="ds-nd-db-modal-footer-hint">Test connection before saving</span>
            ) : (
              <span className="ds-nd-db-modal-footer-hint">Leave password blank unless changing it</span>
            )}
          </div>
          <div className="ds-nd-db-modal-footer-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="subtle" disabled={testing || saving} onClick={() => void handleTest()}>
              {testing ? <Spinner className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button
              type="button"
              disabled={saving || testing || (!isEdit && !testOk)}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add host'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="ds-nd-db-modal-body">
        <section className="ds-nd-db-modal-section">
          <header className="ds-nd-db-modal-section-head">
            <span className="ds-nd-db-modal-section-icon" aria-hidden>
              <HardDrive className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="ds-nd-db-modal-section-title">Identity</h3>
              <p className="ds-nd-db-modal-section-desc">Label shown in admin and server database pickers</p>
            </div>
          </header>
          <Input
            label="Display name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Production MySQL"
            required
          />
        </section>

        <section className="ds-nd-db-modal-section ds-nd-db-modal-section--connection">
          <header className="ds-nd-db-modal-section-head">
            <span className="ds-nd-db-modal-section-icon" aria-hidden>
              <Wifi className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="ds-nd-db-modal-section-title">Connection</h3>
              <p className="ds-nd-db-modal-section-desc">Reachable from the panel server, not localhost unless co-located</p>
            </div>
          </header>

          <div className="ds-nd-db-modal-endpoint" aria-live="polite">
            <span className="ds-nd-db-modal-endpoint-label">Endpoint</span>
            <code className="ds-nd-db-modal-endpoint-value truncate">{endpointPreview}</code>
          </div>

          <div className="ds-nd-db-modal-grid">
            <div className="ds-nd-db-modal-span">
              <Input
                label="MySQL host"
                value={form.host}
                onChange={(e) => {
                  setForm({ ...form, host: e.target.value });
                  invalidateTest();
                }}
                placeholder={defaultHost || 'mysql.example.com'}
                required
              />
              {defaultHost ? (
                <div className="ds-nd-db-modal-fqdn-row">
                  <button
                    type="button"
                    className={`ds-nd-db-modal-fqdn-btn${form.host === defaultHost ? ' is-active' : ''}`}
                    onClick={() => {
                      setForm({ ...form, host: defaultHost });
                      invalidateTest();
                    }}
                  >
                    Use node FQDN
                    <span className="font-mono">{defaultHost}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <Input
              label="Port"
              type="number"
              value={String(form.port)}
              onChange={(e) => {
                setForm({ ...form, port: Number(e.target.value) || 3306 });
                invalidateTest();
              }}
              required
            />
            <Input
              label="Admin username"
              value={form.username}
              onChange={(e) => {
                setForm({ ...form, username: e.target.value });
                invalidateTest();
              }}
              placeholder="root"
              required
            />
            <div className="ds-nd-db-modal-span">
              <Input
                label="Admin password"
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  invalidateTest();
                }}
                placeholder={isEdit ? 'Required to test or save connection changes' : 'Required'}
                autoComplete="new-password"
                required={!isEdit}
              />
            </div>
          </div>
        </section>

        <section className="ds-nd-db-modal-section">
          <header className="ds-nd-db-modal-section-head">
            <span className="ds-nd-db-modal-section-icon" aria-hidden>
              <Database className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="ds-nd-db-modal-section-title">Capacity</h3>
              <p className="ds-nd-db-modal-section-desc">Optional cap on databases created through the panel</p>
            </div>
          </header>
          <Input
            label="Max databases on this host"
            type="number"
            min={0}
            value={String(form.maxDatabases)}
            onChange={(e) => setForm({ ...form, maxDatabases: Math.max(0, Number(e.target.value) || 0) })}
            hint="0 = unlimited"
          />
        </section>

        {testOk ? (
          <div className="ds-nd-db-modal-banner ds-nd-db-modal-banner--ok" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="ds-nd-db-modal-banner-title">Connected successfully</p>
              <p className="ds-nd-db-modal-banner-desc">You can save this host now.</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="ds-nd-db-modal-banner ds-nd-db-modal-banner--error" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="ds-nd-db-modal-banner-title">Couldn&apos;t continue</p>
              <p className="ds-nd-db-modal-banner-desc">{error}</p>
            </div>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
