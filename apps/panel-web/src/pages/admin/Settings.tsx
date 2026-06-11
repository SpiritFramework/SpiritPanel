import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Mail,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  Store,
  Type,
  UserPlus,
  Wrench,
  Palette,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import {
  DEFAULT_BRANDING_APPEARANCE,
  normalizeAppearance,
  type BrandingAppearance,
} from '../../lib/branding-appearance';
import { ACCENT_PALETTE_PRESETS, THEME_PALETTES, applySurfacePreset } from '../../lib/branding-theme-palettes';
import {
  DEFAULT_GENERAL,
  DEFAULT_MAINTENANCE,
  DEFAULT_MARKETPLACE,
  DEFAULT_SECURITY,
  type PanelGeneralSettings,
  type PanelMaintenanceSettings,
  type PanelMarketplaceSettings,
  type PanelSecuritySettings,
} from '../../lib/panel-settings';
import { AdminLayout, Button, Input, Textarea } from '../../components/Layout';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminDetailTabs,
  AdminSaveBar,
  AdminSettingsPanel,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import { BrandingAssetField, ColorField } from '../../components/BrandingFields';
import { BrandingColorPanel } from '../../components/BrandingColorPanel';
import { BrandingAppearanceFields } from '../../components/BrandingAppearanceFields';
import { BrandingPreview } from '../../components/BrandingPreview';
import { AuthorAttribution } from '../../components/AuthorAttribution';
import { PanelName } from '../../components/PanelName';
import { Checkbox } from '../../components/Checkbox';
import { EmailTemplatesPanel } from '../../components/admin/EmailTemplatesPanel';
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_TURNSTILE_FORM,
  type EmailTemplatesSettings,
  type TurnstileForm,
} from '../../lib/email-templates';

type Tab = 'branding' | 'general' | 'access' | 'maintenance' | 'email';

interface SmtpForm {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

const DEFAULT_SMTP_FORM: SmtpForm = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromAddress: '',
  fromName: 'Spirit-Panel',
};

interface BrandingForm extends BrandingAppearance {
  panelName: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  loginMessage: string;
}

const DEFAULT_BRANDING_FORM: BrandingForm = {
  panelName: 'Spirit-Panel',
  tagline: 'Game server panel',
  accentColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  logoUrl: '',
  faviconUrl: '',
  loginMessage: 'Sign in to manage your game servers',
  ...DEFAULT_BRANDING_APPEARANCE,
};

export function AdminSettings() {
  const { refreshBranding } = useBranding();
  const [tab, setTab] = useState<Tab>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [branding, setBranding] = useState<BrandingForm>(DEFAULT_BRANDING_FORM);
  const [general, setGeneral] = useState<PanelGeneralSettings>(DEFAULT_GENERAL);
  const [maintenance, setMaintenance] = useState<PanelMaintenanceSettings>(DEFAULT_MAINTENANCE);
  const [security, setSecurity] = useState<PanelSecuritySettings>(DEFAULT_SECURITY);
  const [registration, setRegistration] = useState(false);
  const [marketplace, setMarketplace] = useState<PanelMarketplaceSettings>(DEFAULT_MARKETPLACE);
  const [smtp, setSmtp] = useState<SmtpForm>(DEFAULT_SMTP_FORM);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesSettings>(DEFAULT_EMAIL_TEMPLATES);
  const [turnstile, setTurnstile] = useState<TurnstileForm>(DEFAULT_TURNSTILE_FORM);
  const [turnstileSecretSet, setTurnstileSecretSet] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [refreshingStates, setRefreshingStates] = useState(false);
  const [refreshStatesResult, setRefreshStatesResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [initial, setInitial] = useState('');

  useEffect(() => {
    api.admin.settings().then((s) => {
      const b = (s.branding ?? {}) as Partial<BrandingForm>;
      const nextBranding: BrandingForm = {
        ...DEFAULT_BRANDING_FORM,
        panelName: b.panelName ?? DEFAULT_BRANDING_FORM.panelName,
        tagline: b.tagline ?? DEFAULT_BRANDING_FORM.tagline,
        accentColor: b.accentColor ?? DEFAULT_BRANDING_FORM.accentColor,
        secondaryColor: b.secondaryColor ?? DEFAULT_BRANDING_FORM.secondaryColor,
        logoUrl: b.logoUrl ?? '',
        faviconUrl: b.faviconUrl ?? '',
        loginMessage: b.loginMessage ?? DEFAULT_BRANDING_FORM.loginMessage,
        ...normalizeAppearance(b as Partial<BrandingAppearance>),
      };
      const nextGeneral = { ...DEFAULT_GENERAL, ...(s.general as PanelGeneralSettings | undefined) };
      const nextMaintenance = { ...DEFAULT_MAINTENANCE, ...(s.maintenance as PanelMaintenanceSettings | undefined) };
      const nextSecurity = { ...DEFAULT_SECURITY, ...(s.security as PanelSecuritySettings | undefined) };
      const nextRegistration = Boolean((s.registration_enabled as { enabled?: boolean } | undefined)?.enabled);
      const nextMarketplace = { ...DEFAULT_MARKETPLACE, ...(s.marketplace as PanelMarketplaceSettings | undefined) };
      const rawSmtp = (s.smtp ?? {}) as Partial<SmtpForm> & { passwordSet?: boolean };
      const nextSmtp: SmtpForm = {
        enabled: Boolean(rawSmtp.enabled),
        host: rawSmtp.host ?? '',
        port: typeof rawSmtp.port === 'number' ? rawSmtp.port : 587,
        secure: Boolean(rawSmtp.secure),
        username: rawSmtp.username ?? '',
        password: '',
        fromAddress: rawSmtp.fromAddress ?? '',
        fromName: rawSmtp.fromName ?? 'Spirit-Panel',
      };
      const rawTemplates = s.email_templates as Partial<EmailTemplatesSettings> | undefined;
      const nextEmailTemplates = Object.fromEntries(
        Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([key, defaults]) => [
          key,
          { ...defaults, ...rawTemplates?.[key as keyof EmailTemplatesSettings] },
        ]),
      ) as EmailTemplatesSettings;
      const rawTurnstile = (s.turnstile ?? {}) as Partial<TurnstileForm> & { secretKeySet?: boolean };
      const nextTurnstile: TurnstileForm = {
        enabled: Boolean(rawTurnstile.enabled),
        siteKey: rawTurnstile.siteKey ?? '',
        secretKey: '',
      };

      setBranding(nextBranding);
      setGeneral(nextGeneral);
      setMaintenance(nextMaintenance);
      setSecurity(nextSecurity);
      setRegistration(nextRegistration);
      setMarketplace(nextMarketplace);
      setSmtp(nextSmtp);
      setSmtpPasswordSet(Boolean(rawSmtp.passwordSet));
      setEmailTemplates(nextEmailTemplates);
      setTurnstile(nextTurnstile);
      setTurnstileSecretSet(Boolean(rawTurnstile.secretKeySet));
      setInitial(JSON.stringify({
        branding: nextBranding,
        general: nextGeneral,
        maintenance: nextMaintenance,
        security: nextSecurity,
        registration: nextRegistration,
        marketplace: nextMarketplace,
        smtp: nextSmtp,
        emailTemplates: nextEmailTemplates,
        turnstile: nextTurnstile,
      }));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'branding' || loading) return;
    const root = document.documentElement;
    const appearance = normalizeAppearance(branding);
    root.dataset.themePreset = appearance.themePreset;
    root.dataset.loginBg = appearance.loginBackground;
    root.dataset.panelBg = appearance.panelBackground;
    root.style.setProperty('--accent', branding.accentColor);
    root.style.setProperty('--accent-secondary', branding.secondaryColor || branding.accentColor);
    applySurfacePreset(appearance.themePreset, root.dataset.theme === 'light' ? 'light' : 'dark');
  }, [tab, branding, loading]);

  useEffect(() => {
    if (tab !== 'branding') {
      void refreshBranding();
    }
  }, [tab, refreshBranding]);

  const hasChanges = useMemo(() => {
    if (loading || !initial) return false;
    return initial !== JSON.stringify({ branding, general, maintenance, security, registration, marketplace, smtp, emailTemplates, turnstile });
  }, [branding, general, maintenance, security, registration, marketplace, smtp, emailTemplates, turnstile, initial, loading]);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const smtpPayload: Record<string, unknown> = {
        enabled: smtp.enabled,
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        username: smtp.username,
        fromAddress: smtp.fromAddress,
        fromName: smtp.fromName,
      };
      if (smtp.password) smtpPayload.password = smtp.password;
      const turnstilePayload: Record<string, unknown> = {
        enabled: turnstile.enabled,
        siteKey: turnstile.siteKey,
      };
      if (turnstile.secretKey) turnstilePayload.secretKey = turnstile.secretKey;
      await api.admin.updateSettings({
        branding: {
          ...branding,
          secondaryColor: branding.secondaryColor || branding.accentColor,
        },
        general,
        maintenance,
        security,
        registration_enabled: { enabled: registration },
        marketplace,
        smtp: smtpPayload,
        email_templates: emailTemplates,
        turnstile: turnstilePayload,
      });
      await refreshBranding();
      if (smtp.password) setSmtpPasswordSet(true);
      if (turnstile.secretKey) setTurnstileSecretSet(true);
      setSmtp((prev) => ({ ...prev, password: '' }));
      setTurnstile((prev) => ({ ...prev, secretKey: '' }));
      setInitial(JSON.stringify({
        branding,
        general,
        maintenance,
        security,
        registration,
        marketplace,
        smtp: { ...smtp, password: '' },
        emailTemplates,
        turnstile: { ...turnstile, secretKey: '' },
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    if (!initial) return;
    const s = JSON.parse(initial) as {
      branding: BrandingForm;
      general: PanelGeneralSettings;
      maintenance: PanelMaintenanceSettings;
      security: PanelSecuritySettings;
      registration: boolean;
      marketplace: PanelMarketplaceSettings;
      smtp: SmtpForm;
      emailTemplates: EmailTemplatesSettings;
      turnstile: TurnstileForm;
    };
    setBranding(s.branding);
    setGeneral(s.general);
    setMaintenance(s.maintenance);
    setSecurity(s.security);
    setRegistration(s.registration);
    setMarketplace(s.marketplace);
    setSmtp(s.smtp);
    setEmailTemplates(s.emailTemplates);
    setTurnstile(s.turnstile);
    setError('');
    setSaved(false);
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const draft: Record<string, unknown> = {
        enabled: true,
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        username: smtp.username,
        fromAddress: smtp.fromAddress,
        fromName: smtp.fromName,
      };
      if (smtp.password) draft.password = smtp.password;
      await api.admin.testSmtp(testEmail.trim(), draft);
      setTestResult({ ok: true, message: `Test email sent to ${testEmail.trim()}` });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  }

  async function refreshServerStates() {
    setRefreshingStates(true);
    setRefreshStatesResult(null);
    try {
      const result = await api.admin.refreshServerStates();
      setRefreshStatesResult({
        ok: true,
        message: `Cleared ${result.cacheEntriesCleared} cached entries. Polled ${result.serversPolled} servers — ${result.serversUpdated} updated, ${result.pollFailures} could not reach Wings.`,
      });
    } catch (err) {
      setRefreshStatesResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to refresh server states',
      });
    } finally {
      setRefreshingStates(false);
    }
  }

  async function uploadAsset(kind: 'logo' | 'favicon', file: File) {
    const data = await fileToBase64(file);
    const res = await api.admin.uploadBrandingAsset(kind, data, file.type);
    const b = res.branding as unknown as BrandingForm;
    setBranding((prev) => ({
      ...prev,
      logoUrl: b.logoUrl ?? prev.logoUrl,
      faviconUrl: b.faviconUrl ?? prev.faviconUrl,
    }));
    await refreshBranding();
  }

  async function applyAssetUrl(kind: 'logo' | 'favicon', url: string) {
    const res = await api.admin.setBrandingAssetUrl(kind, url);
    const b = res.branding as unknown as BrandingForm;
    setBranding((prev) => ({
      ...prev,
      logoUrl: b.logoUrl ?? prev.logoUrl,
      faviconUrl: b.faviconUrl ?? prev.faviconUrl,
    }));
    await refreshBranding();
  }

  async function removeAsset(kind: 'logo' | 'favicon') {
    const res = await api.admin.deleteBrandingAsset(kind);
    const b = res.branding as unknown as BrandingForm;
    setBranding((prev) => ({
      ...prev,
      logoUrl: b.logoUrl ?? '',
      faviconUrl: b.faviconUrl ?? '',
    }));
    await refreshBranding();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'branding', label: 'Branding' },
    { id: 'general', label: 'General' },
    { id: 'access', label: 'Access' },
    { id: 'email', label: 'Email' },
    { id: 'maintenance', label: 'Maintenance' },
  ];

  const accent = branding.accentColor || '#6366f1';
  const secondary = branding.secondaryColor || accent;

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Panel settings' }]}>
        <AdminDetailHero
          gradient={`linear-gradient(135deg, ${accent}, ${secondary})`}
          icon={SlidersHorizontal}
          title="Panel settings"
          subtitle="Branding, access controls, email delivery, and panel behavior"
          stats={[
            { icon: UserPlus, label: 'Registration', value: registration ? 'Open' : 'Closed' },
            {
              icon: Store,
              label: 'Marketplace',
              value: marketplace.enabled
                ? marketplace.allowCatalog && marketplace.allowGithubInstalls
                  ? 'Full'
                  : marketplace.allowGithubInstalls
                    ? 'GitHub'
                    : 'Catalog'
                : 'Off',
            },
            { icon: Mail, label: 'Email', value: smtp.enabled ? 'Enabled' : 'Off' },
            { icon: Wrench, label: 'Maintenance', value: maintenance.enabled ? 'On' : 'Off' },
            { icon: KeyRound, label: 'Min password', value: `${security.minPasswordLength} chars` },
          ]}
        />

        <AdminDetailTabs tabs={tabs} active={tab} onChange={setTab} />

        <AdminDetailBody>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading settings…</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                <div className="space-y-4">
                  {tab === 'branding' && (
                    <>
                      <AdminSettingsPanel title="Identity" description="Names and messaging shown across the panel" icon={Type}>
                        <div className="grid w-full gap-4">
                          <div>
                            <Input label="Panel name" value={branding.panelName} onChange={(e) => setBranding({ ...branding, panelName: e.target.value })} />
                            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Preview</p>
                              <PanelName name={branding.panelName || 'Panel name'} variant="sidebar" />
                            </div>
                          </div>
                          <Input label="Sidebar tagline" value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} placeholder="Game server panel" />
                          <Input label="Login message" value={branding.loginMessage} onChange={(e) => setBranding({ ...branding, loginMessage: e.target.value })} />
                        </div>
                      </AdminSettingsPanel>

                      <AdminSettingsPanel title="Colors" description="Accent gradients, curated palettes, and contrast-aware picks" icon={Sparkles}>
                        <BrandingColorPanel
                          accentColor={branding.accentColor}
                          secondaryColor={branding.secondaryColor}
                          onAccentChange={(accentColor) => setBranding({ ...branding, accentColor })}
                          onSecondaryChange={(secondaryColor) => setBranding({ ...branding, secondaryColor })}
                          onApplyPair={(accentColor, secondaryColor) => setBranding({ ...branding, accentColor, secondaryColor })}
                        />
                      </AdminSettingsPanel>

                      <AdminSettingsPanel title="Appearance" description="Color themes, animated backgrounds, and default light/dark mode" icon={Palette}>
                        <BrandingAppearanceFields
                          themePreset={branding.themePreset}
                          defaultThemeMode={branding.defaultThemeMode}
                          loginBackground={branding.loginBackground}
                          panelBackground={branding.panelBackground}
                          accentColor={branding.accentColor}
                          secondaryColor={branding.secondaryColor}
                          onThemePresetChange={(themePreset) => {
                            const next = { ...branding, themePreset };
                            if (themePreset !== 'default') {
                              const palette = THEME_PALETTES[themePreset];
                              if (palette) {
                                next.accentColor = palette.accent;
                                const match = ACCENT_PALETTE_PRESETS.find(
                                  (p) => p.primary.toLowerCase() === palette.accent.toLowerCase(),
                                );
                                next.secondaryColor = match?.secondary ?? palette.accent;
                              }
                            }
                            setBranding(next);
                          }}
                          onDefaultThemeModeChange={(defaultThemeMode) => setBranding({ ...branding, defaultThemeMode })}
                          onLoginBackgroundChange={(loginBackground) => setBranding({ ...branding, loginBackground })}
                          onPanelBackgroundChange={(panelBackground) => setBranding({ ...branding, panelBackground })}
                        />
                      </AdminSettingsPanel>

                      <AdminSettingsPanel title="Assets" description="Logo and favicon shown in the sidebar, login, and browser tab" icon={ImageIcon}>
                        <div className="grid w-full gap-6">
                          <BrandingAssetField
                            kind="logo"
                            label="Panel logo"
                            hint="Shown in sidebar and login"
                            url={branding.logoUrl}
                            onUpload={(f) => uploadAsset('logo', f)}
                            onApplyUrl={(u) => applyAssetUrl('logo', u)}
                            onRemove={() => removeAsset('logo')}
                            disabled={saving}
                          />
                          <BrandingAssetField
                            kind="favicon"
                            label="Favicon"
                            hint="Browser tab icon"
                            url={branding.faviconUrl}
                            onUpload={(f) => uploadAsset('favicon', f)}
                            onApplyUrl={(u) => applyAssetUrl('favicon', u)}
                            onRemove={() => removeAsset('favicon')}
                            disabled={saving}
                          />
                        </div>
                      </AdminSettingsPanel>
                    </>
                  )}

                  {tab === 'general' && (
                    <AdminSettingsPanel title="Company & support" description="Contact details shown to users on login and emails" icon={Globe}>
                      <div className="grid w-full gap-4">
                        <Input label="Company name" value={general.companyName} onChange={(e) => setGeneral({ ...general, companyName: e.target.value })} placeholder="Your hosting brand" />
                        <Input label="Support email" type="email" value={general.supportEmail} onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })} placeholder="support@example.com" />
                        <Input label="Support URL" value={general.supportUrl} onChange={(e) => setGeneral({ ...general, supportUrl: e.target.value })} placeholder="https://help.example.com" />
                        <Textarea label="Login footer text" value={general.footerText} onChange={(e) => setGeneral({ ...general, footerText: e.target.value })} rows={2} placeholder="Optional text shown below the login form" />
                      </div>
                    </AdminSettingsPanel>
                  )}

                  {tab === 'access' && (
                    <>
                      <AdminSettingsPanel title="Registration" description="Control whether visitors can create their own accounts" icon={UserPlus}>
                        <Checkbox
                          label="Allow public registration"
                          description="Allow new users to sign up at /signup and show a link on the login page"
                          checked={registration}
                          onChange={setRegistration}
                        />
                      </AdminSettingsPanel>
                      <AdminSettingsPanel title="FiveM marketplace" description="Let users browse and install curated resources on FiveM servers" icon={Store}>
                        <div className="space-y-3">
                          <Checkbox
                            label="Enable FiveM marketplace"
                            description="When off, the marketplace tab is hidden from users and install APIs return forbidden. Admins can still manage the catalog."
                            checked={marketplace.enabled}
                            onChange={(enabled) => setMarketplace((m) => ({ ...m, enabled }))}
                          />
                          <Checkbox
                            label="Show host catalog"
                            description="Curated plugins added by admins. Turn off for GitHub-only marketplace."
                            checked={marketplace.allowCatalog}
                            disabled={!marketplace.enabled}
                            onChange={(allowCatalog) => setMarketplace((m) => ({ ...m, allowCatalog }))}
                          />
                          <Checkbox
                            label="Allow GitHub installs"
                            description="Discover tab with popular scripts, search, and custom install paths."
                            checked={marketplace.allowGithubInstalls}
                            disabled={!marketplace.enabled}
                            onChange={(allowGithubInstalls) => setMarketplace((m) => ({ ...m, allowGithubInstalls }))}
                          />
                        </div>
                      </AdminSettingsPanel>
                      <AdminSettingsPanel title="Security" description="Password requirements for new accounts" icon={KeyRound}>
                        <div className="max-w-xs">
                          <Input
                            label="Minimum password length"
                            type="number"
                            min={8}
                            max={128}
                            value={String(security.minPasswordLength)}
                            onChange={(e) => setSecurity({ ...security, minPasswordLength: Number(e.target.value) || 8 })}
                          />
                          <p className="mt-1 text-xs text-[var(--muted)]">Applies to registration and admin-created users</p>
                        </div>
                      </AdminSettingsPanel>
                      <AdminSettingsPanel
                        title="Cloudflare Turnstile"
                        description="Bot protection on login, registration, and password reset"
                        icon={Shield}
                      >
                        <div className="space-y-4">
                          <Checkbox
                            label="Enable Turnstile"
                            description="Requires a Cloudflare Turnstile site key and secret key"
                            checked={turnstile.enabled}
                            onChange={(enabled) => setTurnstile({ ...turnstile, enabled })}
                          />
                          <div className="grid w-full gap-4 sm:grid-cols-2">
                            <Input
                              label="Site key"
                              value={turnstile.siteKey}
                              onChange={(e) => setTurnstile({ ...turnstile, siteKey: e.target.value })}
                              placeholder="0x4AAAAAAA..."
                              autoComplete="off"
                            />
                            <Input
                              label="Secret key"
                              type="password"
                              value={turnstile.secretKey}
                              onChange={(e) => setTurnstile({ ...turnstile, secretKey: e.target.value })}
                              placeholder={turnstileSecretSet ? '•••••••• (unchanged)' : 'Turnstile secret key'}
                              autoComplete="new-password"
                            />
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            Create a widget at{' '}
                            <a
                              href="https://dash.cloudflare.com/?to=/:account/turnstile"
                              target="_blank"
                              rel="noreferrer"
                              className="accent-text underline"
                            >
                              Cloudflare Turnstile
                            </a>
                            . Use managed or non-interactive mode. Turnstile only activates when enabled and both keys are saved.
                          </p>
                        </div>
                      </AdminSettingsPanel>
                    </>
                  )}

                  {tab === 'email' && (
                    <>
                      <AdminSettingsPanel title="SMTP delivery" description="Outbound mail for password resets and notifications" icon={Mail}>
                        <div className="space-y-4">
                          <Checkbox
                            label="Enable email delivery"
                            description="Required for password resets and notifications"
                            checked={smtp.enabled}
                            onChange={(enabled) => setSmtp({ ...smtp, enabled })}
                          />
                          <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                            <Input label="SMTP host" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" />
                            <Input label="Port" type="number" min={1} max={65535} value={String(smtp.port)} onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) || 0 })} />
                          </div>
                          <Checkbox
                            label="Use SSL/TLS (implicit)"
                            description="Enable for port 465. Leave off for STARTTLS on 587."
                            checked={smtp.secure}
                            onChange={(secure) => setSmtp({ ...smtp, secure })}
                          />
                          <div className="grid w-full gap-4 sm:grid-cols-2">
                            <Input label="Username" value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} placeholder="apikey or user@example.com" autoComplete="off" />
                            <Input
                              label="Password"
                              type="password"
                              value={smtp.password}
                              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                              placeholder={smtpPasswordSet ? '•••••••• (unchanged)' : 'SMTP password / API key'}
                              autoComplete="new-password"
                            />
                          </div>
                          <div className="grid w-full gap-4 sm:grid-cols-2">
                            <Input label="From address" type="email" value={smtp.fromAddress} onChange={(e) => setSmtp({ ...smtp, fromAddress: e.target.value })} placeholder="no-reply@example.com" />
                            <Input label="From name" value={smtp.fromName} onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })} placeholder="Spirit-Panel" />
                          </div>
                        </div>
                      </AdminSettingsPanel>

                      <AdminSettingsPanel title="Send a test email" description="Confirm delivery using the values currently in the form" icon={Send}>
                        <p className="mb-3 text-xs text-[var(--muted)]">
                          Save your changes first, then send a test to confirm delivery. Tests use the values currently in the form.
                        </p>
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="flex-1">
                            <Input label="Recipient" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
                          </div>
                          <Button type="button" variant="subtle" onClick={sendTest} disabled={testing || !testEmail.trim() || !smtp.host}>
                            <Send className="h-3.5 w-3.5" />
                            {testing ? 'Sending…' : 'Send test'}
                          </Button>
                        </div>
                        {testResult && (
                          <div
                            className="mt-3 rounded-lg border px-3 py-2 text-xs"
                            style={{
                              borderColor: testResult.ok ? 'var(--success-border)' : 'var(--danger-border)',
                              background: testResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: testResult.ok ? 'var(--success-fg)' : 'var(--danger-fg)',
                            }}
                          >
                            {testResult.message}
                          </div>
                        )}
                      </AdminSettingsPanel>

                      <AdminSettingsPanel
                        title="Email templates"
                        description="Customize subject, content, and preview how emails look to users"
                        icon={Type}
                      >
                        {!smtp.enabled && (
                          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                            Enable SMTP above and save settings before emails can be delivered.
                          </p>
                        )}
                        <EmailTemplatesPanel templates={emailTemplates} onChange={setEmailTemplates} />
                      </AdminSettingsPanel>
                    </>
                  )}

                  {tab === 'maintenance' && (
                    <>
                    <AdminSettingsPanel
                      title="Maintenance mode"
                      description="Temporarily block normal users while you work on the panel"
                      icon={Wrench}
                      tone={maintenance.enabled ? 'danger' : 'default'}
                    >
                      <div className="space-y-4">
                        <Checkbox
                          label="Enable maintenance mode"
                          description="Blocks normal users from signing in and shows a maintenance message"
                          checked={maintenance.enabled}
                          onChange={(enabled) => setMaintenance({ ...maintenance, enabled })}
                        />
                        <Textarea
                          label="Maintenance message"
                          value={maintenance.message}
                          onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                          rows={3}
                        />
                        <Checkbox
                          label="Allow admin login during maintenance"
                          description="Administrators can still sign in to manage the panel"
                          checked={maintenance.allowAdminLogin}
                          onChange={(allowAdminLogin) => setMaintenance({ ...maintenance, allowAdminLogin })}
                        />
                        {maintenance.enabled && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Maintenance mode is active — regular users cannot log in.
                          </div>
                        )}
                      </div>
                    </AdminSettingsPanel>

                    <AdminSettingsPanel
                      title="Server status cache"
                      description="Clear in-memory Wings status and re-poll every server"
                      icon={RefreshCw}
                    >
                      <p className="mb-3 text-xs text-[var(--muted)]">
                        Server cards read cached container state from the API. Use this if statuses look stuck (for example
                        Offline while a server is running). This does not delete databases or user files — only the
                        panel API memory cache, then re-fetches live state from each node.
                      </p>
                      <Button type="button" variant="subtle" onClick={refreshServerStates} disabled={refreshingStates}>
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingStates ? 'animate-spin' : ''}`} />
                        {refreshingStates ? 'Refreshing…' : 'Refresh all server states'}
                      </Button>
                      {refreshStatesResult && (
                        <div
                          className="mt-3 rounded-lg border px-3 py-2 text-xs"
                          style={{
                            borderColor: refreshStatesResult.ok ? 'var(--success-border)' : 'var(--danger-border)',
                            background: refreshStatesResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: refreshStatesResult.ok ? 'var(--success-fg)' : 'var(--danger-fg)',
                          }}
                        >
                          {refreshStatesResult.message}
                        </div>
                      )}
                    </AdminSettingsPanel>
                    </>
                  )}
                </div>

                <div className="xl:sticky xl:top-0">
                  <AdminSidebarCard title="Live preview">
                    <BrandingPreview
                      panelName={branding.panelName}
                      tagline={branding.tagline}
                      loginMessage={branding.loginMessage}
                      logoUrl={branding.logoUrl}
                      accentColor={branding.accentColor}
                      secondaryColor={branding.secondaryColor}
                      appearance={branding}
                    />
                    <div className="mt-3 space-y-1 text-[11px] text-[var(--muted)]">
                      <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Registration {registration ? 'open' : 'closed'}</p>
                      <p className="flex items-center gap-1"><Store className="h-3 w-3" /> Marketplace {marketplace.enabled ? 'enabled' : 'disabled'}</p>
                      <p className="flex items-center gap-1"><Lock className="h-3 w-3" /> Min password: {security.minPasswordLength} chars</p>
                      <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Turnstile {turnstile.enabled ? 'on' : 'off'}</p>
                    </div>
                  </AdminSidebarCard>

                  <div className="mt-4">
                    <AdminSidebarCard title="About">
                      <AuthorAttribution variant="settings" />
                    </AdminSidebarCard>
                  </div>
                </div>
              </div>

              <AdminSaveBar hasChanges={hasChanges} saving={saving} error={error} saved={saved} onReset={resetForm} />
            </form>
          )}
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
