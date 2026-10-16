import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
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

const ACTIONS: { to: string; icon: LucideIcon; label: string; desc: string }[] = [
  { to: '/admin/tickets', icon: LifeBuoy, label: 'Tickets', desc: 'Support queue' },
  { to: '/admin/users', icon: Users, label: 'Users', desc: 'Accounts & roles' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations', desc: 'Regions & flags' },
  { to: '/admin/nests', icon: Egg, label: 'Nests', desc: 'Eggs & images' },
  { to: '/admin/plugins', icon: Puzzle, label: 'Plugins', desc: 'Panel extensions' },
  { to: '/admin/domains', icon: Globe, label: 'Domains', desc: 'Subdomains' },
  { to: '/admin/activity', icon: Activity, label: 'Activity', desc: 'Audit log' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', desc: 'Panel config' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce', desc: 'Broadcasts' },
];

export function DashboardQuickActions() {
  return (
    <section className="ds-admin-dash__card">
      <header className="ds-admin-dash__card-head">
        <div className="ds-admin-dash__card-head-icon" aria-hidden>
          <LayoutGrid className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-admin-dash__card-title">Quick nav</h2>
          <p className="ds-admin-dash__card-desc">Jump to admin areas</p>
        </div>
      </header>

      <div className="ds-admin-dash__actions">
        {ACTIONS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="ds-admin-dash__action">
            <span className="ds-admin-dash__action-icon" aria-hidden>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="ds-admin-dash__action-copy">
              <span className="ds-admin-dash__action-label">{label}</span>
              <span className="ds-admin-dash__action-desc">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}