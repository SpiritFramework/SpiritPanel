import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Megaphone, X } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import type { PanelAnnouncementSettings } from '../lib/panel-settings';

const DISMISS_KEY = 'spirit_announcement_dismissed';

export type PanelAnnouncementLocation = 'servers' | 'console';

const TONE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
} as const;

function isVisibleForLocation(announcement: PanelAnnouncementSettings, location: PanelAnnouncementLocation) {
  if (!announcement.enabled || !announcement.message.trim()) return false;
  return location === 'servers' ? announcement.showOnServers : announcement.showOnConsole;
}

export function usePanelAnnouncement(location: PanelAnnouncementLocation) {
  const { branding } = useBranding();
  const announcement = branding.announcement;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!announcement.dismissible || !announcement.revision) {
      setDismissed(false);
      return;
    }
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(stored === announcement.revision);
  }, [announcement.dismissible, announcement.revision]);

  const eligible = isVisibleForLocation(announcement, location);
  const visible = eligible && (!announcement.dismissible || !dismissed);

  function dismiss() {
    if (!announcement.revision) return;
    localStorage.setItem(DISMISS_KEY, announcement.revision);
    setDismissed(true);
  }

  return { announcement, visible, dismiss };
}

export function PanelAnnouncementBanner({
  location,
  preview,
}: {
  location: PanelAnnouncementLocation;
  preview?: PanelAnnouncementSettings;
}) {
  const hook = usePanelAnnouncement(location);
  const announcement = preview ?? hook.announcement;
  const visible = preview ? isVisibleForLocation(announcement, location) : hook.visible;
  const dismiss = preview ? undefined : hook.dismiss;

  if (!visible) return null;

  const Icon = TONE_ICONS[announcement.tone] ?? Megaphone;

  return (
    <div
      className={`panel-announcement panel-announcement--${announcement.tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="panel-announcement__icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </div>
      <div className="panel-announcement__body min-w-0 flex-1">
        {announcement.title.trim() ? (
          <p className="panel-announcement__title">{announcement.title}</p>
        ) : null}
        <p className="panel-announcement__message whitespace-pre-wrap">{announcement.message}</p>
      </div>
      {dismiss && announcement.dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          className="panel-announcement__dismiss"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
