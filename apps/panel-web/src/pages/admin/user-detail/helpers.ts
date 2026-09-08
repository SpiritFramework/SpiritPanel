import type { AdminUserDetail, UpdateAdminUserInput } from '../../../lib/api';
import { displayName } from '../../../components/UserCard';

export type UserDetailTab = 'overview' | 'account' | 'servers' | 'keys' | 'activity';

const TABS: UserDetailTab[] = ['overview', 'account', 'servers', 'keys', 'activity'];

export function readUserDetailTab(value: string | null): UserDetailTab {
  if (value && TABS.includes(value as UserDetailTab)) return value as UserDetailTab;
  return 'overview';
}

export type UserDetailTone = 'active' | 'suspended' | 'admin' | 'staff';

export function getUserDetailTone(detail: AdminUserDetail): UserDetailTone {
  if (detail.suspended) return 'suspended';
  if (detail.role === 'admin') return 'admin';
  if (detail.role === 'staff') return 'staff';
  return 'active';
}

export function userDisplayName(detail: AdminUserDetail): string {
  return displayName(detail);
}

export function formFromUserDetail(detail: AdminUserDetail): UpdateAdminUserInput {
  return {
    email: detail.email,
    username: detail.username,
    firstName: detail.firstName,
    lastName: detail.lastName,
    role: detail.role as 'admin' | 'staff' | 'user',
    suspended: detail.suspended,
  };
}

export function userFormHasChanges(
  detail: AdminUserDetail,
  form: UpdateAdminUserInput,
  newPassword: string,
): boolean {
  if (newPassword.trim()) return true;
  return (
    form.email !== detail.email ||
    form.username !== detail.username ||
    (form.firstName ?? null) !== detail.firstName ||
    (form.lastName ?? null) !== detail.lastName ||
    form.role !== detail.role ||
    (form.suspended ?? false) !== detail.suspended
  );
}
