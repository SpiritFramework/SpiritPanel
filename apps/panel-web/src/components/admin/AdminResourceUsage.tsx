import { HardDrive, MemoryStick } from 'lucide-react';
import type { NodeCapacityStats } from '../../lib/api';
import { formatCapacityLabel, formatFreeLabel, usageTone } from '../../lib/node-capacity';
import { formatResource } from '../../lib/server-theme';

const TONE_BAR: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

export function ResourceUsageBar({
  label,
  used,
  limit,
  percent,
  compact,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
  compact?: boolean;
}) {
  const tone = usageTone(percent);
  const free = Math.max(0, limit - used);

  return (
    <div className={compact ? 'min-w-[120px]' : 'min-w-[140px]'}>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-[var(--muted)]">{label}</span>
        <span className="shrink-0 tabular-nums font-medium">{percent}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
          className={`h-full rounded-full transition-all ${TONE_BAR[tone]}`}
          style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
          {formatCapacityLabel(used, limit)} · {formatFreeLabel(free)}
        </p>
      )}
    </div>
  );
}

export function NodeCapacityBars({
  capacity,
  compact,
}: {
  capacity: NodeCapacityStats;
  compact?: boolean;
}) {
  if (capacity.effectiveMemoryLimit <= 0 && capacity.effectiveDiskLimit <= 0) {
    return (
      <span className="text-[10px] text-[var(--muted)]">
        {capacity.allocatedMemory > 0 || capacity.allocatedDisk > 0
          ? `${formatCapacityLabel(capacity.allocatedMemory, 0)} · ${formatResource(capacity.allocatedDisk, 'MiB')} disk`
          : 'No limits configured'}
      </span>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-2.5'}`}>
      {capacity.effectiveMemoryLimit > 0 && (
        <ResourceUsageBar
          label="RAM"
          used={capacity.allocatedMemory}
          limit={capacity.effectiveMemoryLimit}
          percent={capacity.memoryUsedPercent}
          compact={compact}
        />
      )}
      {capacity.effectiveDiskLimit > 0 && (
        <ResourceUsageBar
          label="Disk"
          used={capacity.allocatedDisk}
          limit={capacity.effectiveDiskLimit}
          percent={capacity.diskUsedPercent}
          compact={compact}
        />
      )}
    </div>
  );
}

export function NodeCapacityChips({ capacity }: { capacity: NodeCapacityStats }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <CapacityChip
        icon={MemoryStick}
        label={formatCapacityLabel(capacity.allocatedMemory, capacity.effectiveMemoryLimit)}
        percent={capacity.memoryUsedPercent}
        title="Allocated RAM vs node limit"
      />
      <CapacityChip
        icon={HardDrive}
        label={formatCapacityLabel(capacity.allocatedDisk, capacity.effectiveDiskLimit)}
        percent={capacity.diskUsedPercent}
        title="Allocated disk vs node limit"
      />
    </div>
  );
}

function CapacityChip({
  icon: Icon,
  label,
  percent,
  title,
}: {
  icon: typeof MemoryStick;
  label: string;
  percent: number;
  title: string;
}) {
  const tone = usageTone(percent);
  const toneClass =
    tone === 'danger'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : tone === 'warning'
        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
        : 'bg-[var(--bg-elevated)] text-[var(--muted)] border-[var(--border)]';

  return (
    <span
      title={`${title} (${percent}% used)`}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] tabular-nums ${toneClass}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      {label}
    </span>
  );
}
