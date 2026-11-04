import { Activity, Fingerprint, Key, Server, Shield, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { getServerTheme } from '../../../lib/server-theme';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { ServerEggIcon } from '../../ServerEggIcon';
import { AdminCallout, AdminToolButton } from '../primitives';
import {
  UserDetailMetaGrid,
  UserDetailPanel,
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
  const usageMax = Math.max(detail.serverCount, detail.subuserCount, detail.apiKeyCount, 1);

  return (
    <div className="ds-ud-ov">
      {detail.suspended ? (
        <AdminCallout
          tone="warning"
          icon={Shield}
          title="Account suspended"
          description="This user cannot sign in until the suspension is lifted."
          action={
            <AdminToolButton type="button" onClick={nav.onAccount}>
              Manage account
            </AdminToolButton>
          }
        />
      ) : null}

      <UserDetailPanel
        tone="identity"
        icon={User}
        eyebrow="Account"
        title="Footprint"
        description="Identity and panel usage for this user"
        badge={detail.rootAdmin ? 'Root admin' : undefined}
        actions={
          <AdminToolButton type="button" onClick={nav.onAccount}>
            Edit profile
          </AdminToolButton>
        }
      >
        <UserDetailMetaGrid
          items={[
            { label: 'Display name', value: name },
            { label: 'Username', value: `@${detail.username}` },
            {
              label: 'Email',
              value: detail.email,
              onCopy: () => void copyText(detail.email, 'email'),
              copied: copied === 'email',
            },
          ]}
        />

        <div className="ds-ud-usage-meters">
          <UserDetailUsageMeter label="Owned servers" value={detail.serverCount} max={usageMax} />
          <UserDetailUsageMeter label="Shared access" value={detail.subuserCount} max={usageMax} />
          <UserDetailUsageMeter label="API keys" value={detail.apiKeyCount} max={usageMax} />
        </div>
      </UserDetailPanel>

      <UserDetailPanel
        tone="capacity"
        icon={Server}
        eyebrow="Fleet"
        title="Recent servers"
        description="Owned instances on the panel"
        badge={detail.servers.length > 0 ? String(detail.servers.length) : undefined}
        actions={
          detail.servers.length > 0 ? (
            <AdminToolButton type="button" onClick={nav.onServers}>
              View all
            </AdminToolButton>
          ) : undefined
        }
      >
        {detail.servers.length === 0 ? (
          <p className="ds-ud-empty-inline">No owned servers yet.</p>
        ) : (
          <ul className="ds-ud-server-preview">
            {detail.servers.slice(0, 6).map((server) => {
              const theme = getServerTheme(server.egg);
              return (
                <li key={server.id}>
                  <Link to={`/admin/servers/${server.id}`} className="ds-ud-server-preview-row">
                    <span
                      className="ds-ud-server-preview-icon"
                      style={{ background: theme.gradient }}
                      aria-hidden
                    >
                      <ServerEggIcon
                        eggName={server.egg}
                        logoUrl={server.eggLogoUrl}
                        className="h-3.5 w-3.5"
                      />
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
      </UserDetailPanel>

      <div className="ds-ud-ov-grid">
        <UserDetailPanel
          tone="connection"
          icon={Fingerprint}
          eyebrow="References"
          title="Identifiers"
          description="Panel and linked accounts"
        >
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
                value:
                  detail.discordLinked && detail.discordUsername
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
          tone="trends"
          icon={Activity}
          eyebrow="Audit"
          title="Recent activity"
          description="Latest actions by this user"
          badge={detail.recentActivity.length > 0 ? String(detail.recentActivity.length) : undefined}
          actions={
            detail.recentActivity.length > 0 ? (
              <AdminToolButton type="button" onClick={nav.onActivity}>
                Full log
              </AdminToolButton>
            ) : undefined
          }
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
        </UserDetailPanel>
      </div>

      {detail.subuserAccess.length > 0 ? (
        <UserDetailPanel
          icon={Users}
          eyebrow="Access"
          title="Shared access"
          description="Servers shared via subuser"
          badge={String(detail.subuserAccess.length)}
          actions={
            <AdminToolButton type="button" onClick={nav.onServers}>
              Open servers
            </AdminToolButton>
          }
        >
          <ul className="ds-ud-shared-preview">
            {detail.subuserAccess.slice(0, 6).map((row) => (
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

      <UserDetailPanel
        icon={Key}
        eyebrow="Integrations"
        title="API keys"
        description="Personal access tokens for this account"
        badge={String(detail.apiKeyCount)}
        actions={
          <AdminToolButton type="button" onClick={nav.onKeys}>
            Manage keys
          </AdminToolButton>
        }
      >
        <p className="ds-ud-empty-inline">
          {detail.apiKeyCount > 0
            ? `${detail.apiKeyCount} active key${detail.apiKeyCount === 1 ? '' : 's'} on this account.`
            : 'No API keys issued yet.'}
        </p>
      </UserDetailPanel>
    </div>
  );
}
