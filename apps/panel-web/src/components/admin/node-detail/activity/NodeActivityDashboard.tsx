import { ClipboardList } from 'lucide-react';
import { formatActivityTime, getActivityMeta, groupActivityByDate, type ActivityEntry } from '../../../../lib/activity';
import type { ActivityLogEntry, AdminNodeDetail } from '../../../../lib/api';
import {
  getNodeActivityCategory,
  getNodeActivityCategoryLabel,
  getNodeActivityChangeTags,
} from '../../../../lib/node-activity';
import { EmptyState } from '../../../ui';
import { NodeOverviewSection } from '../NodeDetailShell';

type NodeActivityEntry = ActivityLogEntry & { properties?: Record<string, unknown> | null };

export function NodeActivityDashboard({ detail }: { detail: AdminNodeDetail }) {
  const entries = detail.recentActivity as NodeActivityEntry[];
  const groups = groupActivityByDate(entries as ActivityEntry[]);
  const lastChange = entries[0]?.timestamp;

  return (
    <div className="ds-nd-body ds-nd-ac">
      <header className="ds-nd-ac-topbar">
        <div className="min-w-0">
          <h2 className="ds-nd-ac-title">Panel changes</h2>
          <p className="ds-nd-ac-subtitle">
            Settings edits, Wings config downloads, token rotations, and allocation changes on this node.
          </p>
        </div>
        <div className="ds-nd-ac-summary" aria-label="Activity summary">
          <span className="ds-nd-ac-summary-stat">
            <strong>{entries.length}</strong>
            <span>recorded</span>
          </span>
          {lastChange ? (
            <span className="ds-nd-ac-summary-stat">
              <strong>{formatActivityTime(lastChange)}</strong>
              <span>latest</span>
            </span>
          ) : null}
        </div>
      </header>

      {entries.length === 0 ? (
        <NodeOverviewSection
          icon={ClipboardList}
          title="No panel changes yet"
          description="Edits to this node, config downloads, and allocation updates will appear here."
        >
          <EmptyState
            title="Nothing to show"
            description="Server power, file, and console events are tracked on each server — not on the node."
          />
        </NodeOverviewSection>
      ) : (
        <div className="ds-nd-ac-timeline">
          {groups.map((group) => (
            <section key={group.label} className="ds-nd-ac-group">
              <header className="ds-nd-ac-date">
                <span className="ds-nd-ac-date-label">{group.label}</span>
                <span className="ds-nd-ac-date-count">{group.entries.length}</span>
              </header>
              <ul className="ds-nd-ac-list">
                {group.entries.map((entry) => (
                  <NodeActivityRow key={entry.id} entry={entry as NodeActivityEntry} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeActivityRow({ entry }: { entry: NodeActivityEntry }) {
  const meta = getActivityMeta(entry.event);
  const Icon = meta.icon;
  const category = getNodeActivityCategory(entry.event);
  const categoryLabel = getNodeActivityCategoryLabel(category);
  const title = entry.description?.trim() || meta.label;
  const changeTags = getNodeActivityChangeTags(entry);
  const whenFull = new Date(entry.timestamp).toLocaleString();
  const [iconText, iconBg] = meta.color.split(' ');

  return (
    <li className={`ds-nd-ac-row ds-nd-ac-row--${category}`}>
      <span className={`ds-nd-ac-icon ${iconBg ?? ''}`} aria-hidden>
        <Icon className={`ds-icon ds-icon--sm ${iconText ?? ''}`} />
      </span>
      <div className="ds-nd-ac-row-main min-w-0">
        <div className="ds-nd-ac-row-head">
          <div className="min-w-0 flex-1">
            <div className="ds-nd-ac-row-titles">
              <p className="ds-nd-ac-row-title">{title}</p>
              <span className={`ds-nd-ac-cat ds-nd-ac-cat--${category}`}>{categoryLabel}</span>
            </div>
            <p className="ds-nd-ac-row-meta">
              {entry.actor?.username ? (
                <>
                  <span>{entry.actor.username}</span>
                  <span className="ds-nd-ac-row-sep" aria-hidden>
                    ·
                  </span>
                </>
              ) : null}
              <time dateTime={entry.timestamp} title={whenFull}>
                {formatActivityTime(entry.timestamp)}
              </time>
              {entry.ip ? (
                <>
                  <span className="ds-nd-ac-row-sep" aria-hidden>
                    ·
                  </span>
                  <span className="ds-text-mono">{entry.ip}</span>
                </>
              ) : null}
            </p>
          </div>
          <span className="ds-nd-ac-event-key ds-text-mono">{meta.label}</span>
        </div>
        {changeTags.length > 0 ? (
          <ul className="ds-nd-ac-tags">
            {changeTags.map((tag) => (
              <li key={tag} className="ds-nd-ac-tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
