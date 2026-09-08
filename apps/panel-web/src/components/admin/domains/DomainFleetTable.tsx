import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Globe, HardDrive, Server, Trash2, User } from 'lucide-react';
import { Button } from '../../Layout';
import type { DomainRow } from './domain-fleet-utils';

export function DomainFleetTable({
  rows,
  onDelete,
}: {
  rows: DomainRow[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="ds-dom-table-wrap">
      <table className="ds-dom-table">
        <thead>
          <tr>
            <th>FQDN</th>
            <th>Server</th>
            <th>Owner</th>
            <th>Node</th>
            <th>Target</th>
            <th>Shown to players</th>
            <th className="ds-dom-table-actions" aria-label="Actions" />
            <th className="ds-dom-table-chevron" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DomainFleetTableRow key={row.id} row={row} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DomainFleetTableRow({
  row,
  onDelete,
}: {
  row: DomainRow;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const tone =
    row.status === 'error' ? 'error' : row.preferSubdomain ? 'preferred' : 'active';
  const shownLabel = row.preferSubdomain ? 'Subdomain' : 'IP address';

  return (
    <tr
      className="ds-dom-table-row"
      tabIndex={0}
      onClick={() => navigate(`/admin/servers/${row.server.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/admin/servers/${row.server.id}`);
        }
      }}
    >
      <td>
        <div className="ds-dom-table-fqdn">
          <span className="ds-dom-table-icon" aria-hidden>
            <Globe className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="ds-dom-table-name block truncate ds-text-mono" title={row.fqdn}>
              {row.fqdn}
            </span>
            <span className="ds-dom-table-sub block truncate ds-text-mono">{row.slug}</span>
          </span>
        </div>
      </td>
      <td>
        <Link
          to={`/admin/servers/${row.server.id}`}
          className="ds-dom-table-metric hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Server className="h-3 w-3" aria-hidden />
          {row.server.name}
        </Link>
      </td>
      <td>
        <span className="ds-dom-table-metric">
          <User className="h-3 w-3" aria-hidden />
          {row.server.owner.username}
        </span>
      </td>
      <td>
        <span className="ds-dom-table-metric">
          <HardDrive className="h-3 w-3" aria-hidden />
          {row.server.node.name}
        </span>
      </td>
      <td>
        <code className="ds-dom-table-code">{row.targetIp}</code>
      </td>
      <td>
        <span className={`ds-dom-table-badge ds-dom-table-badge--${tone}`}>{shownLabel}</span>
        {row.status === 'error' ? (
          <span className="ds-dom-table-error-hint" title={row.message ?? undefined}>
            DNS error
          </span>
        ) : null}
      </td>
      <td className="ds-dom-table-actions" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => onDelete(row.id)}
          aria-label={`Delete subdomain ${row.fqdn}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </td>
      <td className="ds-dom-table-chevron">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </td>
    </tr>
  );
}
