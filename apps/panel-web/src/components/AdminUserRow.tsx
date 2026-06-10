import { useNavigate } from 'react-router-dom';
import { ChevronRight, Key, Server, Users } from 'lucide-react';
import type { AdminUserSummary } from '../lib/api';
import { AccountStatus, displayName, RoleBadge } from './UserCard';
import { UserAvatar } from './UserAvatar';
import { AdminMobileCard, AdminResponsiveTable } from './admin/AdminMobileCard';

const USAGE_LABELS = [
  { key: 'serverCount' as const, icon: Server, title: 'Owned servers' },
  { key: 'subuserCount' as const, icon: Users, title: 'Shared servers' },
  { key: 'apiKeyCount' as const, icon: Key, title: 'API keys' },
];

export function AdminUserTable({
  users,
  currentUserId,
}: {
  users: AdminUserSummary[];
  currentUserId?: string;
}) {
  return (
    <>
      <AdminResponsiveTable
        mobile={users.map((user) => (
          <AdminUserMobileCard key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
        desktop={
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2.5 font-semibold">User</th>
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5 font-semibold">Usage</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="w-10 px-2 py-2.5" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <AdminUserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
              ))}
            </tbody>
          </table>
        }
      />
      <div className="hidden flex-wrap gap-x-4 gap-y-1 rounded-xl border border-t-0 border-[var(--border)] bg-[var(--bg-elevated)]/30 px-4 py-2 text-[10px] text-[var(--muted)] md:flex">
        <span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Owned servers</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Shared access</span>
        <span className="inline-flex items-center gap-1"><Key className="h-3 w-3" /> API keys</span>
      </div>
    </>
  );
}

function AdminUserMobileCard({ user, isSelf }: { user: AdminUserSummary; isSelf?: boolean }) {
  const navigate = useNavigate();
  const name = displayName(user);

  return (
    <AdminMobileCard
      onClick={() => navigate(`/admin/users/${user.id}`)}
      leading={<UserAvatar user={user} size="md" ring />}
      title={
        <span className="inline-flex items-center gap-1.5">
          {name}
          {isSelf && (
            <span className="shrink-0 rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[9px] font-medium uppercase accent-text">
              You
            </span>
          )}
        </span>
      }
      subtitle={`@${user.username}`}
      badges={
        <>
          <RoleBadge role={user.role} rootAdmin={user.rootAdmin} />
          <AccountStatus suspended={user.suspended} />
        </>
      }
      meta={
        <>
          <p className="truncate">{user.email}</p>
          <div className="flex gap-1.5 pt-0.5">
            {USAGE_LABELS.map(({ key, icon, title }) => (
              <UsageChip key={key} icon={icon} label={String(user[key])} title={title} />
            ))}
          </div>
        </>
      }
    />
  );
}

function AdminUserRow({ user, isSelf }: { user: AdminUserSummary; isSelf?: boolean }) {
  const navigate = useNavigate();
  const name = displayName(user);
  const created = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = user.uuid.split('-')[0] ?? user.uuid.slice(0, 8);

  return (
    <tr
      onClick={() => navigate(`/admin/users/${user.id}`)}
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[180px] items-center gap-3">
          <UserAvatar user={user} size="sm" ring />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium group-hover:accent-text">{name}</p>
              {isSelf && (
                <span className="shrink-0 rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[9px] font-medium uppercase accent-text">
                  You
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-[var(--muted)]">@{user.username}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="min-w-[160px]">
          <p className="truncate">{user.email}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]" title={user.uuid}>
            {uuidShort}
          </p>
        </div>
      </td>

      <td className="px-4 py-3">
        <RoleBadge role={user.role} rootAdmin={user.rootAdmin} />
      </td>

      <td className="px-4 py-3">
        <div className="flex min-w-[120px] gap-1.5">
          {USAGE_LABELS.map(({ key, icon, title }) => (
            <UsageChip key={key} icon={icon} label={String(user[key])} title={title} />
          ))}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]">{created}</td>

      <td className="px-4 py-3">
        <AccountStatus suspended={user.suspended} />
      </td>

      <td className="px-2 py-3">
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
      </td>
    </tr>
  );
}

function UsageChip({
  icon: Icon,
  label,
  title,
}: {
  icon: typeof Server;
  label: string;
  title: string;
}) {
  const empty = label === '0';
  return (
    <span
      title={title}
      className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] tabular-nums ${
        empty ? 'bg-[var(--bg-elevated)]/60 text-[var(--muted)]/60' : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
      }`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      {label}
    </span>
  );
}
