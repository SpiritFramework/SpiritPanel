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
  LifeBuoy,
  Type,
  UserPlus,
  Wrench,
  Palette,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import {
  applyAppearanceDataset,
  DEFAULT_BRANDING_APPEARANCE,
  normalizeAppearance,
  type BrandingAppearance,
} from '../../lib/branding-appearance';
import { ACCENT_PALETTE_PRESETS, THEME_PALETTES, applySurfacePreset } from '../../lib/branding-theme-palettes';
import {
  DEFAULT_GENERAL,
  DEFAULT_MAINTENANCE,
  DEFAULT_MARKETPLACE,
  DEFAULT_MINECRAFT_PLUGINS,
  DEFAULT_TICKETS,
  DEFAULT_SECURITY,
  type PanelGeneralSettings,
  type PanelMaintenanceSettings,
  type PanelMarketplaceSettings,
  type PanelMinecraftPluginsSettings,
  type PanelTicketsSettings,
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
  DEFAULT_CLOUDFLARE_DNS_FORM,
  type EmailTemplatesSettings,
  type TurnstileForm,
  type CloudflareDnsForm,
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
  const [minecraftPlugins, setMinecraftPlugins] = useState<PanelMinecraftPluginsSettings>(DEFAULT_MINECRAFT_PLUGINS);
  const [tickets, setTickets] = useState<PanelTicketsSettings>(DEFAULT_TICKETS);
  const [smtp, setSmtp] = useState<SmtpForm>(DEFAULT_SMTP_FORM);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesSettings>(DEFAULT_EMAIL_TEMPLATES);
  const [turnstile, setTurnstile] = useState<TurnstileForm>(DEFAULT_TURNSTILE_FORM);
  const [turnstileSecretSet, setTurnstileSecretSet] = useState(false);
  const [cloudflareDns, setCloudflareDns] = useState<CloudflareDnsForm>(DEFAULT_CLOUDFLARE_DNS_FORM);
  const [cloudflareTokenSet, setCloudflareTokenSet] = useState(false);
  const [cfTestResult, setCfTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [cfTesting, setCfTesting] = useState(false);
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
      const nextMinecraftPlugins = {
        ...DEFAULT_MINECRAFT_PLUGINS,
        ...(s.minecraft_plugins as PanelMinecraftPluginsSettings | undefined),
      };
      const nextTickets = { ...DEFAULT_TICKETS, ...(s.tickets as PanelTicketsSettings | undefined) };
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
      const rawCf = (s.cloudflare_dns ?? {}) as Partial<CloudflareDnsForm> & {
        apiTokenSet?: boolean;
        reservedSlugs?: string[] | string;
      };
      const reservedText = Array.isArray(rawCf.reservedSlugs)
        ? rawCf.reservedSlugs.join(', ')
        : typeof rawCf.reservedSlugs === 'string'
          ? rawCf.reservedSlugs
          : DEFAULT_CLOUDFLARE_DNS_FORM.reservedSlugs;
      const nextCloudflare: CloudflareDnsForm = {
        enabled: Boolean(rawCf.enabled),
        apiToken: '',
        zoneId: rawCf.zoneId ?? '',
        baseDomain: rawCf.baseDomain ?? '',
        reservedSlugs: reservedText,
      };

      setBranding(nextBranding);
      setGeneral(nextGeneral);
      setMaintenance(nextMaintenance);
      setSecurity(nextSecurity);
      setRegistration(nextRegistration);
      setMarketplace(nextMarketplace);
      setMinecraftPlugins(nextMinecraftPlugins);
      setTickets(nextTickets);
      setSmtp(nextSmtp);
      setSmtpPasswordSet(Boolean(rawSmtp.passwordSet));
      setEmailTemplates(nextEmailTemplates);
      setTurnstile(nextTurnstile);
      setTurnstileSecretSet(Boolean(rawTurnstile.secretKeySet));
      setCloudflareDns(nextCloudflare);
      setCloudflareTokenSet(Boolean(rawCf.apiTokenSet));
      setInitial(JSON.stringify({
        branding: nextBranding,
        general: nextGeneral,
        maintenance: nextMaintenance,
        security: nextSecurity,
        registration: nextRegistration,
        marketplace: nextMarketplace,
        minecraftPlugins: nextMinecraftPlugins,
        tickets: nextTickets,
        smtp: nextSmtp,
        emailTemplates: nextEmailTemplates,
        turnstile: nextTurnstile,
        cloudflareDns: nextCloudflare,
      }));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'branding' || loading) return;
    const root = document.documentElement;
    const appearance = normalizeAppearance(branding);
    applyAppearanceDataset(root, appearance);
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
    return initial !== JSON.stringify({ branding, general, maintenance, security, registration, marketplace, minecraftPlugins, tickets, smtp, emailTemplates, turnstile, cloudflareDns });
  }, [branding, general, maintenance, security, registration, marketplace, minecraftPlugins, tickets, smtp, emailTemplates, turnstile, cloudflareDns, initial, loading]);

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
      const cloudflarePayload: Record<string, unknown> = {
        enabled: cloudflareDns.enabled,
        zoneId: cloudflareDns.zoneId.trim(),
        baseDomain: cloudflareDns.baseDomain.trim().toLowerCase(),
        reservedSlugs: cloudflareDns.reservedSlugs
          .split(/[,\n]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      };
      if (cloudflareDns.apiToken) cloudflarePayload.apiToken = cloudflareDns.apiToken;
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
        minecraft_plugins: minecraftPlugins,
        tickets,
        smtp: smtpPayload,
        email_templates: emailTemplates,
        turnstile: turnstilePayload,
        cloudflare_dns: cloudflarePayload,
      });
      await refreshBranding();
      if (smtp.password) setSmtpPasswordSet(true);
      if (turnstile.secretKey) setTurnstileSecretSet(true);
      if (cloudflareDns.apiToken) setCloudflareTokenSet(true);
      setSmtp((prev) => ({ ...prev, password: '' }));
      setTurnstile((prev) => ({ ...prev, secretKey: '' }));
      setCloudflareDns((prev) => ({ ...prev, apiToken: '' }));
      setInitial(JSON.stringify({
        branding,
        general,
        maintenance,
        security,
        registration,
        marketplace,
        minecraftPlugins,
        tickets,
        smtp: { ...smtp, password: '' },
        emailTemplates,
        turnstile: { ...turnstile, secretKey: '' },
        cloudflareDns: { ...cloudflareDns, apiToken: '' },
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
      minecraftPlugins: PanelMinecraftPluginsSettings;
      tickets: PanelTicketsSettings;
      smtp: SmtpForm;
      emailTemplates: EmailTemplatesSettings;
      turnstile: TurnstileForm;
      cloudflareDns: CloudflareDnsForm;
    };
    setBranding(s.branding);
    setGeneral(s.general);
    setMaintenance(s.maintenance);
    setSecurity(s.security);
    setRegistration(s.registration);
    setMarketplace(s.marketplace);
    setMinecraftPlugins(s.minecraftPlugins);
    setTickets(s.tickets);
    setSmtp(s.smtp);
    setEmailTemplates(s.emailTemplates);
    setTurnstile(s.turnstile);
    setCloudflareDns(s.cloudflareDns);
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
                ? marketplace.allowGithubInstalls
                  ? 'GitHub'
                  : 'Off'
                : 'Off',
            },
            {
              icon: LifeBuoy,
              label: 'Tickets',
              value: tickets.enabled
                ? tickets.discordWebhookEnabled
                  ? 'On · Discord'
                  : 'Enabled'
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
                          panelAmbient={branding.panelAmbient}
                          serverCardStyle={branding.serverCardStyle}
                          adminSidebarStyle={branding.adminSidebarStyle}
                          clientSidebarStyle={branding.clientSidebarStyle}
                          serverSidebarStyle={branding.serverSidebarStyle}
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
                          onPanelAmbientChange={(panelAmbient) => setBranding({ ...branding, panelAmbient })}
                          onServerCardStyleChange={(serverCardStyle) => setBranding({ ...branding, serverCardStyle })}
                          onAdminSidebarStyleChange={(adminSidebarStyle) => setBranding({ ...branding, adminSidebarStyle })}
                          onClientSidebarStyleChange={(clientSidebarStyle) => setBranding({ ...branding, clientSidebarStyle })}
                          onServerSidebarStyleChange={(serverSidebarStyle) => setBranding({ ...branding, serverSidebarStyle })}
                          surfaceRadius={branding.surfaceRadius}
                          sidebarMaterial={branding.sidebarMaterial}
                          contentDensity={branding.contentDensity}
                          motionPreference={branding.motionPreference}
                          serverListDefaultView={branding.serverListDefaultView}
                          adminTabsStyle={branding.adminTabsStyle}
                          loginAmbientLevel={branding.loginAmbientLevel}
                          showHeroStripe={branding.showHeroStripe}
                          onSurfaceRadiusChange={(surfaceRadius) => setBranding({ ...branding, surfaceRadius })}
                          onSidebarMaterialChange={(sidebarMaterial) => setBranding({ ...branding, sidebarMaterial })}
                          onContentDensityChange={(contentDensity) => setBranding({ ...branding, contentDensity })}
                          onMotionPreferenceChange={(motionPreference) => setBranding({ ...branding, motionPreference })}
                          onServerListDefaultViewChange={(serverListDefaultView) => setBranding({ ...branding, serverListDefaultView })}
                          onAdminTabsStyleChange={(adminTabsStyle) => setBranding({ ...branding, adminTabsStyle })}
                          onLoginAmbientLevelChange={(loginAmbientLevel) => setBranding({ ...branding, loginAmbientLevel })}
                          onShowHeroStripeChange={(showHeroStripe) => setBranding({ ...branding, showHeroStripe })}
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
                      <AdminSettingsPanel title="FiveM marketplace" description="Let users browse and install FiveM resources from GitHub" icon={Store}>
                        <div className="space-y-3">
                          <Checkbox
                            label="Enable FiveM marketplace"
                            description="When off, the marketplace tab is hidden from users and install APIs return forbidden."
                            checked={marketplace.enabled}
                            onChange={(enabled) => setMarketplace((m) => ({ ...m, enabled }))}
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
                      <AdminSettingsPanel title="Minecraft plugins" description="One-click Modrinth installs for Paper, Fabric, Forge, and other Minecraft platforms" icon={Store}>
                        <div className="space-y-3">
                          <Checkbox
                            label="Enable Minecraft plugin store"
                            description="When off, the Plugins tab is hidden on Minecraft servers."
                            checked={minecraftPlugins.enabled}
                            onChange={(enabled) => setMinecraftPlugins((m) => ({ ...m, enabled }))}
                          />
                          <Checkbox
                            label="Allow Modrinth installs"
                            description="Download plugins/mods/datapacks from Modrinth into the server filesystem."
                            checked={minecraftPlugins.allowModrinthInstalls}
                            disabled={!minecraftPlugins.enabled}
                            onChange={(allowModrinthInstalls) =>
                              setMinecraftPlugins((m) => ({ ...m, allowModrinthInstalls }))
                            }
                          />
                        </div>
                      </AdminSettingsPanel>
                      <AdminSettingsPanel title="Support tickets" description="Let users open tickets for billing, account, and server help" icon={LifeBuoy}>
                        <div className="space-y-3">
                          <Checkbox
                            label="Enable support tickets"
                            description="When off, the Support tab is hidden and ticket APIs return forbidden."
                            checked={tickets.enabled}
                            onChange={(enabled) => setTickets((t) => ({ ...t, enabled }))}
                          />
                          <Checkbox
                            label="Allow server-specific tickets"
                            description="Users can link a ticket to one of their servers."
                            checked={tickets.allowServerTickets}
                            disabled={!tickets.enabled}
                            onChange={(allowServerTickets) => setTickets((t) => ({ ...t, allowServerTickets }))}
                          />
                          <Checkbox
                            label="Require server selection"
                            description="Users must pick a server when opening a ticket."
                            checked={tickets.requireServer}
                            disabled={!tickets.enabled || !tickets.allowServerTickets}
                            onChange={(requireServer) => setTickets((t) => ({ ...t, requireServer }))}
                          />
                          <div className="max-w-xs">
                            <Input
                              label="Max open tickets per user"
                              type="number"
                              min={1}
                              max={50}
                              value={String(tickets.maxOpenPerUser)}
                              disabled={!tickets.enabled}
                              onChange={(e) =>
                                setTickets((t) => ({
                                  ...t,
                                  maxOpenPerUser: Math.min(50, Math.max(1, Number(e.target.value) || 10)),
                                }))
                              }
                            />
                          </div>
                          <div className="border-t border-[var(--border)] pt-3">
                            <Checkbox
                              label="Discord notifications"
                              description="Send a message to Discord when a user opens a ticket or replies."
                              checked={tickets.discordWebhookEnabled}
                              disabled={!tickets.enabled}
                              onChange={(discordWebhookEnabled) =>
                                setTickets((t) => ({ ...t, discordWebhookEnabled }))
                              }
                            />
                            <div className="mt-3 max-w-xl">
                              <Input
                                label="Discord webhook URL"
                                type="url"
                                placeholder={
                                  tickets.discordWebhookUrlSet
                                    ? 'Webhook saved — paste a new URL to replace'
                                    : 'https://discord.com/api/webhooks/…'
                                }
                                value={tickets.discordWebhookUrl}
                                disabled={!tickets.enabled || !tickets.discordWebhookEnabled}
                                onChange={(e) =>
                                  setTickets((t) => ({ ...t, discordWebhookUrl: e.target.value }))
                                }
                                hint="Discord channel → Edit channel → Integrations → Webhooks → New webhook → Copy webhook URL"
                              />
                            </div>
                          </div>
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
                      <AdminSettingsPanel
                        title="Cloudflare DNS (subdomains)"
                        description="Let users create one subdomain per server under your zone (DNS-only A/AAAA)"
                        icon={Globe}
                      >
                        <div className="space-y-4">
                          <Checkbox
                            label="Enable subdomain manager"
                            description="Users can create slug.yourdomain.com pointing at their server IP"
                            checked={cloudflareDns.enabled}
                            onChange={(enabled) => setCloudflareDns({ ...cloudflareDns, enabled })}
                          />
                          <div className="grid w-full gap-4 sm:grid-cols-2">
                            <Input
                              label="API token"
                              type="password"
                              value={cloudflareDns.apiToken}
                              onChange={(e) => setCloudflareDns({ ...cloudflareDns, apiToken: e.target.value })}
                              placeholder={cloudflareTokenSet ? '•••••••• (unchanged)' : 'Cloudflare API token'}
                              autoComplete="new-password"
                            />
                            <Input
                              label="Zone ID"
                              value={cloudflareDns.zoneId}
                              onChange={(e) => setCloudflareDns({ ...cloudflareDns, zoneId: e.target.value })}
                              placeholder="32-character zone id"
                              autoComplete="off"
                            />
                          </div>
                          <Input
                            label="Base domain"
                            value={cloudflareDns.baseDomain}
                            onChange={(e) => setCloudflareDns({ ...cloudflareDns, baseDomain: e.target.value })}
                            placeholder="spirithost.co.uk"
                            hint="Users create subdomains like fivemrp.spirithost.co.uk — not the panel hostname"
                          />
                          <Textarea
                            label="Reserved slugs"
                            value={cloudflareDns.reservedSlugs}
                            onChange={(e) => setCloudflareDns({ ...cloudflareDns, reservedSlugs: e.target.value })}
                            rows={3}
                            hint="Comma-separated names users cannot claim (panel, www, api, …)"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={cfTesting}
                              onClick={async () => {
                                setCfTesting(true);
                                setCfTestResult(null);
                                try {
                                  const result = await api.admin.testCloudflareDns({
                                    apiToken: cloudflareDns.apiToken || undefined,
                                    zoneId: cloudflareDns.zoneId || undefined,
                                  });
                                  setCfTestResult({
                                    ok: true,
                                    message: result.zoneName
                                      ? `Connected to zone ${result.zoneName}`
                                      : 'Cloudflare credentials look good',
                                  });
                                } catch (err) {
                                  setCfTestResult({
                                    ok: false,
                                    message: err instanceof Error ? err.message : 'Cloudflare test failed',
                                  });
                                } finally {
                                  setCfTesting(false);
                                }
                              }}
                            >
                              {cfTesting ? 'Testing…' : 'Test Cloudflare'}
                            </Button>
                            {cfTestResult && (
                              <span className={cfTestResult.ok ? 'text-xs text-emerald-400' : 'text-xs text-rose-400'}>
                                {cfTestResult.message}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            Create an API token with Zone → DNS → Edit on this zone. Records are always
                            DNS-only (not proxied) so game ports work. Minecraft Java eggs also get an
                            SRV record so players can join with the hostname only on random ports. Set
                            each node’s public IP if allocations use 0.0.0.0.
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
                      <p className="flex items-center gap-1"><Store className="h-3 w-3" /> MC plugins {minecraftPlugins.enabled ? 'enabled' : 'disabled'}</p>
                      <p className="flex items-center gap-1"><LifeBuoy className="h-3 w-3" /> Tickets {tickets.enabled ? 'enabled' : 'disabled'}</p>
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
