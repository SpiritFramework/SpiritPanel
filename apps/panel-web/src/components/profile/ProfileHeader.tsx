import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  Key,
  LayoutDashboard,
  Mail,
  Server,
  Shield,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusPill } from '../ui';

export const PROFILE_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'keys', label: 'API keys', icon: Key },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]['id'];

export function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.some((tab) => tab.id === value);
}

export function ProfileHeader({
  avatar,
  title,
  username,
  email,
  badges,
  activeTab,
  onTabChange,
  serverCount,
  keyCount,
  joined,
  suspended,
  adminLink,
}: {
  avatar: ReactNode;
  title: string;
  username: string;
  email: string;
  badges?: React.ReactNode;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  serverCount: number;
  keyCount: number;
  joined: string;
  suspended?: boolean;
  adminLink?: boolean;
}) {
  const tone = suspended ? 'warn' : 'good';
  const statusLabel = suspended ? 'Suspended' : 'Active';
  const statusPillTone = suspended ? 'warning' : 'success';

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Server, label: 'Servers', value: String(serverCount) },
    { icon: Key, label: 'API keys', value: String(keyCount) },
    { icon: Calendar, label: 'Joined', value: joined },
  ];

  return (
    <div className="ds-prof-header-wrap">
      <header className={`ds-prof-header ds-prof-header--${tone}`}>
        <nav className="ds-prof-header-crumb" aria-label="Breadcrumb">
          <Link to="/servers">Account</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Profile</span>
        </nav>

        <div className="ds-prof-header-body">
          <div className="ds-prof-header-accent" aria-hidden />

          <div className="ds-prof-header-main">
            <div className="ds-prof-header-identity">
              <div className="ds-prof-header-avatar-wrap">
                {avatar}
                <span className={`ds-prof-header-pulse ds-prof-header-pulse--${tone}`} aria-hidden />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-prof-header-title-row">
                  <h1 className="ds-prof-header-title">{title}</h1>
                  <StatusPill label={statusLabel} tone={statusPillTone} pulse={!suspended} />
                  {badges}
                </div>
                <p className="ds-prof-header-meta">
                  <span>@{username}</span>
                  <span className="ds-prof-header-meta-sep" aria-hidden>
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0 opacity-65" aria-hidden />
                    <span className="truncate">{email}</span>
                  </span>
                </p>
              </div>
            </div>

            {adminLink ? (
              <div className="ds-prof-header-actions">
                <Link to="/admin" className="ds-btn ds-btn--secondary ds-btn--sm">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                  Admin panel
                </Link>
              </div>
            ) : null}
          </div>

          <div className="ds-prof-header-stats" role="list" aria-label="Account summary">
            {stats.map((stat) => (
              <div key={stat.label} className="ds-prof-header-stat" role="listitem">
                <span className="ds-prof-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-prof-header-stat-copy">
                  <span className="ds-prof-header-stat-label">{stat.label}</span>
                  <span className="ds-prof-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>

          <nav className="ds-prof-header-tabs" aria-label="Profile sections">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ds-prof-header-tab${activeTab === tab.id ? ' ds-prof-header-tab--active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
                {tab.id === 'keys' && keyCount > 0 ? (
                  <span className="ds-prof-header-tab-count">{keyCount}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
