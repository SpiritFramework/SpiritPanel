import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getServerTheme } from '../../../../lib/server-theme';
import { AdminServerStatusBadge } from '../../AdminServerStatus';
import { ServerEggIcon } from '../../../ServerEggIcon';
import type { UserOwnedServer } from './user-server-utils';

export function UserServerTableRow({ server }: { server: UserOwnedServer }) {
  const theme = getServerTheme(server.egg);
  const created = new Date(server.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr className="ds-ud-srv-table-row">
      <td>
        <Link to={`/admin/servers/${server.id}`} className="ds-ud-srv-table-server">
          <span
            className="ds-ud-srv-table-icon"
            style={{ background: theme.gradient }}
            aria-hidden
          >
            <ServerEggIcon eggName={server.egg} logoUrl={server.eggLogoUrl} className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="ds-ud-srv-table-name block truncate">{server.name}</span>
            <span className="ds-ud-srv-table-egg block truncate">{server.egg}</span>
          </span>
        </Link>
      </td>
      <td className="ds-ud-srv-table-node truncate">{server.node}</td>
      <td className="ds-ud-srv-table-address ds-text-mono truncate">{server.address}</td>
      <td className="ds-ud-srv-table-date">{created}</td>
      <td>
        <AdminServerStatusBadge
          status={server.status}
          suspended={server.suspended}
          installStatus={server.installStatus}
          containerState={server.containerState}
          compact
        />
      </td>
      <td className="ds-ud-srv-table-action">
        <Link to={`/admin/servers/${server.id}`} className="ds-ud-srv-table-link" aria-label="Open server">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
