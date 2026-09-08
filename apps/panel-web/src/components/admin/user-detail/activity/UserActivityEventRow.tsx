import { Link } from 'react-router-dom';
import { Server } from 'lucide-react';
import {
  formatActivityTime,
  getActivityFilterMeta,
  getActivityMeta,
  type ActivityEntry,
  type ActivityFilterCategory,
} from '../../../../lib/activity';

const ACCENT_BAR_CLASS: Partial<Record<ActivityFilterCategory, string>> = {
  power: 'ds-ud-act-event-accent--power',
  files: 'ds-ud-act-event-accent--files',
  marketplace: 'ds-ud-act-event-accent--marketplace',
};

export function UserActivityEventRow({
  entry,
  category,
}: {
  entry: ActivityEntry;
  category: ActivityFilterCategory;
}) {
  const meta = getActivityMeta(entry.event);
  const filterMeta = getActivityFilterMeta(category === 'all' ? 'power' : category);
  const Icon = meta.icon;
  const [iconText, iconBg] = meta.color.split(' ');
  const title = entry.description?.trim() || meta.label;
  const when = formatActivityTime(entry.timestamp);
  const whenFull = new Date(entry.timestamp).toLocaleString();
  const accentClass = ACCENT_BAR_CLASS[category] ?? '';
  const showCategory = category !== 'all';
  const catClass = category !== 'all' ? `ds-ud-act-cat--${category}` : '';

  return (
    <li className="ds-ud-act-event">
      <span className={`ds-ud-act-event-accent ${accentClass}`.trim()} aria-hidden />
      <span className={`ds-ud-act-event-icon ${iconBg ?? 'bg-[var(--bg-elevated)]'}`} aria-hidden>
        <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
      </span>
      <div className="ds-ud-act-event-body">
        <div className="ds-ud-act-event-top">
          <div className="min-w-0 flex-1">
            <div className="ds-ud-act-event-type-row">
              <span className="ds-ud-act-event-type">{meta.label}</span>
              {showCategory ? (
                <span className={`ds-ud-act-cat ${catClass}`.trim()}>{filterMeta.shortLabel}</span>
              ) : null}
            </div>
            <p className="ds-ud-act-event-title">{title}</p>
          </div>
          <time className="ds-ud-act-event-time" dateTime={entry.timestamp} title={whenFull}>
            {when}
          </time>
        </div>
        <div className="ds-ud-act-event-meta">
          {entry.server ? (
            <Link to={`/admin/servers/${entry.server.id}`} className="ds-ud-act-event-server">
              <Server className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{entry.server.name}</span>
            </Link>
          ) : (
            <span className="ds-ud-act-event-panel">Panel-wide</span>
          )}
          {entry.ip && entry.ip !== 'unknown' ? (
            <>
              <span className="ds-ud-act-event-dot" aria-hidden>
                ·
              </span>
              <span className="ds-ud-act-event-ip">{entry.ip}</span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
