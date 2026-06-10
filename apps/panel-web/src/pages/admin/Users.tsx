import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Shield, User, Users } from 'lucide-react';
import { api, type AdminUserSummary } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, Button, Card, FilterSelect } from '../../components/Layout';
import { CreateUserModal } from '../../components/CreateUserModal';
import { AdminUserTable } from '../../components/AdminUserRow';
import { EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

type RoleFilter = 'all' | 'admin' | 'user';
type StatusFilter = 'all' | 'active' | 'suspended';

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.admin.users({
        search: search.trim() || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        suspended:
          statusFilter === 'all' ? undefined : statusFilter === 'suspended' ? 'true' : 'false',
      });
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      active: users.filter((u) => !u.suspended).length,
      suspended: users.filter((u) => u.suspended).length,
    }),
    [users],
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Users"
        description="Manage panel accounts, roles, and access"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create user
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Showing" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Admins" value={stats.admins} icon={<Shield className="h-4 w-4" />} />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<User className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={<User className="h-4 w-4" />}
          tone={stats.suspended > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card title="All users">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, username, UUID…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[13px] shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </div>
          <FilterSelect
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </FilterSelect>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </FilterSelect>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting your search or filters." />
        ) : (
          <AdminUserTable users={users} currentUserId={currentUser?.id} />
        )}
      </Card>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}
