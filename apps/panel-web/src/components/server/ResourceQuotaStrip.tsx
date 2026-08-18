import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export function canCreateUnderLimit(limit: number, used: number): boolean {
  return used < limit;
}

export function ResourceQuotaStrip({
  label,
  used,
  limit,
  canCreate,
  icon,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  canCreate: boolean;
  icon?: ReactNode;
  /** Optional unit suffix shown after the count (e.g. MiB). */
  unit?: string;
}) {
  const atLimit = used >= limit;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;
  const disabled = limit === 0;
  const unitSuffix = unit ? ` ${unit}` : '';

  return (
    <section
      className={`resource-quota ${atLimit ? 'resource-quota--at-limit' : ''}`}
      aria-label={`${label} quota`}
    >
      <div className="resource-quota-head">
        <div className="resource-quota-title">
          {icon}
          <span>{label}</span>
        </div>
        <span className="resource-quota-count">
          {used} / {limit}
          {unitSuffix}
        </span>
      </div>

      <div className="resource-quota-bar" aria-hidden>
        <span className="resource-quota-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      {disabled && (
        <p className="resource-quota-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {label} are disabled on this server (limit 0).
        </p>
      )}

      {!disabled && atLimit && (
        <p className="resource-quota-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Limit reached. Delete an existing {label.toLowerCase().replace(/s$/, '')} to create a new one.
        </p>
      )}

      {!atLimit && !canCreate && (
        <p className="resource-quota-muted">You do not have permission to create {label.toLowerCase()}.</p>
      )}
    </section>
  );
}
