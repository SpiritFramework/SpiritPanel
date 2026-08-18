import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Link2,
  Plus,
  Server,
  Trash2,
} from 'lucide-react';
import { api, type ServerDatabaseSummary, type ServerResourceQuotaResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import { formatActivityTime } from '../../lib/activity';
import { CreateDatabaseModal } from '../../components/CreateDatabaseModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ResourceQuotaStrip } from '../../components/server/ResourceQuotaStrip';
import { Button } from '../../components/Layout';
import {
  ServerErrorBanner,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
} from '../../components/server/ServerPage';
import { EmptyState, Spinner, StatCard } from '../../components/ui';

function remoteLabel(remote: string): string {
  if (remote === '%') return 'Anywhere';
  if (remote === 'localhost' || remote === '127.0.0.1') return 'Local only';
  return remote;
}

export function ServerDatabasesPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);
  const [data, setData] = useState<ServerResourceQuotaResponse<ServerDatabaseSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServerDatabaseSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  const databases = data?.items ?? [];
  const limit = data?.limit ?? server.databaseLimit ?? 0;
  const used = data?.used ?? databases.length;
  const canCreate = data?.canCreate ?? access.canCreateDatabases;
  const atLimit = limit > 0 && used >= limit;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;

  const hostPools = useMemo(
    () => [...new Set(databases.map((db) => db.hostName).filter(Boolean))],
    [databases],
  );

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setData(await api.client.databases(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeletingId(deleteTarget.id);
    setError('');
    try {
      await api.client.deleteDatabase(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete database');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  }

  return (
    <ServerPage>
      <ServerPageHeader
        title="Databases"
        description={`MySQL databases for plugins and integrations on ${server.name}`}
        actions={
          access.canCreateDatabases && canCreate ? (
            <Button type="button" size="sm" disabled={loading || atLimit} onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New database
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {!loading && databases.length > 0 && (
        <section className="database-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
                <Link2 className="h-4 w-4 text-cyan-400" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Connect from your server</h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Use these credentials in plugin configs — host is reachable from your game container
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <QuickConnectCard
              icon={Database}
              tone="mysql"
              label="MySQL endpoint"
              value={`${databases[0].host}:${databases[0].port}`}
              detail={databases[0].hostName}
              hint="Same host for all databases on this server unless your host uses multiple pools"
            />
            <QuickConnectCard
              icon={KeyRound}
              tone="auth"
              label="Authentication"
              value="Username + password per database"
              detail={`${databases.length} database${databases.length === 1 ? '' : 's'} provisioned`}
              hint="Each database has its own user — expand a card below for full credentials"
            />
          </div>
        </section>
      )}

      {!loading && (
        <>
          <ResourceQuotaStrip
            label="Databases"
            used={used}
            limit={limit}
            canCreate={canCreate}
            icon={<Database className="h-3.5 w-3.5" />}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Databases used"
              value={`${used} / ${limit}`}
              hint={limit === 0 ? 'Databases disabled (limit 0)' : `${Math.max(0, limit - used)} slots remaining`}
              icon={<Database className="h-3.5 w-3.5" />}
              tone={atLimit ? 'warning' : 'default'}
            />
            <StatCard
              label="Engine"
              value="MySQL"
              hint="MariaDB-compatible · credentials auto-generated"
              icon={<Server className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Host pool"
              value={hostPools.length === 1 ? hostPools[0] : hostPools.length > 1 ? `${hostPools.length} pools` : '—'}
              hint={hostPools.length > 1 ? hostPools.join(', ') : 'Database server on your node'}
              icon={<Globe className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="database-panel rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="text-[var(--muted)]">Database capacity</span>
              <span className="font-medium tabular-nums">
                {used} / {limit} databases
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className={`h-full rounded-full transition-all ${
                  atLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </>
      )}

      {!access.canCreateDatabases && !loading && databases.length === 0 && (
        <ServerNotice tone="muted">You can view databases but do not have permission to create them.</ServerNotice>
      )}

      {!loading && limit === 0 && (
        <ServerNotice tone="warning">
          Database creation is disabled on this server. Contact your administrator to enable MySQL databases.
        </ServerNotice>
      )}

      <section className="database-panel overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <Database className="h-4 w-4 text-cyan-400" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Your databases</h3>
              <p className="text-[11px] text-[var(--muted)]">
                {loading ? 'Loading…' : `${used} of ${limit} · LuckPerms, Dynmap, and custom plugins`}
              </p>
            </div>
          </div>
          {access.canCreateDatabases && canCreate && databases.length > 0 && (
            <Button type="button" size="sm" variant="ghost" disabled={atLimit} onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add database
            </Button>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-14">
              <Spinner className="h-6 w-6" />
            </div>
          ) : databases.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={<Database className="h-5 w-5" />}
                title="No databases yet"
                description="Create a MySQL database for plugin storage, web integrations, or server data that persists outside your world files."
                action={
                  access.canCreateDatabases && canCreate && limit > 0 ? (
                    <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      Create first database
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {databases.map((db) => (
                <DatabaseCard
                  key={db.id}
                  database={db}
                  deleting={deletingId === db.id}
                  canDelete={access.canDeleteDatabases}
                  canViewPassword={access.canViewDatabasePassword}
                  onDelete={() => setDeleteTarget(db)}
                />
              ))}
            </div>
          )}

          {data && !data.canCreate && access.canCreateDatabases && databases.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              {limit === 0
                ? 'Database creation is disabled on this server (limit 0).'
                : `Database limit reached (${limit}). Delete an existing database to free a slot.`}
            </p>
          )}
        </div>
      </section>

      {showCreate && (
        <CreateDatabaseModal
          onClose={() => setShowCreate(false)}
          databaseCount={used}
          databaseLimit={limit}
          canCreate={canCreate}
          onCreate={async (payload) => {
            await api.client.createDatabase(id, payload);
            await load();
          }}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete this database?"
        detail={deleteTarget?.name}
        description="This permanently removes the MySQL database and user from the host. Any plugins using these credentials will stop working."
        confirmLabel="Delete database"
        tone="danger"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </ServerPage>
  );
}

function QuickConnectCard({
  icon: Icon,
  tone,
  label,
  value,
  detail,
  hint,
}: {
  icon: typeof Database;
  tone: 'mysql' | 'auth';
  label: string;
  value: string;
  detail: string;
  hint: string;
}) {
  const toneStyles = {
    mysql: 'bg-cyan-500/15 text-cyan-400',
    auth: 'bg-violet-500/15 text-violet-400',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="break-all font-mono text-sm font-medium leading-relaxed">{value}</p>
      <p className="mt-2 truncate text-[11px] text-[var(--muted)]">{detail}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function DatabaseCard({
  database,
  deleting,
  canDelete,
  canViewPassword,
  onDelete,
}: {
  database: ServerDatabaseSummary;
  deleting: boolean;
  canDelete: boolean;
  canViewPassword: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const jdbc = `jdbc:mysql://${database.host}:${database.port}/${database.database}`;
  const endpoint = `${database.host}:${database.port}`;

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function copyAll() {
    const lines = [
      `Host: ${endpoint}`,
      `Database: ${database.database}`,
      `Username: ${database.username}`,
      canViewPassword && database.password ? `Password: ${database.password}` : 'Password: (hidden)',
      `Remote: ${database.remote}`,
      `JDBC: ${jdbc}`,
    ];
    await copy(lines.join('\n'), 'all');
  }

  return (
    <article
      className={`database-card group overflow-hidden rounded-xl border transition ${
        expanded
          ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[var(--accent-muted)]/10'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/30 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:bg-[var(--surface-hover)]/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              <Database className="h-3 w-3" />
              MySQL
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              {remoteLabel(database.remote)}
            </span>
            <span className="font-mono text-[10px] text-[var(--muted)]">{database.hostName}</span>
          </div>

          <h3 className="text-base font-semibold tracking-tight">{database.name}</h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm text-[var(--text)]">{database.database}</p>
            <span className="text-[var(--muted)]">@</span>
            <p className="font-mono text-sm text-[var(--muted)]">{endpoint}</p>
            <CopyButton
              label="Copy endpoint"
              copied={copiedKey === 'endpoint'}
              onCopy={() => copy(endpoint, 'endpoint')}
            />
          </div>

          <p className="mt-1.5 text-[10px] text-[var(--muted)]">
            Created {formatActivityTime(database.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <CopyButton label="Copy all credentials" copied={copiedKey === 'all'} onCopy={copyAll} prominent />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition hover:accent-text"
            aria-expanded={expanded}
          >
            {expanded ? 'Collapse' : 'Credentials'}
            <ChevronDown className={`h-3 w-3 transition ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {canDelete && (
            <button
              type="button"
              title="Delete database"
              disabled={deleting}
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 p-1.5 text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)]/60 px-4 pb-4 pt-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CredentialField
              label="Host"
              value={endpoint}
              copied={copiedKey === 'host'}
              onCopy={() => copy(endpoint, 'host')}
            />
            <CredentialField
              label="Database"
              value={database.database}
              copied={copiedKey === 'db'}
              onCopy={() => copy(database.database, 'db')}
            />
            <CredentialField
              label="Username"
              value={database.username}
              copied={copiedKey === 'user'}
              onCopy={() => copy(database.username, 'user')}
            />
            <CredentialField
              label="Password"
              value={
                !canViewPassword
                  ? 'No permission'
                  : database.password
                    ? showPassword
                      ? database.password
                      : '••••••••••••'
                    : 'Hidden'
              }
              masked={canViewPassword && !!database.password && !showPassword}
              copied={copiedKey === 'pass'}
              onCopy={canViewPassword && database.password ? () => copy(database.password!, 'pass') : undefined}
              trailing={
                canViewPassword && database.password ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="rounded-md p-1 text-[var(--muted)] hover:text-[var(--text)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                ) : undefined
              }
            />
            <CredentialField label="Remote access" value={database.remote} hint={remoteLabel(database.remote)} />
            <CredentialField label="Host pool" value={database.hostName} />
          </div>

          <div className="database-jdbc-box mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                JDBC connection string
              </p>
              <CopyButton label="Copy JDBC" copied={copiedKey === 'jdbc'} onCopy={() => copy(jdbc, 'jdbc')} />
            </div>
            <code className="block break-all font-mono text-[11px] leading-relaxed text-[var(--text)]">{jdbc}</code>
          </div>
        </div>
      )}
    </article>
  );
}

function CredentialField({
  label,
  value,
  hint,
  masked,
  copied,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  hint?: string;
  masked?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="database-credential-field">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
        <div className="flex items-center gap-0.5">
          {trailing}
          {onCopy && <CopyButton label={`Copy ${label.toLowerCase()}`} copied={copied} onCopy={onCopy} compact />}
        </div>
      </div>
      <dd className={`mt-1 truncate font-mono text-[12px] ${masked ? 'tracking-widest text-[var(--muted)]' : ''}`}>
        {value}
      </dd>
      {hint && hint !== value && <p className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onCopy,
  prominent,
  compact,
}: {
  label: string;
  copied?: boolean;
  onCopy: () => void;
  prominent?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onCopy}
      className={`inline-flex items-center gap-1 rounded-md border font-medium transition ${
        compact ? 'border-transparent p-1 text-[var(--muted)] hover:accent-text' : 'px-2 py-1 text-[10px]'
      } ${
        copied
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : prominent
            ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:accent-text'
            : compact
              ? ''
              : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:accent-text'
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          {!compact && 'Copied'}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {!compact && 'Copy'}
        </>
      )}
    </button>
  );
}
