import { Link } from 'react-router-dom';
import { Server, User } from 'lucide-react';
import {
  formatActivityTime,
  getActivityCategory,
  getActivityMeta,
  type ActivityEntry,
} from '../../../lib/activity';
import type { PanelActivityCategory } from './panel-activity-utils';

const CATEGORY_LABEL: Record<PanelActivityCategory, string> = {
  auth: 'Auth',
  admin: 'Admin',
  server: 'Server',
};

export function PanelActivityEventRow({ entry }: { entry: ActivityEntry }) {
  const meta = getActivityMeta(entry.event);
  const category = getActivityCategory(entry.event);
  const Icon = meta.icon;
  const [iconText, iconBg] = meta.color.split(' ');
  const title = entry.description?.trim() || meta.label;
  const when = formatActivityTime(entry.timestamp);
  const whenFull = new Date(entry.timestamp).toLocaleString();

  return (
    <li className={`ds-ad-act-event ds-ad-act-event--${category}`}>
      <span className={`ds-ad-act-event-icon ${iconBg ?? 'bg-[var(--bg-elevated)]'}`} aria-hidden>
        <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
      </span>
      <div className="ds-ad-act-event-body">
        <div className="ds-ad-act-event-top">
          <div className="min-w-0 flex-1">
            <div className="ds-ad-act-event-type-row">
              <span className="ds-ad-act-event-type">{meta.label}</span>
              <span className={`ds-ad-act-cat ds-ad-act-cat--${category}`}>{CATEGORY_LABEL[category]}</span>
            </div>
            <p className="ds-ad-act-event-title">{title}</p>
          </div>
          <time className="ds-ad-act-event-time" dateTime={entry.timestamp} title={whenFull}>
            {when}
          </time>
        </div>
        <div className="ds-ad-act-event-meta">
          {entry.actor ? (
            <span className="ds-ad-act-event-actor">
              <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{entry.actor.username || entry.actor.email}</span>
            </span>
          ) : (
            <span className="ds-ad-act-event-system">System</span>
          )}
          {entry.server ? (
            <>
              <span className="ds-ad-act-event-dot" aria-hidden>
                ·
              </span>
              <Link to={`/admin/servers/${entry.server.id}`} className="ds-ad-act-event-server">
                <Server className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{entry.server.name}</span>
              </Link>
            </>
          ) : null}
          {entry.ip && entry.ip !== 'unknown' ? (
            <>
              <span className="ds-ad-act-event-dot" aria-hidden>
                ·
              </span>
              <span className="ds-ad-act-event-ip">{entry.ip}</span>
            </>
          ) : null}
          <span className="ds-ad-act-event-key ds-text-mono">{entry.event}</span>
        </div>
      </div>
    </li>
  );
}
