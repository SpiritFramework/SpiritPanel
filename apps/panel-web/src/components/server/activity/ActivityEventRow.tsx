import {
  formatActivityTime,
  getActivityFilterMeta,
  getActivityMeta,
  type ActivityEntry,
  type ActivityFilterCategory,
} from '../../../lib/activity';

function formatCrashActivityDetail(properties?: Record<string, unknown> | null): string | null {
  if (!properties) return null;
  const exitCode = properties.exit_code ?? properties.exitCode;
  const oom = properties.oomkilled ?? properties.oomKilled;
  const parts: string[] = [];
  if (exitCode != null && exitCode !== '') parts.push(`Exit code ${String(exitCode)}`);
  if (oom === true || oom === 'true') parts.push('Out of memory');
  return parts.length > 0 ? parts.join(' · ') : null;
}

const ACCENT_BAR_CLASS: Partial<Record<ActivityFilterCategory, string>> = {
  power: 'ds-srv-act-event-accent--power',
  files: 'ds-srv-act-event-accent--files',
  marketplace: 'ds-srv-act-event-accent--marketplace',
};

export function ActivityEventRow({
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
  const crashDetail =
    entry.event === 'server:crashed'
      ? formatCrashActivityDetail(entry.properties)
      : null;
  const when = formatActivityTime(entry.timestamp);
  const whenFull = new Date(entry.timestamp).toLocaleString();
  const accentClass = ACCENT_BAR_CLASS[category] ?? '';
  const showCategory = category !== 'all';
  const catClass = category !== 'all' ? `ds-srv-act-cat--${category}` : '';

  return (
    <li className="ds-srv-act-event">
      <span
        className={`ds-srv-act-event-accent ${accentClass}`.trim()}
        aria-hidden
      />
      <span className={`ds-srv-act-event-icon ${iconBg ?? 'bg-[var(--bg-elevated)]'}`} aria-hidden>
        <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
      </span>
      <div className="ds-srv-act-event-body">
        <div className="ds-srv-act-event-top">
          <div className="min-w-0 flex-1">
            <div className="ds-srv-act-event-type-row">
              <span className="ds-srv-act-event-type">{meta.label}</span>
              {showCategory ? (
                <span className={`ds-srv-act-cat ${catClass}`.trim()}>{filterMeta.shortLabel}</span>
              ) : null}
            </div>
            <p className="ds-srv-act-event-title">{title}</p>
            {crashDetail ? <p className="ds-srv-act-event-crash-detail">{crashDetail}</p> : null}
          </div>
          <time className="ds-srv-act-event-time" dateTime={entry.timestamp} title={whenFull}>
            {when}
          </time>
        </div>
        <div className="ds-srv-act-event-meta">
          {entry.actor ? (
            <span className="ds-srv-act-event-actor">
              <span className="truncate">{entry.actor.username}</span>
              {entry.actor.role === 'admin' ? <span className="ds-srv-act-admin-badge">admin</span> : null}
            </span>
          ) : (
            <span className="ds-srv-act-event-system">System</span>
          )}
          {entry.ip && entry.ip !== 'unknown' ? (
            <>
              <span className="ds-srv-act-event-dot" aria-hidden>
                ·
              </span>
              <span className="ds-srv-act-event-ip">{entry.ip}</span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
