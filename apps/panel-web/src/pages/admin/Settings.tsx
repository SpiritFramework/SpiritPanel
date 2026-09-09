import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Globe,
  KeyRound,
  Mail,
  Send,
  Shield,
  Sparkles,
  RefreshCw,
  LifeBuoy,
  Type,
  UserPlus,
  Wrench,
  RotateCcw,
  Save,
  Copy,
  Settings as SettingsIcon,
} from 'lucide-react';
import { api, type BrandingAssetKind } from '../../lib/api';
import { generateAppIcon as renderAppIcon } from '../../lib/app-icon';
import { useBranding } from '../../context/BrandingContext';
import {
  normalizeAppearance,
  type BrandingAppearance,
} from '../../lib/branding-appearance';
import {
  DEFAULT_GENERAL,
  DEFAULT_MAINTENANCE,
  DEFAULT_TICKETS,
  DEFAULT_SECURITY,
  type PanelGeneralSettings,
  type PanelMaintenanceSettings,
  type PanelTicketsSettings,
  type PanelSecuritySettings,
} from '../../lib/panel-settings';
import { AdminLayout, Button, Input, Textarea } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { NodeOverviewSection } from '../../components/admin/node-detail/NodeDetailShell';
import {
  SettingsHeader,
  isSettingsTab,
  type SettingsTab,
} from '../../components/admin/settings/SettingsHeader';
import { SettingsSidebar } from '../../components/admin/settings/SettingsSidebar';
import { SettingsAboutPanel } from '../../components/admin/settings/SettingsAboutPanel';
import {
  DEFAULT_BRANDING_FORM,
  DEFAULT_SMTP_FORM,
  type BrandingForm,
  type SmtpForm,
} from '../../components/admin/settings/settings-types';
import { ColorField } from '../../components/BrandingFields';
import { BrandingStudio } from '../../features/branding-studio';
import { Checkbox } from '../../components/Checkbox';
import { DiscordIcon } from '../../components/icons/DiscordIcon';
import { EmailTemplatesPanel } from '../../components/admin/EmailTemplatesPanel';
import { DsIcon, EmptyState } from '../../components/ui';
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_TURNSTILE_FORM,
  DEFAULT_DISCORD_AUTH_FORM,
  DEFAULT_CLOUDFLARE_DNS_FORM,
  type EmailTemplatesSettings,
  type TurnstileForm,
  type DiscordAuthForm,
  type CloudflareDnsForm,
} from '../../lib/email-templates';

export function AdminSettings() {
  const { refreshBranding } = useBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: SettingsTab = isSettingsTab(tabParam) ? tabParam : 'branding';
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  function applyTab(next: SettingsTab) {
    setSearchParams({ tab: next }, { replace: true });
  }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [branding, setBranding] = useState<BrandingForm>(DEFAULT_BRANDING_FORM);
  const [general, setGeneral] = useState<PanelGeneralSettings>(DEFAULT_GENERAL);
  const [maintenance, setMaintenance] = useState<PanelMaintenanceSettings>(DEFAULT_MAINTENANCE);
  const [security, setSecurity] = useState<PanelSecuritySettings>(DEFAULT_SECURITY);
  const [registration, setRegistration] = useState(false);
  const [tickets, setTickets] = useState<PanelTicketsSettings>(DEFAULT_TICKETS);
  const [smtp, setSmtp] = useState<SmtpForm>(DEFAULT_SMTP_FORM);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesSettings>(DEFAULT_EMAIL_TEMPLATES);
  const [turnstile, setTurnstile] = useState<TurnstileForm>(DEFAULT_TURNSTILE_FORM);
  const [turnstileSecretSet, setTurnstileSecretSet] = useState(false);
  const [discordAuth, setDiscordAuth] = useState<DiscordAuthForm>(DEFAULT_DISCORD_AUTH_FORM);
  const [discordSecretSet, setDiscordSecretSet] = useState(false);
  const [discordRedirectUri, setDiscordRedirectUri] = useState('');
  const [copiedDiscordRedirect, setCopiedDiscordRedirect] = useState(false);
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

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const s = await api.admin.settings();
      const b = (s.branding ?? {}) as Partial<BrandingForm>;
      const nextBranding: BrandingForm = {
        ...DEFAULT_BRANDING_FORM,
        panelName: b.panelName ?? DEFAULT_BRANDING_FORM.panelName,
        tagline: b.tagline ?? DEFAULT_BRANDING_FORM.tagline,
        accentColor: b.accentColor ?? DEFAULT_BRANDING_FORM.accentColor,
        secondaryColor: b.secondaryColor ?? DEFAULT_BRANDING_FORM.secondaryColor,
        logoUrl: b.logoUrl ?? '',
        faviconUrl: b.faviconUrl ?? '',
        // Must round-trip, or saving branding would clear the generated icon.
        appIconUrl: b.appIconUrl ?? '',
        loginMessage: b.loginMessage ?? DEFAULT_BRANDING_FORM.loginMessage,
        ...normalizeAppearance(b as Partial<BrandingAppearance>),
      };
      const nextGeneral = { ...DEFAULT_GENERAL, ...(s.general as PanelGeneralSettings | undefined) };
      const nextMaintenance = { ...DEFAULT_MAINTENANCE, ...(s.maintenance as PanelMaintenanceSettings | undefined) };
      const nextSecurity = { ...DEFAULT_SECURITY, ...(s.security as PanelSecuritySettings | undefined) };
      const nextRegistration = Boolean((s.registration_enabled as { enabled?: boolean } | undefined)?.enabled);
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
      const rawDiscord = (s.discord_auth ?? {}) as Partial<DiscordAuthForm> & {
        clientSecretSet?: boolean;
        redirectUri?: string;
      };
      const nextDiscord: DiscordAuthForm = {
        enabled: Boolean(rawDiscord.enabled),
        clientId: rawDiscord.clientId ?? '',
        clientSecret: '',
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
      setTickets(nextTickets);
      setSmtp(nextSmtp);
      setSmtpPasswordSet(Boolean(rawSmtp.passwordSet));
      setEmailTemplates(nextEmailTemplates);
      setTurnstile(nextTurnstile);
      setTurnstileSecretSet(Boolean(rawTurnstile.secretKeySet));
      setDiscordAuth(nextDiscord);
      setDiscordSecretSet(Boolean(rawDiscord.clientSecretSet));
      setDiscordRedirectUri(rawDiscord.redirectUri ?? '');
      setCloudflareDns(nextCloudflare);
      setCloudflareTokenSet(Boolean(rawCf.apiTokenSet));
      setInitial(JSON.stringify({
        branding: nextBranding,
        general: nextGeneral,
        maintenance: nextMaintenance,
        security: nextSecurity,
        registration: nextRegistration,
        tickets: nextTickets,
        smtp: nextSmtp,
        emailTemplates: nextEmailTemplates,
        turnstile: nextTurnstile,
        discordAuth: nextDiscord,
        cloudflareDns: nextCloudflare,
      }));
    } catch (err) {
      setInitial('');
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (tab !== 'branding') {
      void refreshBranding();
    }
  }, [tab, refreshBranding]);

  const hasChanges = useMemo(() => {
    if (loading || loadError || !initial) return false;
    return initial !== JSON.stringify({ branding, general, maintenance, security, registration, tickets, smtp, emailTemplates, turnstile, discordAuth, cloudflareDns });
  }, [branding, general, maintenance, security, registration, tickets, smtp, emailTemplates, turnstile, discordAuth, cloudflareDns, initial, loading, loadError]);

  function setTab(next: SettingsTab) {
    if (next === tab) return;
    if (hasChanges) {
      setPendingTab(next);
      setLeaveConfirmOpen(true);
      return;
    }
    applyTab(next);
  }

  // Note: useBlocker requires createBrowserRouter; this app uses BrowserRouter.
  // Tab switches are guarded above; full route leaves use beforeunload only.
  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  function discardPendingLeave() {
    setLeaveConfirmOpen(false);
    setPendingTab(null);
  }

  function confirmPendingLeave() {
    const nextTab = pendingTab;
    setLeaveConfirmOpen(false);
    setPendingTab(null);
    resetForm();
    if (nextTab) applyTab(nextTab);
  }

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
      const discordPayload: Record<string, unknown> = {
        enabled: discordAuth.enabled,
        clientId: discordAuth.clientId.trim(),
      };
      if (discordAuth.clientSecret) discordPayload.clientSecret = discordAuth.clientSecret;
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
        tickets,
        smtp: smtpPayload,
        email_templates: emailTemplates,
        turnstile: turnstilePayload,
        discord_auth: discordPayload,
        cloudflare_dns: cloudflarePayload,
      });
      await refreshBranding();
      if (smtp.password) setSmtpPasswordSet(true);
      if (turnstile.secretKey) setTurnstileSecretSet(true);
      if (discordAuth.clientSecret) setDiscordSecretSet(true);
      if (cloudflareDns.apiToken) setCloudflareTokenSet(true);
      setSmtp((prev) => ({ ...prev, password: '' }));
      setTurnstile((prev) => ({ ...prev, secretKey: '' }));
      setDiscordAuth((prev) => ({ ...prev, clientSecret: '' }));
      setCloudflareDns((prev) => ({ ...prev, apiToken: '' }));
      setInitial(JSON.stringify({
        branding,
        general,
        maintenance,
        security,
        registration,
        tickets,
        smtp: { ...smtp, password: '' },
        emailTemplates,
        turnstile: { ...turnstile, secretKey: '' },
        discordAuth: { ...discordAuth, clientSecret: '' },
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
      tickets: PanelTicketsSettings;
      smtp: SmtpForm;
      emailTemplates: EmailTemplatesSettings;
      turnstile: TurnstileForm;
      discordAuth: DiscordAuthForm;
      cloudflareDns: CloudflareDnsForm;
    };
    setBranding(s.branding);
    setGeneral(s.general);
    setMaintenance(s.maintenance);
    setSecurity(s.security);
    setRegistration(s.registration);
    setTickets(s.tickets);
    setSmtp(s.smtp);
    setEmailTemplates(s.emailTemplates);
    setTurnstile(s.turnstile);
    setDiscordAuth(s.discordAuth);
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

  /** Asset endpoints all return the full branding record; mirror it into the form. */
  async function syncAssetUrls(branding: Record<string, unknown>) {
    const b = branding as unknown as BrandingForm;
    setBranding((prev) => ({
      ...prev,
      logoUrl: b.logoUrl ?? prev.logoUrl,
      faviconUrl: b.faviconUrl ?? prev.faviconUrl,
      appIconUrl: b.appIconUrl ?? prev.appIconUrl,
    }));
    await refreshBranding();
  }

  async function uploadAsset(kind: BrandingAssetKind, file: File) {
    const data = await fileToBase64(file);
    const res = await api.admin.uploadBrandingAsset(kind, data, file.type);
    await syncAssetUrls(res.branding);
  }

  async function applyAssetUrl(kind: BrandingAssetKind, url: string) {
    const res = await api.admin.setBrandingAssetUrl(kind, url);
    await syncAssetUrls(res.branding);
  }

  async function removeAsset(kind: BrandingAssetKind) {
    const res = await api.admin.deleteBrandingAsset(kind);
    await syncAssetUrls(res.branding);
  }

  async function storeAppIcon(src: string) {
    const icon = await renderAppIcon(src, branding.accentColor, branding.secondaryColor);
    const res = await api.admin.uploadBrandingAsset('appicon', icon.base64, 'image/png');
    await syncAssetUrls(res.branding);
  }

  /** Renders the square install icon from an existing branding image. */
  async function generateAppIcon(source: 'logo' | 'favicon') {
    const src = source === 'logo' ? branding.logoUrl : branding.faviconUrl;
    if (!src) throw new Error(`Upload a ${source} first`);
    await storeAppIcon(src);
  }

  /**
   * Direct uploads go through the same padding step as generated icons, so the
   * stored icon is always crop-safe for Android's circular mask and a
   * predictable 512x512.
   */
  async function uploadAppIcon(file: File) {
    const objectUrl = URL.createObjectURL(file);
    try {
      await storeAppIcon(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  if (loadError || !initial) {
    return (
      <AdminLayout>
        <EmptyState
          icon={<DsIcon icon={SettingsIcon} className="ds-icon--md" />}
          title="Couldn't load settings"
          description={loadError || 'Settings did not load. Retry before making changes — defaults are not shown as saved values.'}
          action={
            <Button type="button" onClick={() => void loadSettings()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </Button>
          }
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="ds-set-page"
      >
        <SettingsHeader
          activeTab={tab}
          onTabChange={setTab}
          registrationOpen={registration}
          maintenanceOn={maintenance.enabled}
          smtpEnabled={smtp.enabled}
          turnstileOn={turnstile.enabled}
          ticketsEnabled={tickets.enabled}
        />

        <div className={`ds-set-workspace${tab === 'about' || tab === 'branding' ? ' ds-set-workspace--full' : ''}`}>
          <div className="ds-set-main">
                  {tab === 'branding' && (
                    <BrandingStudio
                      branding={branding}
                      general={general}
                      onBrandingChange={setBranding}
                      onGeneralChange={setGeneral}
                      onUploadAsset={uploadAsset}
                      onApplyAssetUrl={applyAssetUrl}
                      onRemoveAsset={removeAsset}
                      onGenerateAppIcon={generateAppIcon}
                      onUploadAppIcon={uploadAppIcon}
                    />
                  )}

                  {tab === 'features' && (
                    <>
                      <NodeOverviewSection title="Registration" description="Control whether visitors can create their own accounts" icon={UserPlus}>
                        <Checkbox
                          label="Allow public registration"
                          description="Allow new users to sign up at /signup and show a link on the login page"
                          checked={registration}
                          onChange={setRegistration}
                        />
                      </NodeOverviewSection>
                      <NodeOverviewSection title="Support tickets" description="Let users open tickets for billing, account, and server help" icon={LifeBuoy}>
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
                      </NodeOverviewSection>
                    </>
                  )}

                  {tab === 'security' && (
                    <>
                      <NodeOverviewSection title="Password policy" description="Account security defaults for registration and admin-created users" icon={KeyRound}>
                        <div className="space-y-4">
                          <div className="max-w-xs">
                            <Input
                              label="Minimum password length"
                              type="number"
                              min={8}
                              max={128}
                              value={String(security.minPasswordLength)}
                              onChange={(e) => setSecurity({ ...security, minPasswordLength: Number(e.target.value) || 8 })}
                            />
                          </div>
                          <Checkbox
                            label="Block common weak passwords"
                            description="Reject passwords that appear on common breach lists during registration and password changes"
                            checked={security.blockWeakPasswords ?? true}
                            onChange={(blockWeakPasswords) => setSecurity({ ...security, blockWeakPasswords })}
                          />
                          <Checkbox
                            label="Allow admin server support access"
                            description="Let panel staff open servers for support when permitted by your policy"
                            checked={security.adminServerSupport ?? true}
                            onChange={(adminServerSupport) => setSecurity({ ...security, adminServerSupport })}
                          />
                        </div>
                      </NodeOverviewSection>
                      <NodeOverviewSection
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
                      </NodeOverviewSection>
                      <NodeOverviewSection
                        title="Discord login"
                        description="Let users link Discord in Security, then sign in with Discord or their password"
                        icon={DiscordIcon}
                      >
                        <div className="space-y-4">
                          <Checkbox
                            label="Enable Discord login"
                            description="Requires a Discord application client ID and secret. Users must still create a panel account and link Discord themselves."
                            checked={discordAuth.enabled}
                            onChange={(enabled) => setDiscordAuth({ ...discordAuth, enabled })}
                          />
                          <div className="grid w-full gap-4 sm:grid-cols-2">
                            <Input
                              label="Client ID"
                              value={discordAuth.clientId}
                              onChange={(e) => setDiscordAuth({ ...discordAuth, clientId: e.target.value })}
                              placeholder="Application ID"
                              autoComplete="off"
                            />
                            <Input
                              label="Client secret"
                              type="password"
                              value={discordAuth.clientSecret}
                              onChange={(e) => setDiscordAuth({ ...discordAuth, clientSecret: e.target.value })}
                              placeholder={discordSecretSet ? '•••••••• (unchanged)' : 'Client secret'}
                              autoComplete="new-password"
                            />
                          </div>
                          {discordRedirectUri ? (
                            <div className="max-w-xl">
                              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Redirect URL</label>
                              <div className="flex gap-2">
                                <input
                                  readOnly
                                  value={discordRedirectUri}
                                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--text)]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(discordRedirectUri);
                                    setCopiedDiscordRedirect(true);
                                    setTimeout(() => setCopiedDiscordRedirect(false), 1500);
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  {copiedDiscordRedirect ? 'Copied' : 'Copy'}
                                </Button>
                              </div>
                              <p className="mt-1.5 text-xs text-[var(--muted)]">
                                Paste this into the Discord app → OAuth2 → Redirects. Create an app at{' '}
                                <a
                                  href="https://discord.com/developers/applications"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="accent-text underline"
                                >
                                  Discord Developer Portal
                                </a>
                                .
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </NodeOverviewSection>
                      <NodeOverviewSection
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
                      </NodeOverviewSection>
                    </>
                  )}

                  {tab === 'email' && (
                    <>
                      <NodeOverviewSection title="SMTP delivery" description="Outbound mail for password resets and notifications" icon={Mail}>
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
                      </NodeOverviewSection>

                      <NodeOverviewSection title="Send a test email" description="Confirm delivery using the values currently in the form" icon={Send}>
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
                      </NodeOverviewSection>

                      <NodeOverviewSection
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
                      </NodeOverviewSection>
                    </>
                  )}

                  {tab === 'system' && (
                    <>
                    <NodeOverviewSection
                      title="Maintenance mode"
                      description="Temporarily block normal users while you work on the panel"
                      icon={Wrench}
                      badge={maintenance.enabled ? 'Active' : undefined}
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
                    </NodeOverviewSection>

                    <NodeOverviewSection
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
                    </NodeOverviewSection>
                    </>
                  )}

                  {tab === 'about' && <SettingsAboutPanel />}
          </div>

          <SettingsSidebar
            tab={tab}
            registration={registration}
            tickets={tickets}
            security={security}
            turnstile={turnstile}
            smtpEnabled={smtp.enabled}
            maintenanceOn={maintenance.enabled}
          />
        </div>

        <div
          className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : saved ? ' ds-nd-st-savebar--saved' : ''}`}
          role="status"
        >
          <div className="ds-nd-st-savebar-status">
            {error ? (
              <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
            ) : saved ? (
              <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Changes saved</span>
            ) : hasChanges ? (
              <span className="ds-nd-st-savebar-msg">
                <span className="ds-nd-st-savebar-dot" aria-hidden />
                Unsaved changes
              </span>
            ) : (
              <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">All changes saved</span>
            )}
          </div>
          <div className="ds-nd-st-savebar-actions">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={!hasChanges || saving}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </Button>
            <Button type="submit" size="sm" disabled={saving || !hasChanges}>
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={leaveConfirmOpen}
        title="Discard unsaved changes?"
        description="You have unsaved settings changes. Leave this section without saving?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onClose={discardPendingLeave}
        onConfirm={confirmPendingLeave}
      />
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
