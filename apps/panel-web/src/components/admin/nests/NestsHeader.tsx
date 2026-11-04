import { Egg, Layers, Plus, RefreshCw, Upload } from 'lucide-react';
import { AdminHero, AdminKpiStrip, AdminToolButton } from '../primitives';
import { getNestFleetTone, type NestFleetStats } from './nest-fleet-utils';

export function NestsHeader({
  stats,
  refreshing,
  fullAdmin,
  onRefresh,
  onImport,
  onCreate,
}: {
  stats: NestFleetStats;
  refreshing: boolean;
  fullAdmin: boolean;
  onRefresh: () => void;
  onImport: () => void;
  onCreate: () => void;
}) {
  const tone = getNestFleetTone(stats);
  const statusLabel =
    stats.nests === 0
      ? 'No nests'
      : stats.empty > 0
        ? `${stats.empty} empty nest${stats.empty === 1 ? '' : 's'}`
        : stats.disabled > 0
          ? `${stats.disabled} disabled egg${stats.disabled === 1 ? '' : 's'}`
          : `${stats.eggs} egg${stats.eggs === 1 ? '' : 's'} ready`;

  const pillTone = tone === 'warning' ? 'warn' : tone === 'healthy' ? 'ok' : 'neutral';

  return (
    <div className="ds-nd-list-top">
      <AdminHero
        eyebrow="Templates"
        title="Nests & eggs"
        description="Group PTDL eggs into nests, tune startup variables, and keep templates ready to provision"
        pill={statusLabel}
        pillTone={pillTone}
        actions={
          <>
            <AdminToolButton onClick={onRefresh} disabled={refreshing} aria-label="Refresh nests">
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
              Refresh
            </AdminToolButton>
            {fullAdmin ? (
              <>
                <AdminToolButton onClick={onImport}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Import egg
                </AdminToolButton>
                <AdminToolButton onClick={onCreate} primary>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Create nest
                </AdminToolButton>
              </>
            ) : null}
          </>
        }
      />
      <AdminKpiStrip
        label="Template summary"
        columns={4}
        items={[
          { icon: Layers, label: 'Nests', value: stats.nests },
          { icon: Egg, label: 'Eggs', value: stats.eggs },
          { icon: Layers, label: 'With eggs', value: stats.withEggs },
          {
            icon: Egg,
            label: 'Deployed',
            value: stats.deployed,
            tone: stats.deployed > 0 ? 'success' : undefined,
          },
        ]}
      />
    </div>
  );
}
