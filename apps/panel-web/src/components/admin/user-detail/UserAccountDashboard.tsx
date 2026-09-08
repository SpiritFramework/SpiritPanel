import { Ban, Lock, Shield, Trash2, User, UserCog } from 'lucide-react';
import { Button, Input } from '../../Layout';
import { Checkbox } from '../../Checkbox';
import { RoleOption } from '../../RoleOption';
import { AccountStatus, RoleBadge } from '../../UserCard';
import { UserDetailPanel } from './UserDetailShell';
import type { UserDetailController } from '../../../pages/admin/user-detail/useUserDetail';

export function UserAccountDashboard({
  ctrl,
  fullAdmin,
  isSelf,
}: {
  ctrl: UserDetailController;
  fullAdmin: boolean;
  isSelf: boolean;
}) {
  const {
    detail,
    form,
    setForm,
    newPassword,
    setNewPassword,
    saving,
    error,
    confirmDelete,
    setConfirmDelete,
    deleteUser,
  } = ctrl;

  if (!detail) return null;

  return (
    <div className="ds-ud-account">
      <div className="ds-ud-account-grid">
        <UserDetailPanel
          icon={User}
          title="Personal details"
          description="Name, username, and email used across the panel"
        >
          {fullAdmin ? (
            <div className="ds-ud-form-grid">
              <Input
                label="First name"
                value={form.firstName ?? ''}
                onChange={(e) => setForm({ ...form, firstName: e.target.value || null })}
                placeholder="Optional"
              />
              <Input
                label="Last name"
                value={form.lastName ?? ''}
                onChange={(e) => setForm({ ...form, lastName: e.target.value || null })}
                placeholder="Optional"
              />
              <Input
                label="Username"
                value={form.username ?? ''}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          ) : (
            <dl className="ds-ud-readonly-grid">
              <div>
                <dt>First name</dt>
                <dd>{detail.firstName || '—'}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{detail.lastName || '—'}</dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>@{detail.username}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{detail.email}</dd>
              </div>
            </dl>
          )}
        </UserDetailPanel>

        {fullAdmin ? (
          <>
            <UserDetailPanel
              icon={Lock}
              title="Password"
              description="Leave blank to keep the current password"
            >
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </UserDetailPanel>

            <UserDetailPanel
              icon={Shield}
              title="Permissions"
              description="What this user can access in the panel"
            >
              <div className="ds-ud-role-grid">
                <RoleOption
                  active={(form.role ?? 'user') === 'user'}
                  icon={User}
                  title="User"
                  description="Own servers and profile only"
                  onClick={() => setForm({ ...form, role: 'user' })}
                  disabled={isSelf}
                />
                <RoleOption
                  active={(form.role ?? 'user') === 'staff'}
                  icon={UserCog}
                  title="Staff"
                  description="Light admin: tickets, suspend, read-only infra"
                  onClick={() => setForm({ ...form, role: 'staff' })}
                  disabled={isSelf}
                />
                <RoleOption
                  active={(form.role ?? 'user') === 'admin'}
                  icon={Shield}
                  title="Admin"
                  description="Full admin panel access"
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  disabled={isSelf}
                />
              </div>
              {isSelf ? (
                <p className="ds-ud-field-hint">You cannot change your own role.</p>
              ) : null}
            </UserDetailPanel>
          </>
        ) : (
          <UserDetailPanel icon={Shield} title="Permissions" description="Role assigned to this account">
            <RoleBadge role={detail.role} rootAdmin={detail.rootAdmin} />
          </UserDetailPanel>
        )}

        {fullAdmin ? (
          <UserDetailPanel
            icon={Ban}
            title="Account status"
            description="Control whether this user can sign in"
            tone={(form.suspended ?? false) ? 'warning' : undefined}
          >
            <Checkbox
              label="Suspend account"
              description="Suspended users cannot log in and will see a suspension message when they try"
              checked={form.suspended ?? false}
              onChange={(suspended) => setForm({ ...form, suspended })}
              disabled={isSelf}
            />
            {isSelf ? (
              <p className="ds-ud-field-hint">You cannot suspend your own account.</p>
            ) : null}
            {(form.suspended ?? false) && !isSelf ? (
              <p className="ds-ud-field-warning">
                This user will be blocked from logging in until unsuspended.
              </p>
            ) : null}
          </UserDetailPanel>
        ) : (
          <UserDetailPanel icon={Ban} title="Account status" description="Whether this user can sign in">
            <AccountStatus suspended={detail.suspended} />
          </UserDetailPanel>
        )}

        {fullAdmin && !isSelf ? (
          <UserDetailPanel
            icon={Trash2}
            title="Danger zone"
            description="Permanently remove this account — this cannot be undone"
            tone="danger"
          >
            {!confirmDelete ? (
              <div className="ds-ud-danger-row">
                <p className="ds-ud-danger-copy">
                  {detail.serverCount > 0
                    ? `Delete ${detail.serverCount} owned server(s) before removing this user.`
                    : (
                      <>
                        Delete <strong>@{detail.username}</strong> and revoke all access immediately.
                      </>
                    )}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  disabled={detail.serverCount > 0}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete user
                </Button>
              </div>
            ) : (
              <div className="ds-ud-danger-confirm">
                <p>Permanently delete <strong>{detail.username}</strong>?</p>
                <div className="ds-ud-danger-actions">
                  <Button type="button" variant="danger" disabled={saving} onClick={() => void deleteUser()}>
                    Yes, delete permanently
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
                {error ? <p className="ds-ud-danger-error">{error}</p> : null}
              </div>
            )}
          </UserDetailPanel>
        ) : null}
      </div>
    </div>
  );
}
