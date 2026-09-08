import { KeyRound, Shield, UserCheck, Users } from 'lucide-react';

export function SubusersStatsRow({
  total,
  avgPermissions,
  totalPermissionsGranted,
  catalogSize,
}: {
  total: number;
  avgPermissions: number;
  totalPermissionsGranted: number;
  catalogSize: number;
}) {
  return (
    <div className="ds-srv-sub-stats">
      <div className="ds-srv-sub-stat">
        <span className="ds-srv-sub-stat-icon ds-srv-sub-stat-icon--members" aria-hidden>
          <Users className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sub-stat-value">{total}</p>
          <p className="ds-srv-sub-stat-label">Subusers</p>
        </div>
      </div>
      <div className="ds-srv-sub-stat">
        <span className="ds-srv-sub-stat-icon ds-srv-sub-stat-icon--granted" aria-hidden>
          <KeyRound className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sub-stat-value">{totalPermissionsGranted}</p>
          <p className="ds-srv-sub-stat-label">Permissions granted</p>
        </div>
      </div>
      <div className="ds-srv-sub-stat">
        <span className="ds-srv-sub-stat-icon ds-srv-sub-stat-icon--avg" aria-hidden>
          <UserCheck className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-sub-stat-value">{avgPermissions}</p>
          <p className="ds-srv-sub-stat-label">Avg per user</p>
        </div>
      </div>
      <div className="ds-srv-sub-stat ds-srv-sub-stat--capacity">
        <span className="ds-srv-sub-stat-icon ds-srv-sub-stat-icon--catalog" aria-hidden>
          <Shield className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-sub-capacity-bar-wrap">
            <div className="ds-srv-sub-capacity-bar">
              <div
                className="ds-srv-sub-capacity-fill"
                style={{ width: total > 0 ? `${Math.min(100, (avgPermissions / catalogSize) * 100)}%` : '0%' }}
              />
            </div>
            <span className="ds-srv-sub-capacity-label">{catalogSize}</span>
          </div>
          <p className="ds-srv-sub-stat-label">Available permission types</p>
        </div>
      </div>
    </div>
  );
}
