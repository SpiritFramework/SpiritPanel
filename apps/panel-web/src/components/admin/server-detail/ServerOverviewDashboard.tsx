import {
  Activity,
  Ban,
  ChevronRight,
  Fingerprint,
  MapPin,
  Network,
  Server,
  Settings,
  Shield,
  User,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { isServerInstalling } from '../../../lib/server-runtime';
import { formatCpuLimit, formatResource, getServerTheme } from '../../../lib/server-theme';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { UserAvatar } from '../../UserAvatar';
import { ServerEggIcon } from '../../ServerEggIcon';
import {
  ServerDetailMetaGrid,
  ServerDetailPanel,
  ServerDetailQuickDock,
} from './ServerDetailShell';
import type { ServerDetailController } from '../../../pages/admin/server-detail/useServerDetail';
import { getServerSupportTools } from '../../../pages/admin/server-detail/helpers';

export function ServerOverviewDashboard({
  ctrl,
  fullAdmin,
  nav,
}: {
  ctrl: ServerDetailController;
  fullAdmin: boolean;
  nav: {
    onManage: () => void;
    onNetwork: () => void;
    onActivity: () => void;
  };
}) {
  const { detail, copied, copyText } = ctrl;
  if (!detail) return null;

  const theme = getServerTheme(detail.egg.name);
  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });
  const installing = isServerInstalling(detail);
  const supportTools = getServerSupportTools(detail.egg.name);
  const recent = detail.recentActivity.slice(0, 5);

  const dockItems = [
    { icon: Settings, label: 'Manage', hint: 'Limits & power', onClick: nav.onManage },
    { icon: Network, label: 'Network', hint: 'Allocations', onClick: nav.onNetwork },
    {
      icon: Activity,
      label: 'Activity',
      hint: `${detail.recentActivity.length} recent`,
      onClick: nav.onActivity,
    },
    ...(fullAdmin
      ? [
          {
            icon: Wrench,
            label: 'Support tools',
            hint: 'Console & files',
            onClick: () => {
              window.location.href = `/admin/servers/${detail.id}/manage/console`;
            },
          },
        ]
      : []),
  ];

  return (
    <div className="ds-asd-ov">
      {detail.suspended ? (
        <div className="ds-asd-banner ds-asd-banner--warning">
          <Ban className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="ds-asd-banner-title">Server suspended</p>
            <p className="ds-asd-banner-text">The owner cannot start or manage this server.</p>
          </div>
        </div>
      ) : installing ? (
        <div className="ds-asd-banner ds-asd-banner--info">
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="ds-asd-banner-title">Installation in progress</p>
            <p className="ds-asd-banner-text">Start is unavailable until the egg install script finishes.</p>
          </div>
        </div>
      ) : null}

      <ServerDetailQuickDock items={dockItems} />

      <div className="ds-asd-ov-bento">
        <div className="ds-asd-ov-bento-main">
          <ServerDetailPanel
            icon={Server}
            title="Server snapshot"
            description="Runtime status and resources"
          >
            <div className="ds-asd-snapshot-row">
              <div
                className="ds-asd-snapshot-icon"
                style={{ background: theme.gradient }}
                aria-hidden
              >
                <ServerEggIcon eggName={detail.egg.name} logoUrl={detail.egg.logoUrl} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ds-asd-snapshot-name truncate">{detail.name}</p>
                <p className="ds-asd-snapshot-sub truncate">
                  {detail.egg.nest.name} · {detail.egg.name}
                </p>
                <div className="ds-asd-snapshot-badges">
                  <AdminServerStatusBadge
                    status={detail.status}
                    suspended={detail.suspended}
                    installStatus={detail.installStatus}
                    containerState={detail.containerState}
                    compact
                  />
                </div>
              </div>
            </div>

            <div className="ds-asd-resource-grid">
              <div className="ds-asd-resource-item">
                <span className="ds-asd-resource-label">Memory</span>
                <span className="ds-asd-resource-value">{formatResource(detail.memory, 'MiB')}</span>
              </div>
              <div className="ds-asd-resource-item">
                <span className="ds-asd-resource-label">Disk</span>
                <span className="ds-asd-resource-value">{formatResource(detail.disk, 'MiB')}</span>
              </div>
              <div className="ds-asd-resource-item">
                <span className="ds-asd-resource-label">CPU</span>
                <span className="ds-asd-resource-value">{formatCpuLimit(detail.cpu)}</span>
              </div>
              <div className="ds-asd-resource-item">
                <span className="ds-asd-resource-label">Subusers</span>
                <span className="ds-asd-resource-value">{detail.subuserCount}</span>
              </div>
            </div>
          </ServerDetailPanel>

          {fullAdmin ? (
            <ServerDetailPanel
              icon={Wrench}
              title="Support tools"
              description="Full client-style access for troubleshooting"
              badge={String(supportTools.length)}
            >
              <div className="ds-asd-tools-grid">
                {supportTools.map((tool) => (
                  <Link
                    key={tool.to}
                    to={`/admin/servers/${detail.id}/manage/${tool.to}`}
                    className="ds-asd-tools-link"
                  >
                    <tool.icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{tool.label}</span>
                    <ChevronRight className="ml-auto h-3 w-3 shrink-0 opacity-50" aria-hidden />
                  </Link>
                ))}
              </div>
            </ServerDetailPanel>
          ) : null}
        </div>

        <div className="ds-asd-ov-bento-side">
          <ServerDetailPanel icon={User} title="Owner" description="Account that owns this server">
            <Link to={`/admin/users/${detail.owner.id}`} className="ds-asd-owner-row">
              <UserAvatar user={detail.owner} size="sm" ring />
              <span className="min-w-0 flex-1">
                <span className="ds-asd-owner-name block truncate">{detail.owner.username}</span>
                <span className="ds-asd-owner-email block truncate">{detail.owner.email}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            </Link>
          </ServerDetailPanel>

          <ServerDetailPanel icon={MapPin} title="Infrastructure" description="Node and egg placement">
            <ServerDetailMetaGrid
              items={[
                { label: 'Node', value: detail.node.name },
                { label: 'Location', value: detail.node.location.short },
                { label: 'Nest', value: detail.egg.nest.name },
                { label: 'Egg', value: detail.egg.name },
                { label: 'Install', value: detail.installStatus },
                {
                  label: 'Address',
                  value: address,
                  mono: true,
                  onCopy: () => void copyText(address, 'address'),
                  copied: copied === 'address',
                },
              ]}
            />
          </ServerDetailPanel>

          <ServerDetailPanel icon={Fingerprint} title="Identifiers" description="Panel references">
            <ServerDetailMetaGrid
              items={[
                {
                  label: 'Server ID',
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
              ]}
            />
          </ServerDetailPanel>

          <ServerDetailPanel
            icon={Activity}
            title="Recent activity"
            description="Latest server events"
            badge={detail.recentActivity.length > 0 ? String(detail.recentActivity.length) : undefined}
          >
            {recent.length === 0 ? (
              <p className="ds-asd-empty-inline">No recorded activity yet.</p>
            ) : (
              <ul className="ds-asd-activity-preview">
                {recent.map((entry) => {
                  const meta = getActivityMeta(entry.event);
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="ds-asd-activity-preview-row">
                      <span className="ds-asd-activity-preview-icon" aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ds-asd-activity-preview-title truncate">
                          {entry.description?.trim() || meta.label}
                        </p>
                        <p className="ds-asd-activity-preview-meta truncate">
                          {entry.actor?.username ? `${entry.actor.username} · ` : ''}
                          {formatActivityTime(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {detail.recentActivity.length > 0 ? (
              <button type="button" className="ds-asd-link-btn" onClick={nav.onActivity}>
                Open activity log
              </button>
            ) : null}
          </ServerDetailPanel>
        </div>
      </div>
    </div>
  );
}
