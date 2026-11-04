import type { LucideIcon } from 'lucide-react';
import { Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import type { NodeCapacityStats, NodeLiveUsageSummary } from '../../../../lib/api';
import { usageTone } from '../../../../lib/node-capacity';
import { formatBytes } from '../../../../lib/stats';
import { formatResource, formatResourceAmount } from '../../../../lib/server-theme';

const TONE_COLOR = {
  success: 'var(--success-fg, #22c55e)',
  warning: 'var(--warning-fg, #eab308)',
  danger: 'var(--danger-fg, #ef4444)',
  muted: 'color-mix(in srgb, var(--border) 80%, transparent)',
} as const;

function toneColor(percent: number, hasValue: boolean): string {
  if (!hasValue || percent <= 0) return TONE_COLOR.muted;
  return TONE_COLOR[usageTone(percent)];
}

function fillClass(percent: number): string {
  const tone = usageTone(percent);
  if (tone === 'success') return 'ds-progress-fill--good';
  if (tone === 'warning') return 'ds-progress-fill--warn';
  return 'ds-progress-fill--bad';
}

function CapacityRing({
  percent,
  icon: Icon,
  color,
}: {
  percent: number;
  icon: LucideIcon;
  color: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="ds-nd-cap-ring">
      <svg viewBox="0 0 108 108" className="ds-nd-cap-ring-svg" aria-hidden>
        <circle cx="54" cy="54" r={radius} className="ds-nd-cap-ring-track" />
        <circle
          cx="54"
          cy="54"
          r={radius}
          className="ds-nd-cap-ring-progress"
          stroke={color}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="ds-nd-cap-ring-center">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="ds-nd-cap-ring-pct">{percent}%</span>
      </div>
    </div>
  );
}

function LiveCard({
  label,
  percent,
  primary,
  secondary,
  icon,
  hint,
}: {
  label: string;
  percent: number;
  primary: string;
  secondary: string;
  icon: LucideIcon;
  hint?: string;
}) {
  const color = toneColor(percent, primary !== '—');
  return (
    <article className="ds-nd-cap-live-card">
      <CapacityRing percent={percent} icon={icon} color={color} />
      <div className="ds-nd-cap-live-copy">
        <p className="ds-nd-cap-live-label">{label}</p>
        <p className="ds-nd-cap-live-primary">{primary}</p>
        <p className="ds-nd-cap-live-secondary">{secondary}</p>
        {hint ? <p className="ds-nd-cap-live-hint">{hint}</p> : null}
      </div>
    </article>
  );
}

function AssignedMeter({
  label,
  percent,
  primary,
  secondary,
  icon: Icon,
}: {
  label: string;
  percent: number;
  primary: string;
  secondary: string;
  icon: LucideIcon;
}) {
  const hasLimit = percent > 0 || secondary !== 'Panel limits only';
  return (
    <div className="ds-nd-cap-assigned">
      <div className="ds-nd-cap-assigned-head">
        <span className="ds-nd-cap-assigned-icon" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-nd-cap-assigned-title-row">
            <span className="ds-nd-cap-assigned-label">{label}</span>
            <span className="ds-nd-cap-assigned-pct">{percent}%</span>
          </div>
          <p className="ds-nd-cap-assigned-primary">{primary}</p>
        </div>
      </div>
      {hasLimit ? (
        <div className="ds-progress ds-nd-cap-progress" aria-hidden>
          <div
            className={`ds-progress-fill ${fillClass(percent)}`}
            style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
          />
        </div>
      ) : null}
      <p className="ds-nd-cap-assigned-secondary">{secondary}</p>
    </div>
  );
}

export function NodeOverviewResourceRings({
  capacity,
  liveUsage,
  memory,
  memoryOverallocate,
  disk,
  diskOverallocate,
  allocationCount,
  assignedAllocations,
}: {
  capacity: NodeCapacityStats;
  liveUsage: NodeLiveUsageSummary | null;
  memory: number;
  memoryOverallocate: number;
  disk: number;
  diskOverallocate: number;
  allocationCount: number;
  assignedAllocations: number;
}) {
  const liveMemMiB = liveUsage ? liveUsage.liveMemoryBytes / (1024 * 1024) : 0;
  const liveDiskMiB = liveUsage ? liveUsage.liveDiskBytes / (1024 * 1024) : 0;
  const liveMemPct =
    capacity.effectiveMemoryLimit > 0
      ? Math.min(100, Math.round((liveMemMiB / capacity.effectiveMemoryLimit) * 100))
      : 0;
  const liveDiskPct =
    capacity.effectiveDiskLimit > 0
      ? Math.min(100, Math.round((liveDiskMiB / capacity.effectiveDiskLimit) * 100))
      : 0;
  const liveCpu = liveUsage ? Math.min(100, Math.round(liveUsage.liveCpuPercent)) : 0;

  const freeAllocations = Math.max(0, allocationCount - assignedAllocations);
  const portPercent =
    allocationCount > 0 ? Math.min(100, Math.round((assignedAllocations / allocationCount) * 100)) : 0;

  const memLimit = memory > 0 ? memory + Math.floor((memory * memoryOverallocate) / 100) : 0;
  const diskLimit = disk > 0 ? disk + Math.floor((disk * diskOverallocate) / 100) : 0;

  const liveHint =
    liveUsage == null
      ? 'No live Wings telemetry yet'
      : liveUsage.liveServerCount > 0
        ? `${liveUsage.liveServerCount}/${liveUsage.serverCount} servers reporting`
        : liveUsage.serverCount > 0
          ? 'Servers offline or unreachable'
          : 'No servers on this node';

  return (
    <div className="ds-nd-cap">
      <section className="ds-nd-cap-section" aria-label="Live usage">
        <div className="ds-nd-cap-section-head">
          <div>
            <p className="ds-nd-cap-section-label">Live usage</p>
            <p className="ds-nd-cap-section-sub">{liveHint}</p>
          </div>
          {liveUsage ? (
            <span className="ds-nd-cap-chip">
              <Cpu className="h-3 w-3" aria-hidden />
              CPU {liveCpu}%
            </span>
          ) : null}
        </div>

        <div className="ds-nd-cap-live-grid">
          <LiveCard
            label="Memory"
            percent={liveMemPct}
            primary={liveUsage ? formatBytes(liveUsage.liveMemoryBytes) : '—'}
            secondary={
              capacity.effectiveMemoryLimit > 0
                ? `of ${formatResource(capacity.effectiveMemoryLimit, 'MiB')} node limit`
                : 'No node RAM limit'
            }
            icon={MemoryStick}
          />
          <LiveCard
            label="Disk"
            percent={liveDiskPct}
            primary={liveUsage ? formatBytes(liveUsage.liveDiskBytes) : '—'}
            secondary={
              capacity.effectiveDiskLimit > 0
                ? `of ${formatResource(capacity.effectiveDiskLimit, 'MiB')} node limit`
                : 'No node disk limit'
            }
            icon={HardDrive}
          />
        </div>
      </section>

      <section className="ds-nd-cap-section" aria-label="Assigned capacity">
        <div className="ds-nd-cap-section-head">
          <div>
            <p className="ds-nd-cap-section-label">Assigned to servers</p>
            <p className="ds-nd-cap-section-sub">Panel limits reserved across this node</p>
          </div>
        </div>
        <div className="ds-nd-cap-assigned-grid">
          <AssignedMeter
            label="Memory"
            percent={capacity.memoryUsedPercent}
            primary={formatResourceAmount(capacity.allocatedMemory, 'MiB')}
            secondary={
              capacity.effectiveMemoryLimit > 0
                ? `${formatResourceAmount(capacity.memoryFree, 'MiB')} headroom left`
                : 'Panel limits only'
            }
            icon={MemoryStick}
          />
          <AssignedMeter
            label="Disk"
            percent={capacity.diskUsedPercent}
            primary={formatResourceAmount(capacity.allocatedDisk, 'MiB')}
            secondary={
              capacity.effectiveDiskLimit > 0
                ? `${formatResourceAmount(capacity.diskFree, 'MiB')} headroom left`
                : 'Panel limits only'
            }
            icon={HardDrive}
          />
        </div>
      </section>

      <div className="ds-nd-cap-footer">
        <section className="ds-nd-cap-footer-card" aria-label="Node limits">
          <p className="ds-nd-cap-section-label">Node limits</p>
          <div className="ds-nd-cap-limits">
            <div className="ds-nd-cap-limit">
              <span className="ds-nd-cap-limit-label">RAM</span>
              <span className="ds-nd-cap-limit-value">
                {memLimit > 0 ? formatResource(memLimit, 'MiB') : 'Unlimited'}
              </span>
              {memoryOverallocate > 0 && memory > 0 ? (
                <span className="ds-nd-cap-limit-meta">
                  {formatResource(memory, 'MiB')} +{memoryOverallocate}%
                </span>
              ) : null}
            </div>
            <div className="ds-nd-cap-limit">
              <span className="ds-nd-cap-limit-label">Disk</span>
              <span className="ds-nd-cap-limit-value">
                {diskLimit > 0 ? formatResource(diskLimit, 'MiB') : 'Unlimited'}
              </span>
              {diskOverallocate > 0 && disk > 0 ? (
                <span className="ds-nd-cap-limit-meta">
                  {formatResource(disk, 'MiB')} +{diskOverallocate}%
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ds-nd-cap-footer-card" aria-label="Port allocation">
          <div className="ds-nd-cap-ports-head">
            <p className="ds-nd-cap-section-label">Port allocation</p>
            <span className="ds-nd-cap-ports-pct">{allocationCount > 0 ? `${portPercent}%` : '—'}</span>
          </div>
          {allocationCount > 0 ? (
            <>
              <div className="ds-progress ds-nd-cap-progress" aria-hidden>
                <div
                  className={`ds-progress-fill ${fillClass(portPercent)}`}
                  style={{ width: `${Math.max(portPercent > 0 ? 4 : 0, portPercent)}%` }}
                />
              </div>
              <div className="ds-nd-cap-ports-meta">
                <span>
                  <Network className="h-3 w-3" aria-hidden />
                  {assignedAllocations} assigned
                </span>
                <span>{freeAllocations} free</span>
                <span>{allocationCount} total</span>
              </div>
            </>
          ) : (
            <p className="ds-nd-cap-ports-empty">No allocations on this node yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
