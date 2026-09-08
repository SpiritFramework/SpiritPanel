import { Link } from 'react-router-dom';
import { ArrowUpRight, Key, Server, Users } from 'lucide-react';
import type { AdminUserSummary } from '../../../lib/api';
import { AccountStatus, displayName, RoleBadge } from '../../UserCard';
import { UserAvatar } from '../../UserAvatar';
import { getUserFleetStatus } from './user-fleet-utils';

export function UserFleetCard({
  user,
  isSelf,
}: {
  user: AdminUserSummary;
  isSelf?: boolean;
}) {
  const status = getUserFleetStatus(user);
  const name = displayName(user);
  const created = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = user.uuid.split('-')[0] ?? user.uuid.slice(0, 8);
  const roleClass = user.suspended ? 'suspended' : user.role;

  return (
    <Link
      to={`/admin/users/${user.id}`}
      className={`ds-usr-card ds-usr-card--${roleClass}`}
      aria-label={`${name}, ${user.suspended ? 'suspended' : 'active'}`}
    >
      <div className="ds-usr-card-accent" aria-hidden />

      <div className="ds-usr-card-top">
        <div className="ds-usr-card-avatar-wrap">
          <UserAvatar user={user} size="md" ring />
          <span className={`ds-usr-card-pulse ds-usr-card-pulse--${status}`} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="ds-usr-card-title truncate">{name}</h3>
            {isSelf ? <span className="ds-usr-card-self">You</span> : null}
          </div>
          <p className="ds-usr-card-subtitle truncate">@{user.username}</p>
        </div>
        <ArrowUpRight className="ds-usr-card-arrow" aria-hidden />
      </div>

      <div className="ds-usr-card-badges">
        <RoleBadge role={user.role} rootAdmin={user.rootAdmin} />
        <AccountStatus suspended={user.suspended} />
      </div>

      <div className="ds-usr-card-contact">
        <p className="truncate">{user.email}</p>
        <p className="ds-usr-card-uuid ds-text-mono" title={user.uuid}>
          {uuidShort}
        </p>
      </div>

      <div className="ds-usr-card-meta-row">
        <span className="ds-usr-card-chip">
          <Server className="ds-icon ds-icon--sm" aria-hidden />
          {user.serverCount} owned
        </span>
        <span className="ds-usr-card-chip">
          <Users className="ds-icon ds-icon--sm" aria-hidden />
          {user.subuserCount} shared
        </span>
        <span className="ds-usr-card-chip">
          <Key className="ds-icon ds-icon--sm" aria-hidden />
          {user.apiKeyCount} keys
        </span>
      </div>

      <p className="ds-usr-card-foot">Joined {created}</p>
    </Link>
  );
}
