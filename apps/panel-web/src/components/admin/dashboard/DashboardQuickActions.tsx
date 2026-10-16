import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowUpRight,
  Egg,
  Globe,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Megaphone,
  Puzzle,
  Settings,
  Users,
} from 'lucide-react';

const ACTIONS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/admin/tickets', icon: LifeBuoy, label: 'Tickets' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations' },
  { to: '/admin/nests', icon: Egg, label: 'Nests' },
  { to: '/admin/plugins', icon: Puzzle, label: 'Plugins' },
  { to: '/admin/domains', icon: Globe, label: 'Domains' },
  { to: '/admin/activity', icon: Activity, label: 'Activity' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce' },
];

export function DashboardQuickActions() {
  return (
    <section className="ds-admin-dash__card ds-admin-dash__card--nav">
      <header className="ds-admin-dash__card-head">
        <div className="ds-admin-dash__card-head-icon" aria-hidden>
          <LayoutGrid className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-admin-dash__card-title">Quick nav</h2>
          <p className="ds-admin-dash__card-desc">Jump to admin areas</p>
        </div>
      </header>

      <div className="ds-admin-dash__actions" role="list">
        {ACTIONS.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="ds-admin-dash__action" role="listitem">
            <span className="ds-admin-dash__action-icon" aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            <span className="ds-admin-dash__action-label">{label}</span>
            <ArrowUpRight className="ds-admin-dash__action-arrow" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
