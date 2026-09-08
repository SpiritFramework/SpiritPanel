import { Search, Users } from 'lucide-react';
import { EmptyState, Spinner } from '../../ui';
import type { SubuserSummary } from '../../../lib/subuser-utils';
import { SubuserRow } from './SubuserRow';

export function SubusersListPanel({
  loading,
  error,
  subusers,
  filteredSubusers,
  search,
  hasSearch,
  editingId,
  editPermissions,
  savingEdit,
  onSearchChange,
  onToggleEdit,
  onCancelEdit,
  onEditPermissionsChange,
  onSaveEdit,
  onRemove,
}: {
  loading: boolean;
  error: string;
  subusers: SubuserSummary[];
  filteredSubusers: SubuserSummary[];
  search: string;
  hasSearch: boolean;
  editingId: string | null;
  editPermissions: string[];
  savingEdit: boolean;
  onSearchChange: (value: string) => void;
  onToggleEdit: (subuser: SubuserSummary) => void;
  onCancelEdit: () => void;
  onEditPermissionsChange: (permissions: string[]) => void;
  onSaveEdit: (subuserId: string) => void;
  onRemove: (subuser: SubuserSummary) => void;
}) {
  return (
    <section className="ds-srv-sub-panel">
      <div className="ds-srv-sub-panel-head">
        <Users className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-sub-panel-title">People with access</h3>
          <p className="ds-srv-sub-panel-meta">Manage permissions for users who can access this server</p>
        </div>
      </div>

      <div className="ds-srv-sub-panel-toolbar">
        <div className="ds-srv-sub-search-wrap">
          <Search className="ds-srv-sub-search-icon" aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search subusers…"
            className="ds-srv-sub-search"
          />
        </div>
      </div>

      {error ? <div className="ds-srv-sub-error">{error}</div> : null}

      <div className="ds-srv-sub-panel-body">
        {loading ? (
          <div className="ds-srv-sub-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading subusers…</p>
          </div>
        ) : subusers.length === 0 ? (
          <div className="ds-srv-sub-empty-wrap">
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No subusers yet"
              description="Invite another panel user by email to share access without giving them full ownership."
            />
          </div>
        ) : filteredSubusers.length === 0 ? (
          <div className="ds-srv-sub-empty-wrap">
            <EmptyState title="No matching subusers" description="Try a different search term." />
          </div>
        ) : (
          <ul className="ds-srv-sub-list">
            {filteredSubusers.map((subuser) => (
              <SubuserRow
                key={subuser.id}
                subuser={subuser}
                expanded={editingId === subuser.id}
                saving={savingEdit && editingId === subuser.id}
                editPermissions={editingId === subuser.id ? editPermissions : subuser.permissions}
                onToggleExpand={() => onToggleEdit(subuser)}
                onRemove={() => onRemove(subuser)}
                onEditPermissionsChange={onEditPermissionsChange}
                onCancelEdit={onCancelEdit}
                onSaveEdit={() => onSaveEdit(subuser.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="ds-srv-sub-panel-footer">
        {loading
          ? 'Loading…'
          : hasSearch
            ? `${filteredSubusers.length} of ${subusers.length} subuser${subusers.length === 1 ? '' : 's'}`
            : `${subusers.length} subuser${subusers.length === 1 ? '' : 's'}`}
      </footer>
    </section>
  );
}
