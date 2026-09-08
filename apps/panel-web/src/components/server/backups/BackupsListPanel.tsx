import { Archive, Plus, Search } from 'lucide-react';
import { Button } from '../../Layout';
import { EmptyState, Spinner } from '../../ui';
import type { ServerBackupSummary } from '../../../lib/api';
import type { BackupFilter } from '../../../lib/backup-utils';
import type { getServerAccess } from '../../../lib/server-access';
import { BackupRow } from './BackupRow';

const FILTER_OPTIONS: { id: BackupFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete' },
  { id: 'pending', label: 'In progress' },
  { id: 'failed', label: 'Failed' },
];

export function BackupsListPanel({
  loading,
  error,
  backups,
  filteredBackups,
  totalCount,
  search,
  filter,
  hasActiveFilters,
  actioning,
  access,
  canCreate,
  onSearchChange,
  onFilterChange,
  onCreate,
  onRestore,
  onDelete,
  onLock,
  onDownload,
}: {
  loading: boolean;
  error: string;
  backups: ServerBackupSummary[];
  filteredBackups: ServerBackupSummary[];
  totalCount: number;
  search: string;
  filter: BackupFilter;
  hasActiveFilters: boolean;
  actioning: string | null;
  access: ReturnType<typeof getServerAccess>;
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: BackupFilter) => void;
  onCreate: () => void;
  onRestore: (backup: ServerBackupSummary) => void;
  onDelete: (backup: ServerBackupSummary) => void;
  onLock: (backup: ServerBackupSummary) => void;
  onDownload: (backup: ServerBackupSummary) => void;
}) {
  return (
    <section className="ds-srv-bk-panel">
      <div className="ds-srv-bk-panel-toolbar">
        <div className="ds-srv-bk-search-wrap">
          <Search className="ds-srv-bk-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search backups…"
            className="ds-srv-bk-search"
          />
        </div>
        <div className="ds-srv-bk-filters" role="group" aria-label="Filter backups">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`ds-srv-bk-filter-btn${filter === opt.id ? ' ds-srv-bk-filter-btn--active' : ''}`}
              aria-pressed={filter === opt.id}
              onClick={() => onFilterChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="ds-srv-bk-error">{error}</div> : null}

      <div className="ds-srv-bk-panel-body">
        {loading ? (
          <div className="ds-srv-bk-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading backups…</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="ds-srv-bk-empty-wrap">
            <EmptyState
              icon={<Archive className="h-5 w-5" />}
              title="No backups yet"
              description={
                access.canCreateBackups && canCreate
                  ? 'Create a backup before major updates, plugin installs, or config changes.'
                  : access.canCreateBackups
                    ? 'You can view backups but cannot create new ones right now.'
                    : 'You can view backups but do not have permission to create them.'
              }
              action={
                access.canCreateBackups && canCreate ? (
                  <Button type="button" size="sm" onClick={onCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Create first backup
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredBackups.length === 0 ? (
          <div className="ds-srv-bk-empty-wrap">
            <EmptyState
              title="No matching backups"
              description={hasActiveFilters ? 'Try a different search or filter.' : 'No backups to show.'}
            />
          </div>
        ) : (
          <ul className="ds-srv-bk-list">
            {filteredBackups.map((backup) => (
              <BackupRow
                key={backup.id}
                backup={backup}
                busy={actioning === backup.id}
                canRestore={access.canCreateBackups}
                canDelete={access.canDeleteBackups}
                onRestore={() => onRestore(backup)}
                onDelete={() => onDelete(backup)}
                onLock={() => onLock(backup)}
                onDownload={() => onDownload(backup)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="ds-srv-bk-panel-footer">
        {loading
          ? 'Loading…'
          : hasActiveFilters
            ? `${filteredBackups.length} of ${totalCount} backup${totalCount === 1 ? '' : 's'}`
            : `${totalCount} backup${totalCount === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
