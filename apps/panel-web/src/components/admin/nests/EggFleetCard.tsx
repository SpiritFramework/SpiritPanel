import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Layers, Server, User, Variable } from 'lucide-react';
import type { AdminEggSummary } from '../../../lib/api';
import { ServerEggIcon } from '../../ServerEggIcon';
import { getServerTheme } from '../../../lib/server-theme';
import { EGG_GRADIENT } from './nest-fleet-utils';

export function EggFleetCard({ egg }: { egg: AdminEggSummary }) {
  const theme = getServerTheme(egg.name);
  const created = new Date(egg.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const authorShort = egg.author.includes('@') ? egg.author.split('@')[0]! : egg.author;
  const deployed = egg._count.servers > 0;

  return (
    <Link
      to={`/admin/eggs/${egg.id}`}
      className={`ds-adm-nest-card ds-adm-nest-card--egg${!egg.enabled ? ' ds-adm-nest-card--disabled' : ''}`}
      aria-label={`${egg.name}, ${egg.nest.name}`}
    >
      <div
        className="ds-adm-nest-card-accent"
        style={{ background: theme.gradient ?? EGG_GRADIENT }}
        aria-hidden
      />

      <div className="ds-adm-nest-card-top">
        <div
          className="ds-adm-nest-card-icon-wrap"
          style={{ background: theme.gradient ?? EGG_GRADIENT }}
          aria-hidden
        >
          <ServerEggIcon eggName={egg.name} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="ds-adm-nest-card-title truncate">{egg.name}</h3>
          <p className="ds-adm-nest-card-subtitle truncate">
            {egg.description || `by ${egg.author}`}
          </p>
        </div>
        <ArrowUpRight className="ds-adm-nest-card-arrow" aria-hidden />
      </div>

      <div className="ds-adm-nest-card-badges">
        {!egg.enabled ? (
          <span className="ds-adm-nest-card-badge ds-adm-nest-card-badge--warn">Disabled</span>
        ) : deployed ? (
          <span className="ds-adm-nest-card-badge ds-adm-nest-card-badge--active">
            <span className="ds-adm-nest-card-pulse" aria-hidden />
            In use
          </span>
        ) : (
          <span className="ds-adm-nest-card-badge ds-adm-nest-card-badge--active">Enabled</span>
        )}
      </div>

      <div className="ds-adm-nest-card-meta">
        <span className="ds-adm-nest-card-chip">
          <Layers className="ds-icon ds-icon--sm" aria-hidden />
          {egg.nest.name}
        </span>
        <span className="ds-adm-nest-card-chip">
          <User className="ds-icon ds-icon--sm" aria-hidden />
          {authorShort}
        </span>
      </div>

      <div className="ds-adm-nest-card-resources">
        <span className="ds-adm-nest-card-resource">
          <Variable className="ds-icon ds-icon--sm" aria-hidden />
          {egg._count.variables} vars
        </span>
        <span className="ds-adm-nest-card-resource">
          <Server className="ds-icon ds-icon--sm" aria-hidden />
          {egg._count.servers} srv
        </span>
        <span className="ds-adm-nest-card-resource">
          <Calendar className="ds-icon ds-icon--sm" aria-hidden />
          {created}
        </span>
      </div>
    </Link>
  );
}
