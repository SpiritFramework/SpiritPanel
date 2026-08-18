export function isFullPanelAdmin(user: { role?: string | null; rootAdmin?: boolean } | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || Boolean(user.rootAdmin);
}

export function isStaffOrPanelAdmin(user: { role?: string | null; rootAdmin?: boolean } | null | undefined): boolean {
  if (!user) return false;
  return isFullPanelAdmin(user) || user.role === 'staff';
}

export function roleLabel(user: { role?: string | null; rootAdmin?: boolean } | null | undefined): string {
  if (!user) return 'User';
  if (user.rootAdmin) return 'Root admin';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'staff') return 'Staff';
  return 'User';
}
