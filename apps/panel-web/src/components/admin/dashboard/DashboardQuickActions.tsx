import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Egg,
  LayoutGrid,
  MapPin,
  Megaphone,
  Settings,
  Store,
  Users,
} from 'lucide-react';

const ACTIONS: { to: string; icon: LucideIcon; label: string; desc: string }[] = [
  { to: '/admin/users', icon: Users, label: 'Users', desc: 'Accounts & roles' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations', desc: 'Regions & flags' },
  { to: '/admin/nests', icon: Egg, label: 'Nests', desc: 'Eggs & images' },
  { to: '/admin/activity', icon: Activity, label: 'Activity', desc: 'Audit log' },
  { to: '/admin/marketplace', icon: Store, label: 'Marketplace', desc: 'Scripts & mods' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', desc: 'Panel config' },
  { to: '/admin/announce', icon: Megaphone, label: 'Announce', desc: 'Broadcasts' },
];

export function DashboardQuickActions() {
  return (
    <section className="ds-ad-card ds-ad-card--actions">
      <header className="ds-ad-card-head">
        <div className="ds-ad-card-head-icon" aria-hidden>
          <LayoutGrid className="ds-icon ds-icon--sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="ds-ad-card-title">Quick actions</h2>
          <p className="ds-ad-card-desc">Jump to admin areas</p>
        </div>
      </header>

      <div className="ds-ad-actions-grid">
        {ACTIONS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="ds-ad-action-tile">
            <span className="ds-ad-action-icon" aria-hidden>
              <Icon className="ds-icon ds-icon--sm" />
            </span>
            <span className="ds-ad-action-copy">
              <span className="ds-ad-action-label">{label}</span>
              <span className="ds-ad-action-desc">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
