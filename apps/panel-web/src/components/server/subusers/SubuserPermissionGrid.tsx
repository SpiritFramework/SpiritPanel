import { Checkbox } from '../../Checkbox';
import {
  ALL_PERMISSION_KEYS,
  groupSelectionState,
  PERMISSION_GROUPS,
  setAllPermissions,
  setGroupPermissions,
  togglePermission,
} from '../../../lib/subuser-utils';

export function SubuserPermissionGrid({
  permissions,
  onChange,
}: {
  permissions: string[];
  onChange: (permissions: string[]) => void;
}) {
  const selectedCount = permissions.filter((p) => ALL_PERMISSION_KEYS.includes(p)).length;
  const allSelected = selectedCount === ALL_PERMISSION_KEYS.length && ALL_PERMISSION_KEYS.length > 0;

  return (
    <div className="ds-srv-sub-perm">
      <div className="ds-srv-sub-perm-toolbar">
        <p className="ds-srv-sub-perm-toolbar-meta">
          <strong>{selectedCount}</strong> of {ALL_PERMISSION_KEYS.length} selected
        </p>
        <div className="ds-srv-sub-perm-toolbar-actions">
          <button
            type="button"
            className="ds-srv-sub-perm-tool-btn"
            disabled={allSelected}
            onClick={() => onChange(setAllPermissions(true))}
          >
            Select all
          </button>
          <button
            type="button"
            className="ds-srv-sub-perm-tool-btn"
            disabled={selectedCount === 0}
            onClick={() => onChange(setAllPermissions(false))}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="ds-srv-sub-perm-grid">
        {PERMISSION_GROUPS.map((group) => {
          const keys = group.items.map((i) => i.key);
          const state = groupSelectionState(permissions, keys);
          return (
            <section key={group.title} className="ds-srv-sub-perm-group">
              <div className="ds-srv-sub-perm-group-head">
                <h4 className="ds-srv-sub-perm-group-title">{group.title}</h4>
                <button
                  type="button"
                  className="ds-srv-sub-perm-group-toggle"
                  onClick={() => onChange(setGroupPermissions(permissions, keys, state !== 'all'))}
                >
                  {state === 'all' ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="ds-srv-sub-perm-items">
                {group.items.map((item) => (
                  <Checkbox
                    key={item.key}
                    label={item.label}
                    description={item.desc}
                    checked={permissions.includes(item.key)}
                    onChange={(checked) => onChange(togglePermission(permissions, item.key, checked))}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
