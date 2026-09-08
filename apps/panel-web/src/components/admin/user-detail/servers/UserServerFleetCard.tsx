import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, MapPin } from 'lucide-react';
import { getServerTheme } from '../../../../lib/server-theme';
import { AdminServerStatusBadge } from '../../AdminServerStatus';
import { ServerEggIcon } from '../../../ServerEggIcon';
import type { UserOwnedServer } from './user-server-utils';

export function UserServerFleetCard({ server }: { server: UserOwnedServer }) {
  const theme = getServerTheme(server.egg);
  const created = new Date(server.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const statusClass = server.suspended ? 'suspended' : server.status;

  return (
    <Link
      to={`/admin/servers/${server.id}`}
      className={`ds-ud-srv-card ds-ud-srv-card--${statusClass}`}
      aria-label={`${server.name}, ${server.egg}`}
    >
      <div className="ds-ud-srv-card-accent" aria-hidden />

      <div className="ds-ud-srv-card-top">
        <div
          className="ds-ud-srv-card-icon-wrap"
          style={{ background: theme.gradient }}
          aria-hidden
        >
          <ServerEggIcon eggName={server.egg} logoUrl={server.eggLogoUrl} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="ds-ud-srv-card-title truncate">{server.name}</h3>
          <p className="ds-ud-srv-card-subtitle truncate">{server.egg}</p>
        </div>
        <ArrowUpRight className="ds-ud-srv-card-arrow" aria-hidden />
      </div>

      <div className="ds-ud-srv-card-badges">
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </div>

      <div className="ds-ud-srv-card-meta">
        <span className="ds-ud-srv-card-chip">
          <MapPin className="ds-icon ds-icon--sm" aria-hidden />
          {server.node}
        </span>
        <span className="ds-ud-srv-card-chip ds-text-mono">{server.address}</span>
      </div>

      <p className="ds-ud-srv-card-foot">
        <Calendar className="ds-icon ds-icon--sm" aria-hidden />
        Created {created}
      </p>
    </Link>
  );
}
