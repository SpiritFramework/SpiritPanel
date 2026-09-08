import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { HardDrive, MemoryStick } from 'lucide-react';
import type { NodeCapacityStats, NodeLiveUsageSummary } from '../../../../lib/api';
import { formatFreeLabel, usageTone } from '../../../../lib/node-capacity';
import { formatBytes } from '../../../../lib/stats';
import { formatResource, formatResourceAmount } from '../../../../lib/server-theme';

function pct(used: number, limit: number): number {
  if (limit <= 0 || used <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function fillClass(tone: 'success' | 'warning' | 'danger') {
  if (tone === 'success') return 'ds-progress-fill--good';
  if (tone === 'warning') return 'ds-progress-fill--warn';
  return 'ds-progress-fill--bad';
}

export function NodeSettingsUsageSnapshot({
  capacity,
  liveUsage = null,
  showLive = false,
}: {
  capacity: NodeCapacityStats;
  liveUsage?: NodeLiveUsageSummary | null;
  showLive?: boolean;
}) {
  const liveMemMiB = liveUsage ? liveUsage.liveMemoryBytes / (1024 * 1024) : 0;
  const liveDiskMiB = liveUsage ? liveUsage.liveDiskBytes / (1024 * 1024) : 0;
  const hasLive =
    liveUsage &&
    (liveUsage.liveServerCount > 0 ||
      liveUsage.runningCount > 0 ||
      liveUsage.liveMemoryBytes > 0 ||
      liveUsage.liveDiskBytes > 0);

  return (
    <div className={`ds-nd-st-usage${showLive ? '' : ' ds-nd-st-usage--assigned-only'}`}>
      <div className="ds-nd-st-usage-grid">
        {showLive ? (
          <UsageColumn
            title="Live from Wings"
            hint={
              hasLive
                ? 'Real-time container usage on this host'
                : liveUsage?.serverCount === 0
                  ? 'No servers deployed yet'
                  : 'Start a server to collect live stats'
            }
            variant="live"
          >
            {hasLive && liveUsage ? (
              <>
                <UsageMetric
                  icon={MemoryStick}
                  label="Memory"
                  usedLabel={formatBytes(liveUsage.liveMemoryBytes)}
                  limit={capacity.effectiveMemoryLimit}
                  percent={pct(liveMemMiB, capacity.effectiveMemoryLimit)}
                />
                <UsageMetric
                  icon={HardDrive}
                  label="Disk"
                  usedLabel={formatBytes(liveUsage.liveDiskBytes)}
                  limit={capacity.effectiveDiskLimit}
                  percent={pct(liveDiskMiB, capacity.effectiveDiskLimit)}
                />
              </>
            ) : (
              <p className="ds-nd-st-usage-empty">
                {liveUsage?.serverCount === 0
                  ? 'Deploy a server on this node to see live RAM and disk usage.'
                  : 'No live data yet — servers may be offline or Wings is not reporting stats.'}
              </p>
            )}
          </UsageColumn>
        ) : null}

        <UsageColumn
          title="Panel assigned"
          hint="Sum of server limits configured in the panel"
          variant="assigned"
        >
          <UsageMetric
            icon={MemoryStick}
            label="Memory"
            usedLabel={formatResourceAmount(capacity.allocatedMemory, 'MiB')}
            limit={capacity.effectiveMemoryLimit}
            percent={capacity.memoryUsedPercent}
            freeMiB={capacity.memoryFree}
          />
          <UsageMetric
            icon={HardDrive}
            label="Disk"
            usedLabel={formatResourceAmount(capacity.allocatedDisk, 'MiB')}
            limit={capacity.effectiveDiskLimit}
            percent={capacity.diskUsedPercent}
            freeMiB={capacity.diskFree}
          />
        </UsageColumn>
      </div>

      {capacity.effectiveMemoryLimit > 0 || capacity.effectiveDiskLimit > 0 ? (
        <footer className="ds-nd-st-usage-foot">
          {capacity.effectiveMemoryLimit > 0 ? (
            <span className="ds-nd-st-usage-chip">
              RAM headroom: <strong>{formatFreeLabel(capacity.memoryFree)}</strong>
            </span>
          ) : null}
          {capacity.effectiveDiskLimit > 0 ? (
            <span className="ds-nd-st-usage-chip">
              Disk headroom: <strong>{formatFreeLabel(capacity.diskFree)}</strong>
            </span>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}

function UsageColumn({
  title,
  hint,
  variant,
  children,
}: {
  title: string;
  hint: string;
  variant: 'live' | 'assigned';
  children: ReactNode;
}) {
  return (
    <div className={`ds-nd-st-usage-col ds-nd-st-usage-col--${variant}`}>
      <div className="ds-nd-st-usage-col-head">
        <div className="min-w-0">
          <p className="ds-nd-st-usage-col-title">{title}</p>
          <p className="ds-nd-st-usage-col-hint">{hint}</p>
        </div>
      </div>
      <div className="ds-nd-st-usage-metrics">{children}</div>
    </div>
  );
}

function UsageMetric({
  icon: Icon,
  label,
  usedLabel,
  limit,
  percent,
  freeMiB,
}: {
  icon: LucideIcon;
  label: string;
  usedLabel: string;
  limit: number;
  percent: number;
  freeMiB?: number;
}) {
  const tone = usageTone(percent);
  const hasLimit = limit > 0;
  const limitLabel = hasLimit ? formatResource(limit, 'MiB') : 'Unlimited';

  return (
    <div className={`ds-nd-st-usage-metric ds-nd-st-usage-metric--${tone}`}>
      <div className="ds-nd-st-usage-metric-top">
        <span className="ds-nd-st-usage-metric-icon" aria-hidden>
          <Icon className="ds-icon ds-icon--sm" />
        </span>
        <div className="ds-nd-st-usage-metric-meta min-w-0">
          <span className="ds-nd-st-usage-metric-label">{label}</span>
          <span className="ds-nd-st-usage-metric-amount">
            <span className="ds-text-mono">{usedLabel}</span>
            {hasLimit ? (
              <>
                <span className="ds-nd-st-usage-metric-sep">/</span>
                <span className="ds-text-mono ds-nd-st-usage-metric-limit">{limitLabel}</span>
              </>
            ) : null}
          </span>
        </div>
        {hasLimit ? (
          <span className={`ds-nd-st-usage-metric-pct ds-nd-st-usage-metric-pct--${tone}`}>
            {percent}%
          </span>
        ) : (
          <span className="ds-nd-st-usage-metric-pct ds-nd-st-usage-metric-pct--muted">—</span>
        )}
      </div>
      {hasLimit ? (
        <div className="ds-progress ds-nd-st-usage-metric-bar" aria-hidden>
          <div
            className={`ds-progress-fill ${fillClass(tone)}`}
            style={{ width: `${Math.max(percent > 0 ? 5 : 0, percent)}%` }}
          />
        </div>
      ) : (
        <div className="ds-nd-st-usage-metric-nolimit">No node limit set</div>
      )}
      {hasLimit && freeMiB != null ? (
        <p className="ds-nd-st-usage-metric-free">{formatFreeLabel(freeMiB)} remaining</p>
      ) : null}
    </div>
  );
}
