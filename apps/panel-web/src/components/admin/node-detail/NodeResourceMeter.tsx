import type { NodeCapacityStats, NodeLiveUsageSummary } from '../../../lib/api';
import { formatCapacityLabel, usageTone } from '../../../lib/node-capacity';
import { formatBytes } from '../../../lib/stats';
import { formatResource, formatResourceAmount } from '../../../lib/server-theme';

function meterFillClass(tone: 'success' | 'warning' | 'danger') {
  if (tone === 'success') return 'ds-progress-fill--good';
  if (tone === 'warning') return 'ds-progress-fill--warn';
  return 'ds-progress-fill--bad';
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0 || used <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function NodeResourceMeter({
  label,
  used,
  limit,
  percent,
  usedLabel,
  compact,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
  /** Override display for used amount (e.g. live bytes formatted). */
  usedLabel?: string;
  compact?: boolean;
}) {
  const tone = usageTone(percent);
  const hasLimit = limit > 0;
  const amountLabel = usedLabel ?? formatResourceAmount(used, 'MiB');
  const usageLabel = hasLimit
    ? `${amountLabel} / ${formatResource(limit, 'MiB')}`
    : `${amountLabel} allocated`;

  return (
    <div className={`ds-nd-meter${compact ? ' ds-nd-meter--compact' : ''}`}>
      {label ? (
        <div className="ds-nd-meter-head">
          <span className="ds-nd-meter-label">{label}</span>
          <span className="ds-nd-meter-value">
            {hasLimit ? (
              <>
                <span className="ds-text-mono">{usageLabel}</span>
                <span className="ds-nd-meter-pct">{percent}%</span>
              </>
            ) : (
              <span className="ds-text-mono">{usageLabel} · no limit</span>
            )}
          </span>
        </div>
      ) : (
        <div className="ds-nd-meter-head">
          <span className="ds-nd-meter-value ds-nd-meter-value--solo">
            <span className="ds-text-mono">{usageLabel}</span>
            {hasLimit ? <span className="ds-nd-meter-pct">{percent}%</span> : null}
          </span>
        </div>
      )}
      {hasLimit ? (
        <div className="ds-progress" aria-hidden>
          <div
            className={`ds-progress-fill ${meterFillClass(tone)}`}
            style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function NodeResourcePanel({
  capacity,
  liveUsage,
  compact,
}: {
  capacity: NodeCapacityStats;
  liveUsage?: NodeLiveUsageSummary | null;
  compact?: boolean;
}) {
  const liveMemoryMiB = liveUsage ? liveUsage.liveMemoryBytes / (1024 * 1024) : 0;
  const liveDiskMiB = liveUsage ? liveUsage.liveDiskBytes / (1024 * 1024) : 0;
  const liveMemoryPct = usagePercent(liveMemoryMiB, capacity.effectiveMemoryLimit);
  const liveDiskPct = usagePercent(liveDiskMiB, capacity.effectiveDiskLimit);
  const hasLive =
    liveUsage &&
    (liveUsage.liveServerCount > 0 ||
      liveUsage.runningCount > 0 ||
      liveUsage.liveMemoryBytes > 0 ||
      liveUsage.liveDiskBytes > 0);

  return (
    <div className={`ds-nd-resource-panel${compact ? ' ds-nd-resource-panel--compact' : ''}`}>
      {liveUsage ? (
        <div className="ds-nd-resource-section">
          {!compact ? (
            <p className="ds-nd-resource-section-label">
              In use now
              {liveUsage.liveServerCount > 0
                ? ` · ${liveUsage.liveServerCount}/${liveUsage.serverCount} reporting from Wings`
                : liveUsage.serverCount > 0
                  ? ' · no live data (servers offline or unreachable)'
                  : ''}
            </p>
          ) : (
            <p className="ds-nd-resource-section-label">In use now (live)</p>
          )}
          {hasLive ? (
            <>
              <NodeResourceMeter
                label="Memory"
                used={Math.round(liveMemoryMiB)}
                limit={capacity.effectiveMemoryLimit}
                percent={liveMemoryPct}
                usedLabel={formatBytes(liveUsage.liveMemoryBytes)}
                compact={compact}
              />
              <NodeResourceMeter
                label="Disk"
                used={Math.round(liveDiskMiB)}
                limit={capacity.effectiveDiskLimit}
                percent={liveDiskPct}
                usedLabel={formatBytes(liveUsage.liveDiskBytes)}
                compact={compact}
              />
            </>
          ) : (
            <p className="ds-text-xs ds-text-muted">
              {liveUsage.serverCount === 0
                ? 'No servers on this node yet.'
                : 'Start a server or open its console to refresh live stats from Wings.'}
            </p>
          )}
        </div>
      ) : null}

      <div className="ds-nd-resource-section">
        {!compact ? (
          <p className="ds-nd-resource-section-label">Assigned to servers (panel limits)</p>
        ) : (
          <p className="ds-nd-resource-section-label">Assigned limits</p>
        )}
        <NodeResourceMeter
          label="Memory"
          used={capacity.allocatedMemory}
          limit={capacity.effectiveMemoryLimit}
          percent={capacity.memoryUsedPercent}
          compact={compact}
        />
        <NodeResourceMeter
          label="Disk"
          used={capacity.allocatedDisk}
          limit={capacity.effectiveDiskLimit}
          percent={capacity.diskUsedPercent}
          compact={compact}
        />
      </div>

      {!compact && (capacity.effectiveMemoryLimit > 0 || capacity.effectiveDiskLimit > 0) ? (
        <div className="ds-nd-resource-headroom">
          {capacity.effectiveMemoryLimit > 0 ? (
            <span>
              RAM headroom: <strong>{formatResourceAmount(capacity.memoryFree, 'MiB')}</strong>
            </span>
          ) : null}
          {capacity.effectiveDiskLimit > 0 ? (
            <span>
              Disk headroom: <strong>{formatResourceAmount(capacity.diskFree, 'MiB')}</strong>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Limits configured on the node (not allocated totals). */
export function NodeLimitSummary({
  memory,
  memoryOverallocate,
  disk,
  diskOverallocate,
}: {
  memory: number;
  memoryOverallocate: number;
  disk: number;
  diskOverallocate: number;
}) {
  const memLimit = memory > 0 ? memory + Math.floor((memory * memoryOverallocate) / 100) : 0;
  const diskLimit = disk > 0 ? disk + Math.floor((disk * diskOverallocate) / 100) : 0;

  return (
    <div className="ds-nd-limit-summary">
      <div>
        <span className="ds-nd-limit-summary-label">RAM limit</span>
        <span className="ds-nd-limit-summary-value">
          {memLimit > 0 ? formatResource(memLimit, 'MiB') : 'Unlimited'}
        </span>
      </div>
      <div>
        <span className="ds-nd-limit-summary-label">Disk limit</span>
        <span className="ds-nd-limit-summary-value">
          {diskLimit > 0 ? formatResource(diskLimit, 'MiB') : 'Unlimited'}
        </span>
      </div>
    </div>
  );
}
