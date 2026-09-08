import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Egg, Layers, User } from 'lucide-react';
import type { AdminNestSummary } from '../../../lib/api';
import { NEST_GRADIENT } from './nest-fleet-utils';

export function NestFleetCard({ nest }: { nest: AdminNestSummary }) {
  const created = new Date(nest.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const authorShort = nest.author.includes('@') ? nest.author.split('@')[0]! : nest.author;
  const hasEggs = nest._count.eggs > 0;

  return (
    <Link
      to={`/admin/nests/${nest.id}`}
      className={`ds-adm-nest-card${hasEggs ? '' : ' ds-adm-nest-card--empty'}`}
      aria-label={`${nest.name}, ${nest._count.eggs} eggs`}
    >
      <div className="ds-adm-nest-card-accent" style={{ background: NEST_GRADIENT }} aria-hidden />

      <div className="ds-adm-nest-card-top">
        <div className="ds-adm-nest-card-icon-wrap" style={{ background: NEST_GRADIENT }} aria-hidden>
          <Layers className="h-4 w-4 text-white/90" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="ds-adm-nest-card-title truncate">{nest.name}</h3>
          <p className="ds-adm-nest-card-subtitle truncate">
            {nest.description || 'No description'}
          </p>
        </div>
        <ArrowUpRight className="ds-adm-nest-card-arrow" aria-hidden />
      </div>

      <div className="ds-adm-nest-card-badges">
        <span
          className={`ds-adm-nest-card-badge${hasEggs ? ' ds-adm-nest-card-badge--active' : ''}`}
        >
          <Egg className="h-3 w-3" aria-hidden />
          {nest._count.eggs} egg{nest._count.eggs === 1 ? '' : 's'}
        </span>
        {!hasEggs ? <span className="ds-adm-nest-card-badge">Empty</span> : null}
      </div>

      <div className="ds-adm-nest-card-meta">
        <span className="ds-adm-nest-card-chip">
          <User className="ds-icon ds-icon--sm" aria-hidden />
          {authorShort}
        </span>
        <span className="ds-adm-nest-card-chip">
          <Calendar className="ds-icon ds-icon--sm" aria-hidden />
          {created}
        </span>
      </div>
    </Link>
  );
}
