import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Info,
  LifeBuoy,
  Mail,
  Megaphone,
  Palette,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusPill } from '../../ui';

export const SETTINGS_TABS = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'system', label: 'System', icon: Wrench },
  { id: 'about', label: 'About', icon: Info },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]['id'];

export function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function SettingsHeader({
  activeTab,
  onTabChange,
  registrationOpen,
  maintenanceOn,
  smtpEnabled,
  turnstileOn,
  ticketsEnabled,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  registrationOpen: boolean;
  maintenanceOn: boolean;
  smtpEnabled: boolean;
  turnstileOn: boolean;
  ticketsEnabled: boolean;
}) {
  const tone = maintenanceOn ? 'warn' : 'good';
  const statusLabel = maintenanceOn ? 'Maintenance' : 'Operational';
  const statusPillTone = maintenanceOn ? 'warning' : 'success';

  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: UserPlus, label: 'Registration', value: registrationOpen ? 'Open' : 'Closed' },
    { icon: Mail, label: 'Email', value: smtpEnabled ? 'SMTP on' : 'SMTP off' },
    { icon: Shield, label: 'Turnstile', value: turnstileOn ? 'Active' : 'Off' },
    { icon: LifeBuoy, label: 'Tickets', value: ticketsEnabled ? 'Enabled' : 'Disabled' },
  ];

  return (
    <div className="ds-set-header-wrap">
      <header className={`ds-set-header ds-set-header--${tone}`}>
        <nav className="ds-set-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Panel settings</span>
        </nav>

        <div className="ds-set-header-body">
          <div className="ds-set-header-accent" aria-hidden />

          <div className="ds-set-header-main">
            <div className="ds-set-header-identity">
              <div className="ds-set-header-icon-wrap" aria-hidden>
                <SlidersHorizontal className="ds-icon" />
                <span className={`ds-set-header-pulse ds-set-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-set-header-title-row">
                  <h1 className="ds-set-header-title">Panel settings</h1>
                  <StatusPill label={statusLabel} tone={statusPillTone} pulse={!maintenanceOn} />
                </div>
                <p className="ds-set-header-meta">
                  Branding, features, security, email, system behavior, and panel information
                </p>
              </div>
            </div>

            <div className="ds-set-header-actions">
              <Link to="/admin/announce" className="ds-btn ds-btn--secondary ds-btn--sm">
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
                Announcements
              </Link>
            </div>
          </div>

          <div className="ds-set-header-stats" role="list" aria-label="Settings summary">
            {stats.map((stat) => (
              <div key={stat.label} className="ds-set-header-stat" role="listitem">
                <span className="ds-set-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-set-header-stat-copy">
                  <span className="ds-set-header-stat-label">{stat.label}</span>
                  <span className="ds-set-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>

          <nav className="ds-set-header-tabs" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ds-set-header-tab${activeTab === tab.id ? ' ds-set-header-tab--active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
