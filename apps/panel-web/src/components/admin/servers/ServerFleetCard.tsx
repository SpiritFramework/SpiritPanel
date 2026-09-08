import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Cpu, HardDrive, MapPin, MemoryStick, User } from 'lucide-react';
import type { AdminServerSummary } from '../../../lib/api';
import { formatAllocationAddress } from '../../../lib/allocation';
import { formatResource } from '../../../lib/server-theme';
import { AdminServerStatusBadge } from '../AdminServerStatus';
import { LocationFlag } from '../../LocationFlag';
import { ServerEggIcon } from '../../ServerEggIcon';
import { getServerTheme } from '../../../lib/server-theme';

export function ServerFleetCard({ server }: { server: AdminServerSummary }) {
  const theme = getServerTheme(server.egg.name);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });
  const created = new Date(server.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const statusClass = server.suspended ? 'suspended' : server.status;

  return (
    <Link
      to={`/admin/servers/${server.id}`}
      className={`ds-adm-srv-card ds-adm-srv-card--${statusClass}`}
      aria-label={`${server.name}, ${server.egg.name}`}
    >
      <div className="ds-adm-srv-card-accent" aria-hidden />

      <div className="ds-adm-srv-card-top">
        <div
          className="ds-adm-srv-card-icon-wrap"
          style={{ background: theme.gradient }}
          aria-hidden
        >
          <ServerEggIcon
            eggName={server.egg.name}
            logoUrl={server.egg.logoUrl}
            className="h-4 w-4"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="ds-adm-srv-card-title truncate">{server.name}</h3>
          <p className="ds-adm-srv-card-subtitle truncate">{server.egg.name}</p>
        </div>
        <ArrowUpRight className="ds-adm-srv-card-arrow" aria-hidden />
      </div>

      <div className="ds-adm-srv-card-badges">
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </div>

      <div className="ds-adm-srv-card-owner">
        <User className="ds-icon ds-icon--sm" aria-hidden />
        <span className="truncate">@{server.owner.username}</span>
      </div>

      <div className="ds-adm-srv-card-meta">
        <span className="ds-adm-srv-card-chip">
          {server.node.location.flagUrl ? (
            <LocationFlag url={server.node.location.flagUrl} size="sm" />
          ) : (
            <MapPin className="ds-icon ds-icon--sm" aria-hidden />
          )}
          {server.node.name}
        </span>
        <span className="ds-adm-srv-card-chip ds-text-mono truncate">{address}</span>
      </div>

      <div className="ds-adm-srv-card-resources">
        <span className="ds-adm-srv-card-resource">
          <MemoryStick className="ds-icon ds-icon--sm" aria-hidden />
          {formatResource(server.memory, 'MiB')}
        </span>
        <span className="ds-adm-srv-card-resource">
          <HardDrive className="ds-icon ds-icon--sm" aria-hidden />
          {formatResource(server.disk, 'MiB')}
        </span>
        <span className="ds-adm-srv-card-resource">
          <Cpu className="ds-icon ds-icon--sm" aria-hidden />
          {server.cpu}%
        </span>
      </div>

      <p className="ds-adm-srv-card-foot">
        <Calendar className="ds-icon ds-icon--sm" aria-hidden />
        Created {created}
      </p>
    </Link>
  );
}
