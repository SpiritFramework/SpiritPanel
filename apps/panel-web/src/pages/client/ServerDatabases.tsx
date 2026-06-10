import { useEffect, useState } from 'react';
import { Check, Copy, Database, Eye, EyeOff, Plus, Server, Trash2 } from 'lucide-react';
import { api, type ServerDatabaseSummary, type ServerResourceQuotaResponse } from '../../lib/api';
import { useServer } from '../../context/ServerContext';
import { useServerRouteId } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import { CreateDatabaseModal } from '../../components/CreateDatabaseModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ResourceQuotaStrip } from '../../components/server/ResourceQuotaStrip';
import { Button } from '../../components/Layout';
import {
  ServerErrorBanner,
  ServerLoadingBlock,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
  ServerToolbarButton,
} from '../../components/server/ServerPage';
import { EmptyState, StatCard } from '../../components/ui';

export function ServerDatabasesPage() {
  const id = useServerRouteId();
  const { server } = useServer();
  const access = getServerAccess(server);
  const [data, setData] = useState<ServerResourceQuotaResponse<ServerDatabaseSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServerDatabaseSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  const databases = data?.items ?? [];
  const limit = data?.limit ?? server.databaseLimit ?? 0;
  const used = data?.used ?? databases.length;
  const canCreate = data?.canCreate ?? access.canCreateDatabases;
  const atLimit = used >= limit;

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
      if (expandedId === deleteTarget.id) setExpandedId(null);
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
        description="MySQL databases for plugins and server data"
        actions={
          access.canCreateDatabases && canCreate ? (
            <Button size="sm" disabled={loading} onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New database
            </Button>
          ) : undefined
        }
      />

      <ServerErrorBanner message={error} />

      {!loading && (
        <>
          <ResourceQuotaStrip
            label="Databases"
            used={used}
            limit={limit}
            canCreate={canCreate}
            icon={<Database className="h-3.5 w-3.5" />}
          />

          {databases.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Databases used"
                value={`${used} / ${limit}`}
                hint={limit === 0 ? 'Databases disabled (limit 0)' : `${Math.max(0, limit - used)} slots remaining`}
                icon={<Database className="h-3.5 w-3.5" />}
                tone={atLimit ? 'warning' : 'default'}
              />
              <StatCard
                label="Connection type"
                value="MySQL"
                hint="Credentials generated automatically on create"
                icon={<Server className="h-3.5 w-3.5" />}
              />
            </div>
          )}
        </>
      )}

      {!access.canCreateDatabases && !loading && databases.length === 0 && (
        <ServerNotice tone="muted">You can view databases but do not have permission to create them.</ServerNotice>
      )}

      {!loading && databases.length === 0 && canCreate && (
        <ServerNotice tone="muted">
          No MySQL databases yet. Your host must configure a database host on this node before you can create one.
        </ServerNotice>
      )}

      <ServerPanel
        icon={Database}
        iconTone="cyan"
        title="MySQL databases"
        description={
          loading
            ? 'Loading…'
            : `${used} of ${limit} databases`
        }
        noPadding
      >
        {loading ? (
          <ServerLoadingBlock />
        ) : databases.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title="No databases"
              description="Create a MySQL database for plugins like LuckPerms, Dynmap, or custom integrations."
              action={
                access.canCreateDatabases && canCreate ? (
                  <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first database
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="resource-list">
            {databases.map((db) => (
              <DatabaseRow
                key={db.id}
                database={db}
                expanded={expandedId === db.id}
                deleting={deletingId === db.id}
                canDelete={access.canDeleteDatabases}
                canViewPassword={access.canViewDatabasePassword}
                onToggle={() => setExpandedId((cur) => (cur === db.id ? null : db.id))}
                onDelete={() => setDeleteTarget(db)}
              />
            ))}
          </ul>
        )}
      </ServerPanel>

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

function DatabaseRow({
  database,
  expanded,
  deleting,
  canDelete,
  canViewPassword,
  onToggle,
  onDelete,
}: {
  database: ServerDatabaseSummary;
  expanded: boolean;
  deleting: boolean;
  canDelete: boolean;
  canViewPassword: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const jdbc = `jdbc:mysql://${database.host}:${database.port}/${database.database}`;

  return (
    <li className="resource-list-item resource-list-item--stacked">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className="resource-list-icon resource-list-icon--info">
            <Database className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{database.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
              {database.host}:{database.port} · {database.database}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{database.hostName}</p>
          </div>
        </button>

        <div className="resource-row-actions flex shrink-0 flex-wrap items-center gap-1.5">
          <ServerToolbarButton
            icon={Copy}
            label={expanded ? 'Hide details' : 'Connection details'}
            onClick={onToggle}
            active={expanded}
          />
          {canDelete && (
            <button type="button" disabled={deleting} onClick={onDelete} className="resource-delete-btn">
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="resource-detail-panel">
          <dl className="grid gap-2 sm:grid-cols-2">
            <DetailRow
              label="Host"
              value={`${database.host}:${database.port}`}
              onCopy={() => copy(`${database.host}:${database.port}`, 'host')}
              copied={copied === 'host'}
            />
            <DetailRow
              label="Database"
              value={database.database}
              mono
              onCopy={() => copy(database.database, 'db')}
              copied={copied === 'db'}
            />
            <DetailRow
              label="Username"
              value={database.username}
              mono
              onCopy={() => copy(database.username, 'user')}
              copied={copied === 'user'}
            />
            <DetailRow
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
              mono
              onCopy={canViewPassword && database.password ? () => copy(database.password!, 'pass') : undefined}
              copied={copied === 'pass'}
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
            <DetailRow label="Remote access" value={database.remote} mono />
            <DetailRow label="Host pool" value={database.hostName} />
          </dl>

          <div className="resource-jdbc-box">
            <p className="resource-jdbc-label">JDBC connection string</p>
            <div className="mt-1 flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{jdbc}</code>
              <CopyBtn onClick={() => copy(jdbc, 'jdbc')} copied={copied === 'jdbc'} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function DetailRow({
  label,
  value,
  mono,
  onCopy,
  copied,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="resource-detail-field">
      <dt className="resource-detail-label">{label}</dt>
      <dd className="mt-1 flex items-center gap-1">
        <span className={`min-w-0 flex-1 truncate text-sm ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</span>
        {trailing}
        {onCopy && <CopyBtn onClick={onCopy} copied={copied} />}
      </dd>
    </div>
  );
}

function CopyBtn({ onClick, copied }: { onClick: () => void; copied?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:accent-text">
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
