import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  formatActivityTime,
  getActivityCategory,
  getActivityFilterCategory,
  getActivityFilterMeta,
  getActivityMeta,
  groupActivityByDate,
  type ActivityEntry,
} from '../lib/activity';

export function ActivityTimeline({
  entries,
  compact = true,
  layout,
  showEventKey,
  showCategoryBadge = false,
  renderMeta,
}: {
  entries: ActivityEntry[];
  compact?: boolean;
  layout?: 'compact' | 'full' | 'server';
  showEventKey?: boolean;
  showCategoryBadge?: boolean;
  renderMeta?: (entry: ActivityEntry) => ReactNode;
}) {
  if (entries.length === 0) return null;

  const resolvedLayout = layout ?? (compact ? 'compact' : 'full');
  const groups = groupActivityByDate(entries);

  return (
    <div
      className={`activity-log overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 ${
        resolvedLayout === 'full'
          ? 'activity-log--full'
          : resolvedLayout === 'server'
            ? 'activity-log--server'
            : ''
      }`}
    >
      {groups.map((group, groupIndex) => (
        <section key={group.label}>
          {groupIndex > 0 && <div className="border-t border-[var(--border)]/50" />}
          <div className="activity-log-date">
            <span className="activity-log-date-label">{group.label}</span>
            <span className="activity-log-date-count">{group.entries.length}</span>
          </div>

          {resolvedLayout === 'full' && (
            <div className="activity-log-head hidden border-b border-[var(--border)]/50 bg-[var(--bg-elevated)]/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] lg:grid">
              <span>Type</span>
              <span>Event</span>
              <span>User</span>
              <span>Server</span>
              <span>IP</span>
              <span className="text-right">When</span>
            </div>
          )}

          {resolvedLayout === 'server' && (
            <div className="activity-log-head activity-log-head--server hidden px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] lg:grid">
              <span>Type</span>
              <span>Details</span>
              <span>User</span>
              <span>IP</span>
              <span className="text-right">When</span>
            </div>
          )}

          <ul
            className={
              resolvedLayout === 'full' || resolvedLayout === 'server'
                ? 'activity-log-list'
                : 'divide-y divide-[var(--border)]/35'
            }
          >
            {group.entries.map((entry) => (
              <ActivityTimelineRow
                key={entry.id}
                entry={entry}
                layout={resolvedLayout}
                showEventKey={showEventKey}
                showCategoryBadge={showCategoryBadge}
                renderMeta={renderMeta}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function serverConsolePath(pathname: string, serverId: string): string {
  if (pathname.includes('/admin/')) {
    return `/admin/servers/${serverId}/manage/console`;
  }
  return `/servers/${serverId}/console`;
}

function ActivityCategoryBadge({ event }: { event: string }) {
  const category = getActivityFilterCategory(event);
  if (category === 'all') return null;
  const filterMeta = getActivityFilterMeta(category);
  return (
    <span className={`activity-category-badge ${filterMeta.chipClass}`}>{filterMeta.shortLabel}</span>
  );
}

function ActivityTimelineRow({
  entry,
  layout,
  showEventKey,
  showCategoryBadge,
  renderMeta,
}: {
  entry: ActivityEntry;
  layout: 'compact' | 'full' | 'server';
  showEventKey?: boolean;
  showCategoryBadge?: boolean;
  renderMeta?: (entry: ActivityEntry) => ReactNode;
}) {
  const location = useLocation();
  const meta = getActivityMeta(entry.event);
  const Icon = meta.icon;
  const title = entry.description?.trim() || meta.label;
  const category = getActivityCategory(entry.event);
  const [iconText, iconBg] = meta.color.split(' ');
  const when = formatActivityTime(entry.timestamp);
  const whenFull = new Date(entry.timestamp).toLocaleString();

  if (layout === 'server') {
    return (
      <li className="activity-log-row activity-log-row--server group">
        <div className="activity-log-mobile-card">
          <div className="activity-log-server-head">
            <span className={`activity-log-icon ${iconBg ?? 'bg-[var(--bg-elevated)]'}`}>
              <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-xs font-semibold">{meta.label}</p>
                {showCategoryBadge && <ActivityCategoryBadge event={entry.event} />}
              </div>
              <time className="text-[10px] tabular-nums text-[var(--muted)]" dateTime={entry.timestamp} title={whenFull}>
                {when}
              </time>
            </div>
          </div>

          <div className="activity-log-server-body">
            <p className="text-sm font-medium leading-snug text-[var(--text)]">{title}</p>
            {showEventKey && (
              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">{entry.event}</p>
            )}
          </div>

          <div className="activity-log-server-meta">
            {entry.actor ? (
              <span className="inline-flex max-w-full items-center gap-1.5 text-xs">
                <span className="truncate font-medium">{entry.actor.username}</span>
                {entry.actor.role === 'admin' && <span className="activity-admin-badge">admin</span>}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">System</span>
            )}
            {entry.ip && entry.ip !== 'unknown' && (
              <>
                <span className="text-[var(--muted)]/40">·</span>
                <span className="font-mono text-[11px] text-[var(--muted)]">{entry.ip}</span>
              </>
            )}
          </div>

          {renderMeta && <div className="text-[10px] text-[var(--muted)]">{renderMeta(entry)}</div>}
        </div>

        <div className="activity-log-type activity-log-desktop-cell">
          <span className={`activity-log-icon ${iconBg ?? 'bg-[var(--bg-elevated)]'}`}>
            <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-xs font-semibold">{meta.label}</span>
              {showCategoryBadge && <ActivityCategoryBadge event={entry.event} />}
            </div>
          </div>
        </div>

        <div className="activity-log-event activity-log-desktop-cell">
          <p className="text-sm font-medium leading-snug text-[var(--text)]">{title}</p>
          {showEventKey && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">{entry.event}</p>
          )}
        </div>

        <div className="activity-log-user activity-log-desktop-cell text-xs">
          {entry.actor ? (
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="truncate font-medium">{entry.actor.username}</span>
              {entry.actor.role === 'admin' && <span className="activity-admin-badge">admin</span>}
            </span>
          ) : (
            <span className="text-[var(--muted)]">System</span>
          )}
        </div>

        <div className="activity-log-ip activity-log-desktop-cell font-mono text-[11px] text-[var(--muted)]">
          {entry.ip && entry.ip !== 'unknown' ? entry.ip : '—'}
        </div>

        <div className="activity-log-when activity-log-desktop-cell text-right">
          <time className="text-[11px] tabular-nums text-[var(--muted)]" dateTime={entry.timestamp} title={whenFull}>
            {when}
          </time>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]/80">{whenFull.split(', ')[1] ?? whenFull}</p>
        </div>

        {renderMeta && (
          <div className="activity-log-desktop-extra text-[10px] text-[var(--muted)]">{renderMeta(entry)}</div>
        )}
      </li>
    );
  }

  if (layout === 'full') {
    return (
      <li className="activity-log-row group border-b border-[var(--border)]/35 px-4 py-3 transition last:border-b-0 hover:bg-[var(--surface-hover)]/30 lg:grid lg:items-center">
        <div className="activity-log-type flex min-w-0 items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg ?? 'bg-[var(--bg-elevated)]'}`}
          >
            <Icon className={`h-4 w-4 ${iconText ?? 'text-[var(--muted)]'}`} />
          </span>
          <div className="min-w-0 lg:hidden">
            <p className="truncate text-xs font-medium">{meta.label}</p>
            <p className="text-[10px] text-[var(--muted)]">{when}</p>
          </div>
          <span className="hidden truncate text-xs font-medium lg:block">{meta.label}</span>
        </div>

        <div className="activity-log-event mt-2 min-w-0 lg:mt-0">
          <p className="text-sm font-medium leading-snug text-[var(--text)]">{title}</p>
          {showEventKey && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">{entry.event}</p>
          )}
          <span className="activity-log-category mt-1 inline-flex rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)] lg:hidden">
            {category}
          </span>
        </div>

        <div className="activity-log-user mt-2 min-w-0 text-xs lg:mt-0">
          {entry.actor ? (
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="truncate font-medium">{entry.actor.username}</span>
              {entry.actor.role === 'admin' && (
                <span className="activity-admin-badge">admin</span>
              )}
            </span>
          ) : (
            <span className="text-[var(--muted)]">System</span>
          )}
        </div>

        <div className="activity-log-server mt-1 min-w-0 text-xs lg:mt-0">
          {entry.server ? (
            <Link
              to={serverConsolePath(location.pathname, entry.server.id)}
              className="truncate font-medium transition hover:accent-text"
            >
              {entry.server.name}
            </Link>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          )}
        </div>

        <div className="activity-log-ip mt-1 min-w-0 font-mono text-[11px] text-[var(--muted)] lg:mt-0">
          {entry.ip && entry.ip !== 'unknown' ? entry.ip : '—'}
        </div>

        <div className="activity-log-when mt-2 text-right lg:mt-0">
          <time className="text-[11px] tabular-nums text-[var(--muted)]" dateTime={entry.timestamp} title={whenFull}>
            {when}
          </time>
          <p className="mt-0.5 hidden text-[10px] text-[var(--muted)]/80 lg:block">
            {whenFull.split(', ')[1] ?? whenFull}
          </p>
        </div>

        {renderMeta && <div className="col-span-full mt-1 text-[10px] text-[var(--muted)]">{renderMeta(entry)}</div>}
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2.5 px-3 py-2 transition hover:bg-[var(--surface-hover)]/25">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)]/80">
        <Icon className={`h-3 w-3 ${iconText ?? 'text-[var(--muted)]'}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-medium leading-snug">{title}</p>
          <time
            className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]"
            dateTime={entry.timestamp}
            title={whenFull}
          >
            {when}
          </time>
        </div>

        {(entry.actor || entry.server || entry.ip || showEventKey || renderMeta) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--muted)]">
            {entry.actor && (
              <span className="truncate">
                {entry.actor.username}
                {entry.actor.role === 'admin' && (
                  <span className="activity-admin-badge ml-1">admin</span>
                )}
              </span>
            )}
            {entry.server && (
              <>
                {entry.actor && <span className="opacity-40">·</span>}
                <Link
                  to={serverConsolePath(location.pathname, entry.server.id)}
                  className="truncate transition hover:accent-text"
                >
                  {entry.server.name}
                </Link>
              </>
            )}
            {entry.ip && entry.ip !== 'unknown' && (
              <>
                {(entry.actor || entry.server) && <span className="opacity-40">·</span>}
                <span className="font-mono opacity-80">{entry.ip}</span>
              </>
            )}
            {showEventKey && (
              <>
                {(entry.actor || entry.server || entry.ip) && <span className="opacity-40">·</span>}
                <span className="font-mono opacity-60">{entry.event}</span>
              </>
            )}
            {renderMeta?.(entry)}
          </div>
        )}
      </div>
    </li>
  );
}
