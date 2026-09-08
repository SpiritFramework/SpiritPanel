import { Link } from 'react-router-dom';
import { ChevronRight, Megaphone, Monitor, Radio, Server, X } from 'lucide-react';
import type { PanelAnnouncementSettings } from '../../../lib/panel-settings';
import { Button } from '../../Layout';
import { StatusPill } from '../../ui';

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
  const tone = live ? 'live' : 'draft';
  const statusLabel = live ? 'Live' : 'Draft';
  const statusPillTone = live ? 'success' : 'neutral';

  const stats = [
    {
      icon: Radio,
      label: 'Broadcast',
      value: live ? 'Publishing' : 'Paused',
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
  ];

  return (
    <div className="ds-ann-header-wrap">
      <header className={`ds-ann-header ds-ann-header--${tone}`}>
        <nav className="ds-ann-header-crumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <ChevronRight className="ds-icon ds-icon--sm opacity-40" aria-hidden />
          <span>Announce</span>
        </nav>

        <div className="ds-ann-header-body">
          <div className="ds-ann-header-accent" aria-hidden />

          <div className="ds-ann-header-main">
            <div className="ds-ann-header-identity">
              <div className="ds-ann-header-icon-wrap" aria-hidden>
                <Megaphone className="ds-icon" />
                <span className={`ds-ann-header-pulse ds-ann-header-pulse--${tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="ds-ann-header-title-row">
                  <h1 className="ds-ann-header-title">Announcements</h1>
                  <StatusPill label={statusLabel} tone={statusPillTone} pulse={live} />
                </div>

                <p className="ds-ann-header-meta">
                  Broadcast a panel-wide banner on My servers and the server console
                  <span className="ds-ann-header-meta-sep" aria-hidden>
                    ·
                  </span>
                  <span className="truncate">Visible on {locationSummary}</span>
                </p>
              </div>
            </div>

            <div className="ds-ann-header-actions">
              <Button
                type="button"
                variant={live ? 'secondary' : 'primary'}
                size="sm"
                onClick={onToggleEnabled}
                aria-pressed={live}
              >
                {live ? (
                  <>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Turn off
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5" aria-hidden />
                    Go live
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="ds-ann-header-stats" role="list" aria-label="Announcement summary">
            {stats.map((stat) => (
              <div key={stat.label} className="ds-ann-header-stat" role="listitem">
                <span className="ds-ann-header-stat-icon" aria-hidden>
                  <stat.icon className="h-3.5 w-3.5" />
                </span>
                <span className="ds-ann-header-stat-copy">
                  <span className="ds-ann-header-stat-label">{stat.label}</span>
                  <span className="ds-ann-header-stat-value">{stat.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}
