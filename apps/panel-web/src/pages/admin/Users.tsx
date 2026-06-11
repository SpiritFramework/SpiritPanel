import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Shield, User, Users } from 'lucide-react';
import { api, type AdminUserSummary } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { AdminLayout, Button, Card, FilterSelect, Page } from '../../components/Layout';
import { CreateUserModal } from '../../components/CreateUserModal';
import { AdminUserTable } from '../../components/AdminUserRow';
import { DsIcon, EmptyState, PageHeader, Skeleton, StatCard } from '../../components/ui';

type RoleFilter = 'all' | 'admin' | 'user';
type StatusFilter = 'all' | 'active' | 'suspended';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = `admin-users|${debouncedSearch}|${roleFilter}|${statusFilter}`;

  const fetchUsers = useCallback(
    () =>
      api.admin.users({
        search: debouncedSearch || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        suspended:
          statusFilter === 'all' ? undefined : statusFilter === 'suspended' ? 'true' : 'false',
      }),
    [debouncedSearch, roleFilter, statusFilter],
  );

  const { data: users, loading, refetch } = useAsyncData<AdminUserSummary[]>(queryKey, fetchUsers, [
    debouncedSearch,
    roleFilter,
    statusFilter,
  ]);

  const list = users ?? [];

  const stats = useMemo(
    () => ({
      total: list.length,
      admins: list.filter((u) => u.role === 'admin').length,
      active: list.filter((u) => !u.suspended).length,
      suspended: list.filter((u) => u.suspended).length,
    }),
    [list],
  );

  return (
    <AdminLayout>
      <Page>
        <PageHeader
          title="Users"
          description="Manage panel accounts, roles, and access"
          icon={<DsIcon icon={Users} className="ds-icon--muted" />}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <DsIcon icon={Plus} />
              Create user
            </Button>
          }
        />

        <div className="ds-grid-stats mb-4">
          <StatCard label="Showing" value={stats.total} icon={<DsIcon icon={Users} />} />
          <StatCard label="Admins" value={stats.admins} icon={<DsIcon icon={Shield} />} />
          <StatCard label="Active" value={stats.active} icon={<DsIcon icon={User} />} tone="success" />
          <StatCard
            label="Suspended"
            value={stats.suspended}
            icon={<DsIcon icon={User} />}
            tone={stats.suspended > 0 ? 'warning' : 'neutral'}
          />
        </div>

        <Card title="All users">
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-0 w-full flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 ds-icon -translate-y-1/2 ds-icon--muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, username, UUID…"
                className="ds-field py-2 pl-8 pr-3"
              />
            </div>
            <FilterSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}>
              <option value="all">All roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </FilterSelect>
            <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </FilterSelect>
          </div>

          {loading ? (
            <div className="space-y-2 py-1" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={Users} className="ds-icon--md" />}
              title="No users match your filters"
              description="Try a broader search, or create a new account to get started."
              action={
                <Button variant="secondary" onClick={() => setShowCreate(true)}>
                  <DsIcon icon={Plus} />
                  Create user
                </Button>
              }
            />
          ) : (
            <AdminUserTable users={list} currentUserId={currentUser?.id} />
          )}
        </Card>

        {showCreate && (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              void refetch();
            }}
          />
        )}
      </Page>
    </AdminLayout>
  );
}
