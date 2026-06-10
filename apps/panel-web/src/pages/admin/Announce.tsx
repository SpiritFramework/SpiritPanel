import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Eye, Megaphone, Monitor, Server } from 'lucide-react';
import { api } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import {
  DEFAULT_ANNOUNCEMENT,
  type PanelAnnouncementSettings,
} from '../../lib/panel-settings';
import { AdminLayout, Input, Select, Textarea } from '../../components/Layout';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminFormStatus,
  AdminSaveBar,
  AdminSettingsPanel,
} from '../../components/AdminDetailLayout';
import { Checkbox } from '../../components/Checkbox';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { Spinner } from '../../components/ui';

const TONE_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
];

export function AdminAnnouncePage() {
  const { refreshBranding } = useBranding();
  const [announcement, setAnnouncement] = useState<PanelAnnouncementSettings>(DEFAULT_ANNOUNCEMENT);
  const [saved, setSaved] = useState<PanelAnnouncementSettings>(DEFAULT_ANNOUNCEMENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const settings = await api.admin.settings();
        const raw = settings.announcement as Partial<PanelAnnouncementSettings> | undefined;
        const next = { ...DEFAULT_ANNOUNCEMENT, ...raw };
        setAnnouncement(next);
        setSaved(next);
      } catch {
        setError('Failed to load announcement settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges =
    announcement.enabled !== saved.enabled ||
    announcement.title !== saved.title ||
    announcement.message !== saved.message ||
    announcement.tone !== saved.tone ||
    announcement.showOnServers !== saved.showOnServers ||
    announcement.showOnConsole !== saved.showOnConsole ||
    announcement.dismissible !== saved.dismissible;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (announcement.enabled && !announcement.message.trim()) {
      setError('Message is required when the announcement is enabled');
      return;
    }

    setSaving(true);
    setError('');
    setSavedFlash(false);
    try {
      await api.admin.updateSettings({ announcement });
      const settings = await api.admin.settings();
      const raw = settings.announcement as Partial<PanelAnnouncementSettings> | undefined;
      const next = { ...DEFAULT_ANNOUNCEMENT, ...raw };
      setAnnouncement(next);
      setSaved(next);
      await refreshBranding();
      setSavedFlash(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setAnnouncement(saved);
    setError('');
    setSavedFlash(false);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Announce' }]}>
        <AdminDetailHero
          title="Announce"
          subtitle="Broadcast a message to all users on My servers and the server console"
          icon={Megaphone}
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #312e81 100%)"
          stats={[
            {
              label: 'Status',
              value: announcement.enabled ? 'Live' : 'Off',
              className: announcement.enabled ? 'text-emerald-300' : undefined,
            },
            {
              label: 'Locations',
              value: [
                announcement.showOnServers ? 'My servers' : null,
                announcement.showOnConsole ? 'Console' : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'None',
            },
          ]}
        />

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <AdminDetailBody>
            <AdminFormStatus error={error || undefined} saved={savedFlash} />

            <AdminSettingsPanel
              title="Panel announcement"
              description="Users see this banner while browsing their servers"
              icon={Megaphone}
            >
              <div className="space-y-4">
                <Checkbox
                  label="Enable announcement"
                  description="Show the message to users on the selected pages"
                  checked={announcement.enabled}
                  onChange={(enabled) => setAnnouncement({ ...announcement, enabled })}
                />

                <Input
                  label="Title"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  placeholder="Announcement"
                  maxLength={120}
                />

                <Textarea
                  label="Message"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  rows={4}
                  placeholder="Scheduled maintenance tonight at 10 PM UTC…"
                  maxLength={1000}
                />

                <Select
                  label="Tone"
                  value={announcement.tone}
                  onChange={(e) =>
                    setAnnouncement({
                      ...announcement,
                      tone: e.target.value as PanelAnnouncementSettings['tone'],
                    })
                  }
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Checkbox
                    label="Show on My servers"
                    description="Banner on the server list page"
                    checked={announcement.showOnServers}
                    onChange={(showOnServers) => setAnnouncement({ ...announcement, showOnServers })}
                  />
                  <Checkbox
                    label="Show on console"
                    description="Banner above the live console output"
                    checked={announcement.showOnConsole}
                    onChange={(showOnConsole) => setAnnouncement({ ...announcement, showOnConsole })}
                  />
                </div>

                <Checkbox
                  label="Allow users to dismiss"
                  description="Dismissed announcements reappear when you publish a new message"
                  checked={announcement.dismissible}
                  onChange={(dismissible) => setAnnouncement({ ...announcement, dismissible })}
                />

                {announcement.enabled && !announcement.showOnServers && !announcement.showOnConsole && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Enabled but no pages selected — users will not see this announcement.
                  </div>
                )}
              </div>
            </AdminSettingsPanel>

            <AdminSettingsPanel
              title="Preview"
              description="How users will see the announcement"
              icon={Eye}
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <Server className="h-3.5 w-3.5" />
                    My servers
                  </p>
                  {announcement.enabled && announcement.showOnServers && announcement.message.trim() ? (
                    <PanelAnnouncementBanner location="servers" preview={announcement} />
                  ) : (
                    <p className="text-xs text-[var(--muted)]">Hidden on My servers</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <Monitor className="h-3.5 w-3.5" />
                    Console
                  </p>
                  {announcement.enabled && announcement.showOnConsole && announcement.message.trim() ? (
                    <PanelAnnouncementBanner location="console" preview={announcement} />
                  ) : (
                    <p className="text-xs text-[var(--muted)]">Hidden on console</p>
                  )}
                </div>
              </div>
            </AdminSettingsPanel>
          </AdminDetailBody>

          <AdminSaveBar
            hasChanges={hasChanges}
            saving={saving}
            error={error || undefined}
            saved={savedFlash}
            onReset={handleReset}
          />
        </form>
      </AdminDetailPage>
    </AdminLayout>
  );
}
