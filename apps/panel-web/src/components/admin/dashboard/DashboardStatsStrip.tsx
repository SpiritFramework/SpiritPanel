import type { LucideIcon } from 'lucide-react';
import { Egg, HardDrive, MapPin, Server, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '../../../pages/admin/dashboard/types';
import type { Tone } from '../../ui';
import { toneStyle } from '../../ui';

function StatTile({
  to,
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  to: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Link to={to} className="ds-ad-stat">
      <span className="ds-ad-stat-icon" style={toneStyle(tone)} aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="ds-ad-stat-copy">
        <span className="ds-ad-stat-label">{label}</span>
        <span className="ds-ad-stat-value">{value}</span>
        <span className="ds-ad-stat-hint">{hint}</span>
      </span>
    </Link>
  );
}

export function DashboardStatsStrip({ stats }: { stats: DashboardStats }) {
  const nodesOffline = stats.nodes - stats.nodesOnline;
  const allocPct =
    stats.allocationsTotal > 0
      ? Math.round((stats.allocationsUsed / stats.allocationsTotal) * 100)
      : 0;
  const allocFree = Math.max(0, stats.allocationsTotal - stats.allocationsUsed);

  return (
    <div className="ds-ad-stats" role="list" aria-label="Panel metrics">
      <StatTile
        to="/admin/servers"
        label="Servers"
        value={String(stats.servers)}
        hint={
          stats.installing > 0
            ? `${stats.installing} installing`
            : `${stats.suspended} suspended`
        }
        icon={Server}
        tone="info"
      />
      <StatTile
        to="/admin/nodes"
        label="Nodes"
        value={`${stats.nodesOnline}/${stats.nodes}`}
        hint={nodesOffline > 0 ? `${nodesOffline} offline` : 'All reachable'}
        icon={HardDrive}
        tone={nodesOffline > 0 ? 'warning' : 'success'}
      />
      <StatTile
        to="/admin/users"
        label="Users"
        value={String(stats.users)}
        hint="Panel accounts"
        icon={Users}
      />
      <StatTile
        to="/admin/nests"
        label="Nests"
        value={String(stats.nests)}
        hint="Egg groups"
        icon={Egg}
      />
      <StatTile
        to="/admin/locations"
        label="Ports"
        value={`${stats.allocationsUsed}/${stats.allocationsTotal || '—'}`}
        hint={`${allocFree} free · ${allocPct}% used`}
        icon={MapPin}
        tone={allocPct >= 90 ? 'danger' : allocPct >= 75 ? 'warning' : 'neutral'}
      />
    </div>
  );
}
