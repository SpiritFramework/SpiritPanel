import {
  Activity,
  Ban,
  ChevronRight,
  Fingerprint,
  HardDrive,
  MapPin,
  Network,
  Server,
  Shield,
  User,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatActivityTime, getActivityMeta } from '../../../lib/activity';
import { isServerInstalling } from '../../../lib/server-runtime';
import { UserAvatar } from '../../UserAvatar';
import { AdminCallout, AdminToolButton } from '../primitives';
import { ServerDetailMetaGrid, ServerDetailPanel } from './ServerDetailShell';
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

  const address = formatAllocationAddress(detail.defaultAllocation, { fqdn: detail.node.fqdn });
  const installing = isServerInstalling(detail);
  const supportTools = getServerSupportTools(detail.egg.name);
  const recent = detail.recentActivity.slice(0, 5);
  const created = new Date(detail.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const nestLabel = detail.egg.nest.name;
  const eggLabel = detail.egg.name;
  const eggMeta =
    nestLabel.toLowerCase() === eggLabel.toLowerCase()
      ? nestLabel
      : `${nestLabel} · ${eggLabel}`;

  return (
    <div className="ds-asd-ov">
      {detail.nodeOnline === false ? (
        <AdminCallout
          tone="warning"
          icon={HardDrive}
          title="Host node is offline"
          description={
            detail.nodeReachabilityError
              ? `${detail.nodeReachabilityError}. Server status may be stale.`
              : 'Server status may be stale until FeatherWings reconnects.'
          }
        />
      ) : null}

      {detail.suspended ? (
        <AdminCallout
          tone="warning"
          icon={Ban}
          title="Server suspended"
          description="The owner cannot start or manage this server."
          action={
            <AdminToolButton type="button" onClick={nav.onManage}>
              Manage
            </AdminToolButton>
          }
        />
      ) : installing ? (
        <AdminCallout
          tone="info"
          icon={Shield}
          title="Installation in progress"
          description="Start is unavailable until the egg install script finishes."
        />
      ) : null}

      <ServerDetailPanel
        tone="identity"
        icon={Server}
        eyebrow="Runtime"
        title="Limits & features"
        description="Feature caps beyond the memory, disk, and CPU shown above"
        actions={
          <AdminToolButton type="button" onClick={nav.onManage}>
            Edit limits
          </AdminToolButton>
        }
      >
        <div className="ds-asd-resource-grid">
          <div className="ds-asd-resource-item">
            <span className="ds-asd-resource-label">Install</span>
            <span className="ds-asd-resource-value">{detail.installStatus}</span>
          </div>
          <div className="ds-asd-resource-item">
            <span className="ds-asd-resource-label">Subusers</span>
            <span className="ds-asd-resource-value">{detail.subuserCount}</span>
          </div>
          <div className="ds-asd-resource-item">
            <span className="ds-asd-resource-label">Backups</span>
            <span className="ds-asd-resource-value">
              {(detail.backupLimit ?? 0) === 0 ? 'Disabled' : detail.backupLimit}
            </span>
          </div>
          <div className="ds-asd-resource-item">
            <span className="ds-asd-resource-label">Databases</span>
            <span className="ds-asd-resource-value">
              {(detail.databaseLimit ?? 0) === 0 ? 'Disabled' : detail.databaseLimit}
            </span>
          </div>
        </div>
      </ServerDetailPanel>

      {fullAdmin ? (
        <ServerDetailPanel
          tone="wings"
          icon={Wrench}
          eyebrow="Support"
          title="Console tools"
          description="Jump into client-style tabs for this server"
          badge={String(supportTools.length)}
          actions={
            <AdminToolButton to={`/admin/servers/${detail.id}/manage`} primary>
              Open console
            </AdminToolButton>
          }
        >
          <div className="ds-asd-tools-grid">
            {supportTools.map((tool) => (
              <Link
                key={tool.to}
                to={`/admin/servers/${detail.id}/manage/${tool.to}`}
                className="ds-asd-tools-link"
              >
                <span className="ds-asd-tools-link-icon" aria-hidden>
                  <tool.icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{tool.label}</span>
                <ChevronRight className="ds-asd-tools-link-chevron h-3 w-3" aria-hidden />
              </Link>
            ))}
          </div>
        </ServerDetailPanel>
      ) : null}

      <div className="ds-asd-ov-grid">
        <ServerDetailPanel
          tone="connection"
          icon={User}
          eyebrow="Account"
          title="Owner"
          description="Account that owns this server"
          actions={
            <AdminToolButton to={`/admin/users/${detail.owner.id}`}>
              View user
              <ChevronRight className="h-3 w-3" aria-hidden />
            </AdminToolButton>
          }
        >
          <div className="ds-asd-owner-card">
            <div className="ds-asd-owner-card-top">
              <UserAvatar user={detail.owner} size="md" ring />
            </div>
            <ServerDetailMetaGrid
              items={[
                { label: 'Username', value: `@${detail.owner.username}` },
                {
                  label: 'Email',
                  value: detail.owner.email,
                  onCopy: () => void copyText(detail.owner.email, 'owner-email'),
                  copied: copied === 'owner-email',
                },
              ]}
            />
          </div>
        </ServerDetailPanel>

        <ServerDetailPanel
          tone="capacity"
          icon={MapPin}
          eyebrow="Placement"
          title="Infrastructure"
          description="Where this instance runs"
          actions={
            <AdminToolButton type="button" onClick={nav.onNetwork}>
              <Network className="h-3.5 w-3.5" aria-hidden />
              Network
            </AdminToolButton>
          }
        >
          <ServerDetailMetaGrid
            items={[
              { label: 'Node', value: detail.node.name },
              { label: 'Location', value: detail.node.location.short },
              { label: 'Egg', value: eggMeta },
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
      </div>

      <div className="ds-asd-ov-grid">
        <ServerDetailPanel
          icon={Fingerprint}
          eyebrow="References"
          title="Identifiers"
          description="Panel references"
        >
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
              { label: 'Created', value: created },
            ]}
          />
        </ServerDetailPanel>

        <ServerDetailPanel
          tone="trends"
          icon={Activity}
          eyebrow="Audit"
          title="Recent activity"
          description="Latest server events"
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
        </ServerDetailPanel>
      </div>
    </div>
  );
}
