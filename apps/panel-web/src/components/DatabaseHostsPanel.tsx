import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, Pencil, Plus, Trash2, Wifi } from 'lucide-react';
import { api, type CreateDatabaseHostInput, type DatabaseHostSummary, type UpdateDatabaseHostInput } from '../lib/api';
import { Button, Input } from './Layout';
import { ModalShell } from './ModalShell';
import { EmptyState, Spinner } from './ui';

type ConnectionCreds = { host: string; port: number; username: string; password: string };

export function DatabaseHostsPanel({ nodeId, nodeFqdn }: { nodeId: string; nodeFqdn?: string }) {
  const [hosts, setHosts] = useState<DatabaseHostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | DatabaseHostSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    load();
  }, [nodeId]);

  async function handleDelete(hostId: string) {
    if (!confirm('Delete this database host?')) return;
    setDeletingId(hostId);
    setSuccess('');
    try {
      await api.admin.deleteDatabaseHost(nodeId, hostId);
      setHosts((current) => current.filter((h) => h.id !== hostId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete host');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 accent-text" />
            <h3 className="text-sm font-semibold">Database hosts</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            MySQL/MariaDB servers the panel connects to when users create databases on this node.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSuccess('');
            setError('');
            setModal('create');
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add host
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-xs leading-relaxed text-[var(--muted)]">
          <p className="font-medium text-cyan-200/90">Connection is made from the panel server</p>
          <p className="mt-1">
            Use an address the panel can reach — typically this node&apos;s FQDN (
            <span className="font-mono text-[var(--text)]">{nodeFqdn || 'see node settings'}</span>
            ), not <span className="font-mono">127.0.0.1</span> unless MySQL runs on the same machine as the panel.
          </p>
        </div>

        {success && (
          <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : hosts.length === 0 ? (
          <EmptyState
            title="No database hosts"
            description="Add a MySQL host so users can create databases for their servers on this node."
          />
        ) : (
          <div className="space-y-2">
            {hosts.map((host) => (
              <div
                key={host.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{host.name}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">
                    {host.username}@{host.host}:{host.port}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {host.databaseCount} database{host.databaseCount === 1 ? '' : 's'}
                    {host.maxDatabases > 0 ? ` · max ${host.maxDatabases}` : ' · unlimited'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSuccess('');
                      setError('');
                      setModal(host);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={deletingId === host.id}
                    onClick={() => handleDelete(host.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    {deletingId === host.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'create' && (
        <DatabaseHostModal
          nodeFqdn={nodeFqdn}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            const created = await api.admin.createDatabaseHost(nodeId, data as CreateDatabaseHostInput);
            setHosts((current) =>
              [...current.filter((h) => h.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name)),
            );
            setModal(null);
            setSuccess(`Database host "${created.name}" added.`);
            setError('');
          }}
          onTest={async (data) => api.admin.testDatabaseHostConnection(nodeId, data)}
        />
      )}

      {modal && modal !== 'create' && (
        <DatabaseHostModal
          nodeFqdn={nodeFqdn}
          host={modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            const updated = await api.admin.updateDatabaseHost(nodeId, modal.id, data as UpdateDatabaseHostInput);
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
      )}
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

  function connectionMatchesVerified(creds: ConnectionCreds): boolean {
    const verified = verifiedCredsRef.current;
    if (!verified || !testOk) return false;
    return (
      verified.host === creds.host &&
      verified.port === creds.port &&
      verified.username === creds.username &&
      verified.password === creds.password
    );
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
        connectionVerified: connectionMatchesVerified(creds),
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
        <div className="border-b border-[var(--border)] px-5 py-4 pr-12">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit database host' : 'Add database host'}</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Test the connection first, then save. Credentials are stored encrypted.
          </p>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Input
          label="Display name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Production MySQL"
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
            {defaultHost && form.host !== defaultHost && (
              <button
                type="button"
                className="mt-1 text-[11px] accent-text hover:underline"
                onClick={() => {
                  setForm({ ...form, host: defaultHost });
                  invalidateTest();
                }}
              >
                Use node FQDN ({defaultHost})
              </button>
            )}
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
          <div className="sm:col-span-2">
            <Input
              label={isEdit ? 'Admin password' : 'Admin password'}
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                invalidateTest();
              }}
              placeholder={isEdit ? 'Required to test or save connection changes' : undefined}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <Input
            label="Max databases on this host"
            type="number"
            min={0}
            value={String(form.maxDatabases)}
            onChange={(e) => setForm({ ...form, maxDatabases: Math.max(0, Number(e.target.value) || 0) })}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">0 = unlimited databases on this host</p>
        </div>

        {testOk && (
          <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Connected successfully — you can save this host now.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="subtle" disabled={testing || saving} onClick={() => void handleTest()}>
            {testing ? <Spinner className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            Test connection
          </Button>
          <Button type="button" disabled={saving || testing || (!isEdit && !testOk)} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add host'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
