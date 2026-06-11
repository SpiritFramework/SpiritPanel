import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Megaphone, X } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import type { PanelAnnouncementSettings } from '../lib/panel-settings';

const DISMISS_KEY = 'spirit_announcement_dismissed';

export type PanelAnnouncementLocation = 'servers' | 'console';

const TONE_META = {
  info: { icon: Info, label: 'Notice' },
  warning: { icon: AlertTriangle, label: 'Important' },
  success: { icon: CheckCircle2, label: 'Update' },
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
  compact,
}: {
  location: PanelAnnouncementLocation;
  preview?: PanelAnnouncementSettings;
  compact?: boolean;
}) {
  const hook = usePanelAnnouncement(location);
  const announcement = preview ?? hook.announcement;
  const visible = preview ? isVisibleForLocation(announcement, location) : hook.visible;
  const dismiss = preview ? undefined : hook.dismiss;

  if (!visible) return null;

  const tone = announcement.tone in TONE_META ? announcement.tone : 'info';
  const meta = TONE_META[tone];
  const Icon = meta.icon;
  const headline = announcement.title.trim() || 'Announcement';

  return (
    <article
      className={`panel-announcement panel-announcement--${tone}${compact ? ' panel-announcement--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="panel-announcement__accent" aria-hidden />
      <div className="panel-announcement__icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </div>
      <div className="panel-announcement__body min-w-0 flex-1">
        <div className="panel-announcement__head">
          <span className="panel-announcement__badge">
            <Megaphone className="h-3 w-3" aria-hidden />
            {meta.label}
          </span>
        </div>
        <h2 className="panel-announcement__title">{headline}</h2>
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
    </article>
  );
}
