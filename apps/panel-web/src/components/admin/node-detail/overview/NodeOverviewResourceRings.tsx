import type { LucideIcon } from 'lucide-react';
import { HardDrive, MemoryStick } from 'lucide-react';
import type { NodeCapacityStats, NodeLiveUsageSummary } from '../../../../lib/api';
import { usageTone } from '../../../../lib/node-capacity';
import { formatBytes } from '../../../../lib/stats';
import { formatResource, formatResourceAmount } from '../../../../lib/server-theme';

const RING_COLORS = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  muted: 'color-mix(in srgb, var(--border) 80%, transparent)',
};

function ringColor(percent: number): string {
  const tone = usageTone(percent);
  return RING_COLORS[tone];
}

function ResourceRing({
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
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const color = percent > 0 ? ringColor(percent) : RING_COLORS.muted;

  return (
    <div className="ds-nd-ov-ring">
      <div className="ds-nd-ov-ring-chart">
        <svg viewBox="0 0 128 128" className="ds-nd-ov-ring-svg" aria-hidden>
          <circle cx="64" cy="64" r={radius} className="ds-nd-ov-ring-track" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="ds-nd-ov-ring-progress"
            stroke={color}
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="ds-nd-ov-ring-center">
          <Icon className="ds-icon ds-icon--sm" style={{ color }} />
          <span className="ds-nd-ov-ring-pct">{percent}%</span>
        </div>
      </div>
      <div className="ds-nd-ov-ring-meta">
        <p className="ds-nd-ov-ring-label">{label}</p>
        <p className="ds-nd-ov-ring-primary">{primary}</p>
        <p className="ds-nd-ov-ring-secondary">{secondary}</p>
      </div>
    </div>
  );
}

export function NodeOverviewResourceRings({
  capacity,
  liveUsage,
}: {
  capacity: NodeCapacityStats;
  liveUsage: NodeLiveUsageSummary | null;
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

  const liveMemLabel = liveUsage ? formatBytes(liveUsage.liveMemoryBytes) : '—';
  const liveDiskLabel = liveUsage ? formatBytes(liveUsage.liveDiskBytes) : '—';

  return (
    <div className="ds-nd-ov-rings">
      <ResourceRing
        label="Live memory"
        percent={liveMemPct}
        primary={liveMemLabel}
        secondary={
          capacity.effectiveMemoryLimit > 0
            ? `of ${formatResource(capacity.effectiveMemoryLimit, 'MiB')} node limit`
            : 'No node RAM limit'
        }
        icon={MemoryStick}
      />
      <ResourceRing
        label="Live disk"
        percent={liveDiskPct}
        primary={liveDiskLabel}
        secondary={
          capacity.effectiveDiskLimit > 0
            ? `of ${formatResource(capacity.effectiveDiskLimit, 'MiB')} node limit`
            : 'No node disk limit'
        }
        icon={HardDrive}
      />
      <ResourceRing
        label="Assigned RAM"
        percent={capacity.memoryUsedPercent}
        primary={formatResourceAmount(capacity.allocatedMemory, 'MiB')}
        secondary={
          capacity.effectiveMemoryLimit > 0
            ? `${formatResourceAmount(capacity.memoryFree, 'MiB')} headroom`
            : 'Panel limits only'
        }
        icon={MemoryStick}
      />
      <ResourceRing
        label="Assigned disk"
        percent={capacity.diskUsedPercent}
        primary={formatResourceAmount(capacity.allocatedDisk, 'MiB')}
        secondary={
          capacity.effectiveDiskLimit > 0
            ? `${formatResourceAmount(capacity.diskFree, 'MiB')} headroom`
            : 'Panel limits only'
        }
        icon={HardDrive}
      />
    </div>
  );
}
