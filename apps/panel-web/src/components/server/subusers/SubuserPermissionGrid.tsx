import { Checkbox } from '../../Checkbox';
import { PERMISSION_GROUPS } from '../../../lib/subuser-utils';

export function SubuserPermissionGrid({
  permissions,
  onToggle,
}: {
  permissions: string[];
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <div className="ds-srv-sub-perm-grid">
      {PERMISSION_GROUPS.map((group) => (
        <section key={group.title} className="ds-srv-sub-perm-group">
          <h4 className="ds-srv-sub-perm-group-title">{group.title}</h4>
          <div className="ds-srv-sub-perm-items">
            {group.items.map((item) => (
              <Checkbox
                key={item.key}
                label={item.label}
                description={item.desc}
                checked={permissions.includes(item.key)}
                onChange={(checked) => onToggle(item.key, checked)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
