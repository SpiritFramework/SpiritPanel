import { Database, Plus, Search } from 'lucide-react';
import { Button } from '../../Layout';
import { EmptyState, Spinner } from '../../ui';
import type { ServerDatabaseSummary } from '../../../lib/api';
import type { getServerAccess } from '../../../lib/server-access';
import { DatabaseRow } from './DatabaseRow';

export function DatabasesListPanel({
  loading,
  error,
  databases,
  filteredDatabases,
  search,
  hasSearch,
  limit,
  canCreateFromApi,
  actioning,
  access,
  onSearchChange,
  onCreate,
  onDelete,
  managerEnabled,
  onOpenManager,
}: {
  loading: boolean;
  error: string;
  databases: ServerDatabaseSummary[];
  filteredDatabases: ServerDatabaseSummary[];
  search: string;
  hasSearch: boolean;
  limit: number;
  canCreateFromApi: boolean;
  actioning: string | null;
  access: ReturnType<typeof getServerAccess>;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (db: ServerDatabaseSummary) => void;
  managerEnabled?: boolean;
  onOpenManager?: (db: ServerDatabaseSummary) => void;
}) {
  const canCreate = access.canCreateDatabases && canCreateFromApi;

  return (
    <section className="ds-srv-db-panel">
      <div className="ds-srv-db-panel-toolbar">
        <div className="ds-srv-db-search-wrap">
          <Search className="ds-srv-db-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search databases…"
            className="ds-srv-db-search"
          />
        </div>
      </div>

      {error ? <div className="ds-srv-db-error">{error}</div> : null}

      {limit === 0 && !loading ? (
        <div className="ds-srv-db-notice ds-srv-db-notice--warning">
          Database creation is disabled on this server. Contact your administrator to enable MySQL databases.
        </div>
      ) : null}

      {!access.canCreateDatabases && !loading && databases.length === 0 ? (
        <div className="ds-srv-db-notice">You can view databases but do not have permission to create them.</div>
      ) : null}

      <div className="ds-srv-db-panel-body">
        {loading ? (
          <div className="ds-srv-db-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading databases…</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="ds-srv-db-empty-wrap">
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title="No databases yet"
              description="Create a MySQL database for plugin storage, web integrations, or data that persists outside your world files."
              action={
                canCreate && limit > 0 ? (
                  <Button type="button" size="sm" onClick={onCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first database
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredDatabases.length === 0 ? (
          <div className="ds-srv-db-empty-wrap">
            <EmptyState title="No matching databases" description="Try a different search term." />
          </div>
        ) : (
          <ul className="ds-srv-db-list">
            {filteredDatabases.map((db) => (
              <DatabaseRow
                key={db.id}
                database={db}
                busy={actioning === db.id}
                canDelete={access.canDeleteDatabases}
                canViewPassword={access.canViewDatabasePassword}
                managerEnabled={managerEnabled}
                onOpenManager={onOpenManager ? () => onOpenManager(db) : undefined}
                onDelete={() => onDelete(db)}
              />
            ))}
          </ul>
        )}
      </div>

      {databases.length > 0 && !canCreateFromApi && access.canCreateDatabases ? (
        <div className="ds-srv-db-limit-banner">
          {limit === 0
            ? 'Database creation is disabled on this server (limit 0).'
            : `Database limit reached (${limit}). Delete an existing database to free a slot.`}
        </div>
      ) : null}

      <footer className="ds-srv-db-panel-footer">
        {loading
          ? 'Loading…'
          : hasSearch
            ? `${filteredDatabases.length} of ${databases.length} database${databases.length === 1 ? '' : 's'}`
            : `${databases.length} database${databases.length === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
