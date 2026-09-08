import { Link } from 'react-router-dom';
import { Globe, LifeBuoy, Lock, Megaphone, Shield, Sparkles, UserPlus } from 'lucide-react';
import type { SettingsTab } from './SettingsHeader';
import { NodeOverviewSection } from '../node-detail/NodeDetailShell';

export function SettingsSidebar({
  tab,
  registration,
  tickets,
  security,
  turnstile,
  smtpEnabled,
  maintenanceOn,
}: {
  tab: SettingsTab;
  registration: boolean;
  tickets: { enabled: boolean };
  security: { minPasswordLength: number };
  turnstile: { enabled: boolean };
  smtpEnabled: boolean;
  maintenanceOn: boolean;
}) {
  if (tab === 'about' || tab === 'branding') return null;

  return (
    <aside className="ds-set-rail">
      <NodeOverviewSection icon={Globe} title="Quick status" description="Current panel configuration">
        <ul className="ds-set-status-list">
          <SettingsStatusRow icon={UserPlus} label="Registration" value={registration ? 'Open' : 'Closed'} />
          <SettingsStatusRow icon={LifeBuoy} label="Tickets" value={tickets.enabled ? 'On' : 'Off'} />
          <SettingsStatusRow icon={Lock} label="Min password" value={`${security.minPasswordLength} chars`} />
          <SettingsStatusRow icon={Shield} label="Turnstile" value={turnstile.enabled ? 'On' : 'Off'} />
          <SettingsStatusRow icon={Globe} label="SMTP" value={smtpEnabled ? 'Configured' : 'Off'} />
          <SettingsStatusRow
            icon={Megaphone}
            label="Maintenance"
            value={maintenanceOn ? 'Active' : 'Off'}
            tone={maintenanceOn ? 'warn' : undefined}
          />
        </ul>
      </NodeOverviewSection>

      <NodeOverviewSection icon={Sparkles} title="Related" description="Other configuration pages">
        <div className="ds-set-related-links">
          <Link to="/admin/plugins" className="ds-set-related-link">
            <Sparkles className="h-3.5 w-3.5" />
            Plugins
          </Link>
          <Link to="/admin/announce" className="ds-set-related-link">
            <Megaphone className="h-3.5 w-3.5" />
            Announcements
          </Link>
          <Link to="/admin/domains" className="ds-set-related-link">
            <Globe className="h-3.5 w-3.5" />
            Subdomains
          </Link>
        </div>
      </NodeOverviewSection>
    </aside>
  );
}

function SettingsStatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof UserPlus;
  label: string;
  value: string;
  tone?: 'warn';
}) {
  return (
    <li className={`ds-set-status-row${tone === 'warn' ? ' ds-set-status-row--warn' : ''}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="ds-set-status-label">{label}</span>
      <span className="ds-set-status-value">{value}</span>
    </li>
  );
}
