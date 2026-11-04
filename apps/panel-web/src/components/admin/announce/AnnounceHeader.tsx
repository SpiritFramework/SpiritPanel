import { Megaphone, Monitor, Radio, Server } from 'lucide-react';
import type { PanelAnnouncementSettings } from '../../../lib/panel-settings';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';

export function AnnounceHeader({
  announcement,
  locationSummary,
  placementCount,
  onToggleEnabled,
}: {
  announcement: PanelAnnouncementSettings;
  locationSummary: string;
  placementCount: number;
  onToggleEnabled: () => void;
}) {
  const live = announcement.enabled;

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Broadcast"
        title="Announcements"
        description={`Panel-wide banner on My servers and the server console · Visible on ${locationSummary}`}
        pill={live ? 'Live' : 'Draft'}
        pillTone={live ? 'ok' : 'neutral'}
        actions={
          <AdminToolButton onClick={onToggleEnabled} primary={live ? undefined : true}>
            {live ? 'Pause broadcast' : 'Go live'}
          </AdminToolButton>
        }
      />
      <AdminKpiStrip
        label="Announcement summary"
        columns={4}
        items={[
          {
            icon: Radio,
            label: 'Broadcast',
            value: live ? 'Publishing' : 'Paused',
            tone: live ? 'success' : undefined,
          },
          {
            icon: Megaphone,
            label: 'Tone',
            value: announcement.tone.charAt(0).toUpperCase() + announcement.tone.slice(1),
          },
          {
            icon: Server,
            label: 'Placements',
            value: placementCount > 0 ? String(placementCount) : 'None',
          },
          {
            icon: Monitor,
            label: 'Dismissible',
            value: announcement.dismissible ? 'Yes' : 'No',
          },
        ]}
      />
    </div>
  );
}
