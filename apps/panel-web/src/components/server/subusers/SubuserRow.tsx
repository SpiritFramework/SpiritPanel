import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../Layout';
import { UserAvatar } from '../../UserAvatar';
import type { SubuserSummary } from '../../../lib/subuser-utils';
import { permissionLabel, togglePermission } from '../../../lib/subuser-utils';
import { SubuserPermissionGrid } from './SubuserPermissionGrid';

export function SubuserRow({
  subuser,
  expanded,
  saving,
  editPermissions,
  onToggleExpand,
  onRemove,
  onEditPermissionsChange,
  onCancelEdit,
  onSaveEdit,
}: {
  subuser: SubuserSummary;
  expanded: boolean;
  saving: boolean;
  editPermissions: string[];
  onToggleExpand: () => void;
  onRemove: () => void;
  onEditPermissionsChange: (permissions: string[]) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const previewPermissions = subuser.permissions.slice(0, 4);
  const extraCount = Math.max(0, subuser.permissions.length - previewPermissions.length);

  return (
    <li className={`ds-srv-sub-row${expanded ? ' ds-srv-sub-row--expanded' : ''}`}>
      <span className={`ds-srv-sub-row-accent${expanded ? ' ds-srv-sub-row-accent--expanded' : ''}`} aria-hidden />

      <div className="ds-srv-sub-row-main">
        <UserAvatar user={subuser.user} size="md" ring />

        <div className="ds-srv-sub-row-body">
          <div className="ds-srv-sub-row-top">
            <div className="min-w-0 flex-1">
              <div className="ds-srv-sub-row-badges">
                <span className="ds-srv-sub-badge">
                  {subuser.permissions.length} permission{subuser.permissions.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="ds-srv-sub-row-title">{subuser.user.username}</h3>
              <p className="ds-srv-sub-row-email">{subuser.user.email}</p>
              {!expanded && subuser.permissions.length > 0 ? (
                <div className="ds-srv-sub-row-chips">
                  {previewPermissions.map((key) => (
                    <span key={key} className="ds-srv-sub-chip">
                      {permissionLabel(key)}
                    </span>
                  ))}
                  {extraCount > 0 ? <span className="ds-srv-sub-chip ds-srv-sub-chip--more">+{extraCount} more</span> : null}
                </div>
              ) : null}
            </div>

            <div className="ds-srv-sub-row-actions">
              <button
                type="button"
                className={`ds-srv-sub-row-btn${expanded ? ' ds-srv-sub-row-btn--active' : ''}`}
                onClick={onToggleExpand}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                <span>{expanded ? 'Close' : 'Edit'}</span>
              </button>
              <button type="button" className="ds-srv-sub-row-btn ds-srv-sub-row-btn--danger" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>

          {expanded ? (
            <div className="ds-srv-sub-row-editor">
              <SubuserPermissionGrid
                permissions={editPermissions}
                onToggle={(key, checked) =>
                  onEditPermissionsChange(togglePermission(editPermissions, key, checked))
                }
              />
              <div className="ds-srv-sub-row-editor-actions">
                <Button variant="ghost" type="button" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={onSaveEdit}>
                  {saving ? 'Saving…' : 'Save permissions'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
