import { Layers, Puzzle, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
import type { PluginFleetStats } from './plugin-fleet-utils';

export function PluginsHeader({
  stats,
  refreshing,
  onRefresh,
}: {
  stats: PluginFleetStats;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const statusLabel = stats.enabled > 0 ? `${stats.enabled} active` : 'All off';
  const pillTone = stats.enabled > 0 ? 'ok' : 'neutral';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Extensions"
        title="Panel plugins"
        description="Enable built-in features, configure catalogs, and control what server owners can install"
        pill={statusLabel}
        pillTone={pillTone}
        actions={
          <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh plugins">
            <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            Refresh
          </AdminToolButton>
        }
      />
      <AdminKpiStrip
        label="Plugin summary"
        columns={4}
        items={[
          { icon: Puzzle, label: 'Installed', value: stats.total },
          {
            icon: Zap,
            label: 'Enabled',
            value: stats.enabled,
            tone: stats.enabled > 0 ? 'success' : undefined,
          },
          { icon: Layers, label: 'Catalog items', value: stats.catalogEntries },
          { icon: Sparkles, label: 'Type', value: 'Built-in' },
        ]}
      />
    </div>
  );
}
