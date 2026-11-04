import {
  Info,
  LifeBuoy,
  Mail,
  Palette,
  Shield,
  Sparkles,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { AdminHero, AdminKpiStrip } from '../primitives';

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
  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Configuration"
        title="Panel settings"
        description="Branding, features, security, email, and system options for the whole panel"
        pill={maintenanceOn ? 'Maintenance' : 'Operational'}
        pillTone={maintenanceOn ? 'warn' : 'ok'}
      />
      <AdminKpiStrip
        label="Settings summary"
        columns={4}
        items={[
          { icon: UserPlus, label: 'Registration', value: registrationOpen ? 'Open' : 'Closed' },
          { icon: Mail, label: 'Email', value: smtpEnabled ? 'SMTP on' : 'SMTP off' },
          {
            icon: Shield,
            label: 'Turnstile',
            value: turnstileOn ? 'Active' : 'Off',
            tone: turnstileOn ? 'success' : undefined,
          },
          {
            icon: LifeBuoy,
            label: 'Tickets',
            value: ticketsEnabled ? 'Enabled' : 'Disabled',
          },
        ]}
      />
      <div className="ds-nd-header-tabs ds-adm-entity-tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ds-nd-header-tab ds-adm-entity-tab${activeTab === tab.id ? ' ds-nd-header-tab--active ds-adm-entity-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
