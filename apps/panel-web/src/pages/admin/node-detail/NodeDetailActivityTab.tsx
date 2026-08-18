import { Activity } from 'lucide-react';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';
import { EmptyState } from '../../../components/ui';
import { formatActivityTime } from '../../../lib/activity';
import type { AdminNodeDetail } from '../../../lib/api';

export function NodeDetailActivityTab({ detail }: { detail: AdminNodeDetail }) {
  return (
    <div className="ds-nd-body">
      <NodeDetailPanel title="Activity log" description="Recent panel events for this node" icon={Activity}>
        {detail.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="Node events will appear here." />
        ) : (
          <ul className="ds-nd-activity-list">
            {detail.recentActivity.map((entry) => (
              <li key={entry.id} className="ds-nd-activity-item">
                <span className="ds-nd-activity-dot" aria-hidden />
                <div className="min-w-0">
                  <p className="ds-nd-activity-text">{entry.description}</p>
                  <p className="ds-nd-activity-meta">
                    {entry.actor?.username ? `${entry.actor.username} · ` : ''}
                    {formatActivityTime(entry.timestamp)}
                    {entry.server?.name ? ` · ${entry.server.name}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </NodeDetailPanel>
    </div>
  );
}
