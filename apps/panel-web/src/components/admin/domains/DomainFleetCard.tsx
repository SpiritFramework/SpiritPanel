import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Globe,
  HardDrive,
  Link2,
  Server,
  Trash2,
  User,
} from 'lucide-react';
import { Button } from '../../Layout';
import type { DomainRow } from './domain-fleet-utils';

export function DomainFleetCard({
  row,
  onDelete,
}: {
  row: DomainRow;
  onDelete: (id: string) => void;
}) {
  const tone =
    row.status === 'error' ? 'error' : row.preferSubdomain ? 'preferred' : 'active';
  const statusLabel =
    row.status === 'error' ? 'Error' : row.preferSubdomain ? 'Preferred' : 'IP shown';
  const created = new Date(row.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className={`ds-dom-card ds-dom-card--${tone}`}>
      <div className="ds-dom-card-accent" aria-hidden />

      <div className="ds-dom-card-top">
        <div className="ds-dom-card-icon" aria-hidden>
          <Globe className="ds-icon ds-icon--sm" />
          <span className={`ds-dom-card-pulse ds-dom-card-pulse--${tone}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="ds-dom-card-fqdn truncate" title={row.fqdn}>
              {row.fqdn}
            </h3>
            <span className={`ds-dom-card-badge ds-dom-card-badge--${tone}`}>{statusLabel}</span>
          </div>
          <p className="ds-dom-card-slug">
            <span className="ds-text-mono">{row.slug}</span>
            <span className="opacity-50"> → </span>
            <span className="ds-text-mono">{row.targetIp}</span>
          </p>
        </div>
        <Link
          to={`/admin/servers/${row.server.id}`}
          className="ds-dom-card-link"
          aria-label={`Open server ${row.server.name}`}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="ds-dom-card-stats">
        <span className="ds-dom-card-stat">
          <Server className="h-3 w-3" aria-hidden />
          <Link to={`/admin/servers/${row.server.id}`} className="hover:underline">
            {row.server.name}
          </Link>
        </span>
        <span className="ds-dom-card-stat">
          <User className="h-3 w-3" aria-hidden />
          {row.server.owner.username}
        </span>
        <span className="ds-dom-card-stat">
          <HardDrive className="h-3 w-3" aria-hidden />
          {row.server.node.name}
        </span>
        {row.preferSubdomain ? (
          <span className="ds-dom-card-stat">
            <Link2 className="h-3 w-3" aria-hidden />
            Player-facing
          </span>
        ) : null}
      </div>

      {row.message && row.status === 'error' ? (
        <p className="ds-dom-card-error">{row.message}</p>
      ) : null}

      <div className="ds-dom-card-foot">
        <span>Since {created}</span>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => onDelete(row.id)}
          aria-label={`Delete subdomain ${row.fqdn}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Remove
        </Button>
      </div>
    </article>
  );
}
