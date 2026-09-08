import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Eye, FileText, MapPin, Monitor, Server } from 'lucide-react';
import type { PanelAnnouncementSettings } from '../../../lib/panel-settings';
import { Input, Textarea } from '../../Layout';
import { Checkbox } from '../../Checkbox';
import { PanelAnnouncementBanner } from '../../PanelAnnouncementBanner';
import { NodeOverviewSection } from '../node-detail/NodeDetailShell';
import { MESSAGE_MAX, TITLE_MAX, TONE_OPTIONS } from './announce-types';

export function AnnounceWorkspace({
  announcement,
  setAnnouncement,
  previewReady,
  noLocations,
}: {
  announcement: PanelAnnouncementSettings;
  setAnnouncement: Dispatch<SetStateAction<PanelAnnouncementSettings>>;
  previewReady: boolean;
  noLocations: boolean;
}) {
  return (
    <div className="ds-ann-workspace">
      <div className="ds-ann-compose">
        <NodeOverviewSection
          icon={FileText}
          title="Compose message"
          description="Title, body, and visual tone for the banner"
        >
          <div className="ds-ann-fields">
            <div className="ds-ann-field">
              <div className="ds-ann-field-head">
                <label className="ds-ann-label" htmlFor="announce-title">
                  Title
                </label>
                <span className="ds-ann-count">
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
              <p className="ds-ann-hint">Optional — defaults to &quot;Announcement&quot; if empty</p>
            </div>

            <div className="ds-ann-field">
              <div className="ds-ann-field-head">
                <label className="ds-ann-label" htmlFor="announce-message">
                  Message
                </label>
                <span className="ds-ann-count">
                  {announcement.message.length}/{MESSAGE_MAX}
                </span>
              </div>
              <Textarea
                id="announce-message"
                value={announcement.message}
                onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                rows={6}
                placeholder="We will be performing maintenance tonight at 10 PM UTC. Servers may restart briefly."
                maxLength={MESSAGE_MAX}
              />
            </div>

            <fieldset className="ds-ann-field">
              <legend className="ds-ann-label">Tone</legend>
              <div className="ds-ann-tones" role="radiogroup" aria-label="Announcement tone">
                {TONE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                  const active = announcement.tone === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`ds-ann-tone ds-ann-tone--${value}${active ? ' is-active' : ''}`}
                      onClick={() => setAnnouncement({ ...announcement, tone: value })}
                    >
                      <span className="ds-ann-tone-icon" aria-hidden>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="ds-ann-tone-label">{label}</span>
                        <span className="ds-ann-tone-desc">{description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </NodeOverviewSection>
      </div>

      <aside className="ds-ann-placement">
        <NodeOverviewSection
          icon={MapPin}
          title="Placement"
          description="Where users see the banner and dismissal behavior"
        >
          <div className="ds-ann-placement-tiles">
            <label
              className={`ds-ann-placement-tile${announcement.showOnServers ? ' is-on' : ''}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={announcement.showOnServers}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, showOnServers: e.target.checked })
                }
              />
              <span className="ds-ann-placement-tile-icon" aria-hidden>
                <Server className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="ds-ann-placement-tile-label">My servers</span>
                <span className="ds-ann-placement-tile-desc">Server list home page</span>
              </span>
              <span className="ds-ann-placement-tile-check" aria-hidden />
            </label>

            <label
              className={`ds-ann-placement-tile${announcement.showOnConsole ? ' is-on' : ''}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={announcement.showOnConsole}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, showOnConsole: e.target.checked })
                }
              />
              <span className="ds-ann-placement-tile-icon" aria-hidden>
                <Monitor className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="ds-ann-placement-tile-label">Console</span>
                <span className="ds-ann-placement-tile-desc">Above live server output</span>
              </span>
              <span className="ds-ann-placement-tile-check" aria-hidden />
            </label>
          </div>

          <div className="ds-ann-placement-options">
            <Checkbox
              label="Allow users to dismiss"
              description="Dismissed users won't see it again until you change the message"
              checked={announcement.dismissible}
              onChange={(dismissible) => setAnnouncement({ ...announcement, dismissible })}
            />
          </div>

          {noLocations ? (
            <div className="ds-ann-warn" role="status">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <p>Announcement is live but no pages are selected — users will not see it.</p>
            </div>
          ) : null}
        </NodeOverviewSection>
      </aside>

      <section className="ds-ann-preview" aria-labelledby="ann-preview-heading">
        <div className="ds-ann-preview-head">
          <span className="ds-ann-preview-head-icon" aria-hidden>
            <Eye className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="ann-preview-heading" className="ds-ann-preview-title">
              Live preview
            </h2>
            <p className="ds-ann-preview-desc">Exactly how users will see the banner on each page</p>
          </div>
        </div>

        <div className="ds-ann-preview-frames">
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
    <div className={`ds-ann-preview-frame${compact ? ' ds-ann-preview-frame--compact' : ''}`}>
      <div className="ds-ann-preview-frame-chrome">
        <span className="ds-ann-preview-dot" aria-hidden />
        <span className="ds-ann-preview-dot" aria-hidden />
        <span className="ds-ann-preview-dot" aria-hidden />
        <span className="ds-ann-preview-frame-label">
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </span>
      </div>
      <div className="ds-ann-preview-frame-body">
        {hidden ? <p className="ds-ann-preview-empty">{hiddenReason}</p> : children}
      </div>
    </div>
  );
}
