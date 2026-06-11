import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  Megaphone,
  Monitor,
  Radio,
  Server,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import {
  DEFAULT_ANNOUNCEMENT,
  type PanelAnnouncementSettings,
} from '../../lib/panel-settings';
import { AdminLayout, Input, Textarea } from '../../components/Layout';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
  AdminFormStatus,
  AdminSaveBar,
} from '../../components/AdminDetailLayout';
import { Checkbox } from '../../components/Checkbox';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { Spinner } from '../../components/ui';

const TONE_OPTIONS: Array<{
  value: PanelAnnouncementSettings['tone'];
  label: string;
  description: string;
  icon: typeof Info;
}> = [
  { value: 'info', label: 'Info', description: 'General notice', icon: Info },
  { value: 'warning', label: 'Warning', description: 'Maintenance or issues', icon: AlertTriangle },
  { value: 'success', label: 'Success', description: 'Good news or completed work', icon: CheckCircle2 },
];

const TITLE_MAX = 120;
const MESSAGE_MAX = 1000;

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

  const previewReady = announcement.enabled && announcement.message.trim().length > 0;
  const noLocations = announcement.enabled && !announcement.showOnServers && !announcement.showOnConsole;

  const locationSummary = useMemo(
    () =>
      [announcement.showOnServers ? 'My servers' : null, announcement.showOnConsole ? 'Console' : null]
        .filter(Boolean)
        .join(' · ') || 'None',
    [announcement.showOnConsole, announcement.showOnServers],
  );

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
          title="Announcements"
          subtitle="Broadcast a message to all users on My servers and the server console"
          icon={Megaphone}
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #312e81 100%)"
          stats={[
            {
              label: 'Status',
              value: announcement.enabled ? 'Live' : 'Draft',
              className: announcement.enabled ? 'text-emerald-300' : undefined,
            },
            { label: 'Visible on', value: locationSummary },
            {
              label: 'Dismissible',
              value: announcement.dismissible ? 'Yes' : 'No',
            },
          ]}
        />

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <AdminDetailBody>
            <AdminFormStatus error={error || undefined} saved={savedFlash} />

            <div className="adm-announce-layout">
                <section className="adm-announce-card">
                  <div className="adm-announce-card-head">
                    <div>
                      <h2 className="adm-announce-card-title">Publish</h2>
                      <p className="adm-announce-card-desc">Turn the banner on when you are ready for users to see it</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={announcement.enabled}
                      className={`adm-announce-live-toggle${announcement.enabled ? ' is-on' : ''}`}
                      onClick={() => setAnnouncement({ ...announcement, enabled: !announcement.enabled })}
                    >
                      <Radio className="h-3.5 w-3.5" aria-hidden />
                      {announcement.enabled ? 'Live' : 'Off'}
                    </button>
                  </div>

                  <div className="adm-announce-field">
                    <div className="adm-announce-field-head">
                      <label className="adm-announce-label" htmlFor="announce-title">
                        Title
                      </label>
                      <span className="adm-announce-count">
                        {announcement.title.length}/{TITLE_MAX}
                      </span>
                    </div>
                    <Input
                      id="announce-title"
                      value={announcement.title}
                      onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                      placeholder="Scheduled maintenance"
                      maxLength={TITLE_MAX}
                    />
                    <p className="adm-announce-hint">Optional — defaults to &quot;Announcement&quot; if empty</p>
                  </div>

                  <div className="adm-announce-field">
                    <div className="adm-announce-field-head">
                      <label className="adm-announce-label" htmlFor="announce-message">
                        Message
                      </label>
                      <span className="adm-announce-count">
                        {announcement.message.length}/{MESSAGE_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="announce-message"
                      value={announcement.message}
                      onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                      rows={5}
                      placeholder="We will be performing maintenance tonight at 10 PM UTC. Servers may restart briefly."
                      maxLength={MESSAGE_MAX}
                    />
                  </div>

                  <fieldset className="adm-announce-field">
                    <legend className="adm-announce-label">Tone</legend>
                    <div className="adm-announce-tones">
                      {TONE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          className={`adm-announce-tone adm-announce-tone--${value}${
                            announcement.tone === value ? ' is-active' : ''
                          }`}
                          onClick={() => setAnnouncement({ ...announcement, tone: value })}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="min-w-0 text-left">
                            <span className="adm-announce-tone-label">{label}</span>
                            <span className="adm-announce-tone-desc">{description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </section>

                <section className="adm-announce-card">
                  <h2 className="adm-announce-card-title">Where to show</h2>
                  <p className="adm-announce-card-desc">Choose which pages display the banner</p>

                  <div className="adm-announce-locations">
                    <label className={`adm-announce-location${announcement.showOnServers ? ' is-on' : ''}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={announcement.showOnServers}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, showOnServers: e.target.checked })
                        }
                      />
                      <Server className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="adm-announce-location-label">My servers</span>
                        <span className="adm-announce-location-desc">Server list home page</span>
                      </span>
                    </label>
                    <label className={`adm-announce-location${announcement.showOnConsole ? ' is-on' : ''}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={announcement.showOnConsole}
                        onChange={(e) =>
                          setAnnouncement({ ...announcement, showOnConsole: e.target.checked })
                        }
                      />
                      <Monitor className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="adm-announce-location-label">Console</span>
                        <span className="adm-announce-location-desc">Above live server output</span>
                      </span>
                    </label>
                  </div>

                  <div className="adm-announce-options">
                    <Checkbox
                      label="Allow users to dismiss"
                      description="Dismissed users won't see it again until you change the message"
                      checked={announcement.dismissible}
                      onChange={(dismissible) => setAnnouncement({ ...announcement, dismissible })}
                    />
                  </div>

                  {noLocations ? (
                    <div className="adm-announce-warn">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      <p>Announcement is live but no pages are selected — users will not see it.</p>
                    </div>
                  ) : null}
                </section>

                <section className="adm-announce-card adm-announce-preview">
                  <div className="adm-announce-preview-head">
                    <Eye className="h-4 w-4 shrink-0" aria-hidden />
                    <div>
                      <h2 className="adm-announce-card-title">Live preview</h2>
                      <p className="adm-announce-card-desc">Exactly how users will see the banner</p>
                    </div>
                  </div>

                  <div className="adm-announce-preview-frames">
                    <PreviewFrame
                      label="My servers"
                      icon={Server}
                      hidden={!previewReady || !announcement.showOnServers}
                      hiddenReason={
                        !announcement.enabled
                          ? 'Announcement is off'
                          : !announcement.message.trim()
                            ? 'Add a message to preview'
                            : 'Not shown on My servers'
                      }
                    >
                      <PanelAnnouncementBanner location="servers" preview={announcement} />
                    </PreviewFrame>

                    <PreviewFrame
                      label="Console"
                      icon={Monitor}
                      hidden={!previewReady || !announcement.showOnConsole}
                      hiddenReason={
                        !announcement.enabled
                          ? 'Announcement is off'
                          : !announcement.message.trim()
                            ? 'Add a message to preview'
                            : 'Not shown on console'
                      }
                      compact
                    >
                      <PanelAnnouncementBanner location="console" preview={announcement} compact />
                    </PreviewFrame>
                  </div>
                </section>
            </div>
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

function PreviewFrame({
  label,
  icon: Icon,
  hidden,
  hiddenReason,
  compact,
  children,
}: {
  label: string;
  icon: typeof Server;
  hidden: boolean;
  hiddenReason: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`adm-announce-preview-frame${compact ? ' adm-announce-preview-frame--compact' : ''}`}>
      <div className="adm-announce-preview-frame-chrome">
        <span className="adm-announce-preview-dot" aria-hidden />
        <span className="adm-announce-preview-dot" aria-hidden />
        <span className="adm-announce-preview-dot" aria-hidden />
        <span className="adm-announce-preview-frame-label">
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </span>
      </div>
      <div className="adm-announce-preview-frame-body">
        {hidden ? (
          <p className="adm-announce-preview-empty">{hiddenReason}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
