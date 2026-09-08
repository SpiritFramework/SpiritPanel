import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { useBranding } from '../../context/BrandingContext';
import {
  DEFAULT_ANNOUNCEMENT,
  type PanelAnnouncementSettings,
} from '../../lib/panel-settings';
import { AdminLayout, Button } from '../../components/Layout';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import { AnnounceHeader } from '../../components/admin/announce/AnnounceHeader';
import { AnnounceWorkspace } from '../../components/admin/announce/AnnounceWorkspace';

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
  const noLocations =
    announcement.enabled && !announcement.showOnServers && !announcement.showOnConsole;

  const placementCount =
    (announcement.showOnServers ? 1 : 0) + (announcement.showOnConsole ? 1 : 0);

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
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={(e) => void handleSubmit(e)} className="ds-ann-page">
        <AnnounceHeader
          announcement={announcement}
          locationSummary={locationSummary}
          placementCount={placementCount}
          onToggleEnabled={() => setAnnouncement({ ...announcement, enabled: !announcement.enabled })}
        />

        <AnnounceWorkspace
          announcement={announcement}
          setAnnouncement={setAnnouncement}
          previewReady={previewReady}
          noLocations={noLocations}
        />

        <div
          className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : savedFlash ? ' ds-nd-st-savebar--saved' : ''}`}
          role="status"
        >
          <div className="ds-nd-st-savebar-status">
            {error ? (
              <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
            ) : savedFlash ? (
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
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
    </AdminLayout>
  );
}
