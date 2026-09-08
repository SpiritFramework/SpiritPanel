import { UserPlus } from 'lucide-react';
import { Button, Input } from '../../Layout';
import { SubuserPermissionGrid } from './SubuserPermissionGrid';
import { togglePermission } from '../../../lib/subuser-utils';

export function SubusersInvitePanel({
  email,
  permissions,
  adding,
  onEmailChange,
  onPermissionsChange,
  onSubmit,
}: {
  email: string;
  permissions: string[];
  adding: boolean;
  onEmailChange: (value: string) => void;
  onPermissionsChange: (permissions: string[]) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="ds-srv-sub-invite" id="subusers-invite-panel">
      <div className="ds-srv-sub-invite-header">
        <UserPlus className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-sub-invite-title">Invite subuser</h3>
          <p className="ds-srv-sub-invite-meta">User must already have a panel account</p>
        </div>
      </div>

      <form
        className="ds-srv-sub-invite-body"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Input
          label="User email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="user@example.com"
          required
        />

        <SubuserPermissionGrid
          permissions={permissions}
          onToggle={(key, checked) => onPermissionsChange(togglePermission(permissions, key, checked))}
        />

        <div className="ds-srv-sub-invite-actions">
          <Button type="submit" disabled={adding || !email.trim()}>
            <UserPlus className="h-3.5 w-3.5" />
            {adding ? 'Adding…' : 'Add subuser'}
          </Button>
        </div>
      </form>
    </section>
  );
}
