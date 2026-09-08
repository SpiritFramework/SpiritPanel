import { Activity, Fingerprint, Key, Server, Settings, Shield, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { getServerTheme } from '../../../lib/server-theme';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { ServerEggIcon } from '../../ServerEggIcon';
import {
  UserDetailMetaGrid,
  UserDetailPanel,
  UserDetailQuickDock,
  UserDetailUsageMeter,
} from './UserDetailShell';
import type { UserDetailController } from '../../../pages/admin/user-detail/useUserDetail';
import { userDisplayName } from '../../../pages/admin/user-detail/helpers';

export function UserOverviewDashboard({
  ctrl,
  nav,
}: {
  ctrl: UserDetailController;
  nav: {
    onAccount: () => void;
    onServers: () => void;
    onKeys: () => void;
    onActivity: () => void;
  };
}) {
  const { detail, copied, copyText } = ctrl;
  if (!detail) return null;

  const name = userDisplayName(detail);
  const joined = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = detail.uuid.split('-')[0] ?? detail.uuid.slice(0, 8);
  const recent = detail.recentActivity.slice(0, 5);

  const dockItems = [
    { icon: Settings, label: 'Manage account', hint: 'Profile & permissions', onClick: nav.onAccount },
    {
      icon: Server,
      label: 'Servers',
      hint: `${detail.serverCount} owned`,
      onClick: nav.onServers,
    },
    {
      icon: Key,
      label: 'API keys',
      hint: `${detail.apiKeyCount} active`,
      onClick: nav.onKeys,
    },
    {
      icon: Activity,
      label: 'Activity',
      hint: `${detail.recentActivity.length} events`,
      onClick: nav.onActivity,
    },
  ];

  const usageMax = Math.max(detail.serverCount, detail.subuserCount, detail.apiKeyCount, 1);

  return (
    <div className="ds-ud-ov">
      {detail.suspended ? (
        <div className="ds-ud-banner ds-ud-banner--warning">
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="ds-ud-banner-title">Account suspended</p>
            <p className="ds-ud-banner-text">This user cannot sign in until the suspension is lifted.</p>
          </div>
        </div>
      ) : null}

      <UserDetailQuickDock items={dockItems} />

      <div className="ds-ud-ov-bento">
        <div className="ds-ud-ov-bento-main">
          <UserDetailPanel
            icon={User}
            title="Account snapshot"
            description="Identity and panel footprint"
            badge={detail.rootAdmin ? 'Root admin' : undefined}
          >
            <div className="ds-ud-profile-row">
              <div className="ds-ud-profile-copy">
                <p className="ds-ud-profile-name">{name}</p>
                <p className="ds-ud-profile-sub">@{detail.username}</p>
                <p className="ds-ud-profile-email">{detail.email}</p>
              </div>
            </div>

            <div className="ds-ud-usage-meters">
              <UserDetailUsageMeter
                label="Owned servers"
                value={detail.serverCount}
                max={usageMax}
              />
              <UserDetailUsageMeter
                label="Shared access"
                value={detail.subuserCount}
                max={usageMax}
              />
              <UserDetailUsageMeter
                label="API keys"
                value={detail.apiKeyCount}
                max={usageMax}
              />
            </div>
          </UserDetailPanel>

          <UserDetailPanel
            icon={Server}
            title="Recent servers"
            description="Owned instances on the panel"
            badge={detail.servers.length > 0 ? String(detail.servers.length) : undefined}
          >
            {detail.servers.length === 0 ? (
              <p className="ds-ud-empty-inline">No owned servers yet.</p>
            ) : (
              <ul className="ds-ud-server-preview">
                {detail.servers.slice(0, 4).map((server) => {
                  const theme = getServerTheme(server.egg);
                  return (
                  <li key={server.id}>
                    <Link to={`/admin/servers/${server.id}`} className="ds-ud-server-preview-row">
                      <span
                        className="ds-ud-server-preview-icon"
                        style={{ background: theme.gradient }}
                        aria-hidden
                      >
                        <ServerEggIcon eggName={server.egg} logoUrl={server.eggLogoUrl} className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ds-ud-server-preview-name truncate">{server.name}</p>
                        <p className="ds-ud-server-preview-meta truncate">
                          {server.egg} · {server.node}
                        </p>
                      </div>
                      <AdminServerStatusBadge
                        status={server.status}
                        suspended={server.suspended}
                        installStatus={server.installStatus}
                        containerState={server.containerState}
                        compact
                      />
                    </Link>
                  </li>
                  );
                })}
              </ul>
            )}
            {detail.servers.length > 4 ? (
              <button type="button" className="ds-ud-link-btn" onClick={nav.onServers}>
                View all {detail.servers.length} servers
              </button>
            ) : null}
          </UserDetailPanel>
        </div>

        <div className="ds-ud-ov-bento-side">
          <UserDetailPanel icon={Fingerprint} title="Identifiers" description="Panel references">
            <UserDetailMetaGrid
              items={[
                {
                  label: 'Panel ID',
                  value: detail.id,
                  mono: true,
                  onCopy: () => void copyText(detail.id, 'id'),
                  copied: copied === 'id',
                },
                {
                  label: 'UUID',
                  value: detail.uuid,
                  mono: true,
                  onCopy: () => void copyText(detail.uuid, 'uuid'),
                  copied: copied === 'uuid',
                },
                {
                  label: 'Short UUID',
                  value: uuidShort,
                  mono: true,
                },
                {
                  label: 'Member since',
                  value: joined,
                },
                {
                  label: 'Discord',
                  value: detail.discordLinked && detail.discordUsername
                    ? `@${detail.discordUsername.replace(/^@/, '')}`
                    : 'Not linked',
                },
                ...(detail.discordLinked && detail.discordId
                  ? [
                      {
                        label: 'Discord ID',
                        value: detail.discordId,
                        mono: true,
                        onCopy: () => void copyText(detail.discordId!, 'discord'),
                        copied: copied === 'discord',
                      },
                    ]
                  : []),
              ]}
            />
          </UserDetailPanel>

          <UserDetailPanel
            icon={Activity}
            title="Recent activity"
            description="Latest actions by this user"
            badge={detail.recentActivity.length > 0 ? String(detail.recentActivity.length) : undefined}
          >
            {recent.length === 0 ? (
              <p className="ds-ud-empty-inline">No recorded activity yet.</p>
            ) : (
              <ul className="ds-ud-activity-preview">
                {recent.map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="ds-ud-activity-preview-row">
                      <span className="ds-ud-activity-preview-icon" aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ds-ud-activity-preview-title truncate">
                          {entry.description?.trim() || meta.label}
                        </p>
                        <p className="ds-ud-activity-preview-meta truncate">
                          {entry.server?.name ? `${entry.server.name} · ` : ''}
                          {formatActivityTime(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {detail.recentActivity.length > 0 ? (
              <button type="button" className="ds-ud-link-btn" onClick={nav.onActivity}>
                Open activity log
              </button>
            ) : null}
          </UserDetailPanel>

          {detail.subuserAccess.length > 0 ? (
            <UserDetailPanel
              icon={Users}
              title="Shared access"
              description="Servers shared via subuser"
              badge={String(detail.subuserAccess.length)}
            >
              <ul className="ds-ud-shared-preview">
                {detail.subuserAccess.slice(0, 3).map((row) => (
                  <li key={row.id}>
                    <Link to={`/admin/servers/${row.serverId}`} className="ds-ud-shared-row">
                      <span className="truncate">{row.serverName}</span>
                      <span className="ds-ud-shared-owner truncate">by {row.owner}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </UserDetailPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
