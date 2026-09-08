import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';
import { getServerTheme } from '../../../../lib/server-theme';
import { ServerEggIcon } from '../../../ServerEggIcon';
import type { UserSharedAccess } from './user-server-utils';

export function UserSharedAccessCard({ access }: { access: UserSharedAccess }) {
  const theme = getServerTheme(access.egg);

  return (
    <Link
      to={`/admin/servers/${access.serverId}`}
      className="ds-ud-srv-shared-card"
      aria-label={`${access.serverName}, shared by ${access.owner}`}
    >
      <div className="ds-ud-srv-shared-card-accent" aria-hidden />

      <div className="ds-ud-srv-shared-card-top">
        <span
          className="ds-ud-srv-shared-card-icon ds-ud-srv-shared-card-icon--egg"
          style={{ background: theme.gradient }}
          aria-hidden
        >
          <ServerEggIcon eggName={access.egg} logoUrl={access.eggLogoUrl} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="ds-ud-srv-shared-card-title truncate">{access.serverName}</h3>
          <p className="ds-ud-srv-shared-card-subtitle truncate">{access.egg}</p>
        </div>
        <ArrowUpRight className="ds-ud-srv-card-arrow" aria-hidden />
      </div>

      <div className="ds-ud-srv-shared-card-owner">
        <User className="ds-icon ds-icon--sm" aria-hidden />
        <span className="truncate">Owner: {access.owner}</span>
      </div>
    </Link>
  );
}
