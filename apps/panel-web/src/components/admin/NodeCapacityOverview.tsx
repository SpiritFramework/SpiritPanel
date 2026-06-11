import type { LucideIcon } from 'lucide-react';
import { Gauge, HardDrive, MemoryStick, Network, Server } from 'lucide-react';
import type { NodeCapacityStats } from '../../lib/api';
import { formatCapacityLabel, formatFreeLabel, usageTone } from '../../lib/node-capacity';
import { formatResource } from '../../lib/server-theme';

const TONE_RING: Record<'success' | 'warning' | 'danger', string> = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
};

export function NodeCapacityOverview({
  capacity,
  serverCount,
  assignedAllocations,
  allocationCount,
  compact,
}: {
  capacity: NodeCapacityStats;
  serverCount: number;
  assignedAllocations: number;
  allocationCount: number;
  compact?: boolean;
}) {
  const portPercent =
    allocationCount > 0 ? Math.min(100, Math.round((assignedAllocations / allocationCount) * 100)) : 0;

  return (
    <div className={`node-capacity-overview${compact ? ' node-capacity-overview--compact' : ''}`}>
      <div className="node-capacity-rings">
        {capacity.effectiveMemoryLimit > 0 ? (
          <CapacityRing
            label="Memory"
            sublabel={formatCapacityLabel(capacity.allocatedMemory, capacity.effectiveMemoryLimit)}
            freeLabel={formatFreeLabel(capacity.memoryFree)}
            percent={capacity.memoryUsedPercent}
            icon={MemoryStick}
          />
        ) : (
          <CapacityRingFallback
            label="Memory"
            value={formatResource(capacity.allocatedMemory, 'MiB')}
            hint="No limit set"
            icon={MemoryStick}
          />
        )}
        {capacity.effectiveDiskLimit > 0 ? (
          <CapacityRing
            label="Disk"
            sublabel={formatCapacityLabel(capacity.allocatedDisk, capacity.effectiveDiskLimit)}
            freeLabel={formatFreeLabel(capacity.diskFree)}
            percent={capacity.diskUsedPercent}
            icon={HardDrive}
          />
        ) : (
          <CapacityRingFallback
            label="Disk"
            value={formatResource(capacity.allocatedDisk, 'MiB')}
            hint="No limit set"
            icon={HardDrive}
          />
        )}
      </div>

      <div className="node-capacity-stats">
        <CapacityStat icon={Server} label="Servers" value={String(serverCount)} />
        <CapacityStat
          icon={Network}
          label="Ports"
          value={`${assignedAllocations}/${allocationCount}`}
          hint={allocationCount > 0 ? `${allocationCount - assignedAllocations} free` : undefined}
        />
        <CapacityStat
          icon={Gauge}
          label="RAM headroom"
          value={
            capacity.effectiveMemoryLimit > 0
              ? formatFreeLabel(capacity.memoryFree)
              : formatResource(capacity.allocatedMemory, 'MiB')
          }
        />
        <CapacityStat
          icon={HardDrive}
          label="Disk headroom"
          value={
            capacity.effectiveDiskLimit > 0
              ? formatFreeLabel(capacity.diskFree)
              : formatResource(capacity.allocatedDisk, 'MiB')
          }
        />
      </div>

      {allocationCount > 0 && (
        <div className="node-capacity-ports">
          <div className="node-capacity-ports-head">
            <span>Port allocation</span>
            <span className="tabular-nums">{portPercent}% used</span>
          </div>
          <div className="node-capacity-ports-track">
            <div
              className={`node-capacity-ports-fill node-capacity-ports-fill--${usageTone(portPercent)}`}
              style={{ width: `${Math.max(portPercent > 0 ? 4 : 0, portPercent)}%` }}
            />
          </div>
          <p className="node-capacity-ports-meta">
            {assignedAllocations} assigned · {Math.max(0, allocationCount - assignedAllocations)} available
          </p>
        </div>
      )}
    </div>
  );
}

function CapacityRing({
  label,
  sublabel,
  freeLabel,
  percent,
  icon: Icon,
}: {
  label: string;
  sublabel: string;
  freeLabel: string;
  percent: number;
  icon: LucideIcon;
}) {
  const tone = usageTone(percent);
  const color = TONE_RING[tone as keyof typeof TONE_RING];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="node-capacity-ring">
      <div className="node-capacity-ring-chart">
        <svg viewBox="0 0 100 100" className="node-capacity-ring-svg">
          <circle cx="50" cy="50" r={radius} className="node-capacity-ring-bg" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="node-capacity-ring-progress"
            stroke={color}
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="node-capacity-ring-center">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="node-capacity-ring-percent">{percent}%</span>
        </div>
      </div>
      <div className="node-capacity-ring-meta">
        <p className="node-capacity-ring-label">{label}</p>
        <p className="node-capacity-ring-value">{sublabel}</p>
        <p className="node-capacity-ring-hint">{freeLabel}</p>
      </div>
    </div>
  );
}

function CapacityRingFallback({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="node-capacity-ring node-capacity-ring--fallback">
      <div className="node-capacity-ring-fallback-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div className="node-capacity-ring-meta">
        <p className="node-capacity-ring-label">{label}</p>
        <p className="node-capacity-ring-value">{value}</p>
        <p className="node-capacity-ring-hint">{hint}</p>
      </div>
    </div>
  );
}

function CapacityStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="node-capacity-stat">
      <Icon className="node-capacity-stat-icon" />
      <div className="min-w-0">
        <p className="node-capacity-stat-label">{label}</p>
        <p className="node-capacity-stat-value">{value}</p>
        {hint && <p className="node-capacity-stat-hint">{hint}</p>}
      </div>
    </div>
  );
}

export function FleetCapacityOverview({
  nodes,
}: {
  nodes: Array<{
    capacity?: NodeCapacityStats;
    serverCount?: number;
    _count?: { servers: number };
  }>;
}) {
  const totals = nodes.reduce(
    (acc, node) => {
      const cap = node.capacity;
      const servers = node.serverCount ?? node._count?.servers ?? 0;
      if (!cap) return { ...acc, servers: acc.servers + servers };
      return {
        servers: acc.servers + servers,
        allocatedMemory: acc.allocatedMemory + cap.allocatedMemory,
        allocatedDisk: acc.allocatedDisk + cap.allocatedDisk,
        memoryLimit: acc.memoryLimit + cap.effectiveMemoryLimit,
        diskLimit: acc.diskLimit + cap.effectiveDiskLimit,
      };
    },
    { servers: 0, allocatedMemory: 0, allocatedDisk: 0, memoryLimit: 0, diskLimit: 0 },
  );

  const memoryPercent =
    totals.memoryLimit > 0 ? Math.min(100, Math.round((totals.allocatedMemory / totals.memoryLimit) * 100)) : 0;
  const diskPercent =
    totals.diskLimit > 0 ? Math.min(100, Math.round((totals.allocatedDisk / totals.diskLimit) * 100)) : 0;

  return (
    <section className="ds-admin-fleet">
      <div className="ds-admin-fleet-head">
        <div>
          <p className="ds-admin-fleet-title">Fleet capacity</p>
          <p className="ds-admin-fleet-desc">Combined allocation across all nodes</p>
        </div>
        <span className="ds-admin-fleet-meta">{nodes.length} nodes · {totals.servers} servers</span>
      </div>
      <div className="ds-admin-fleet-bars">
        <FleetBar label="Memory" used={totals.allocatedMemory} limit={totals.memoryLimit} percent={memoryPercent} />
        <FleetBar label="Disk" used={totals.allocatedDisk} limit={totals.diskLimit} percent={diskPercent} />
      </div>
    </section>
  );
}

function FleetBar({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  const tone = usageTone(percent);
  const fillClass =
    tone === 'danger' ? 'ds-progress-fill--bad' : tone === 'warning' ? 'ds-progress-fill--warn' : 'ds-progress-fill--good';
  return (
    <div>
      <div className="ds-admin-fleet-bar-label">
        <span>{label}</span>
        <span className="tabular-nums">
          {limit > 0 ? `${formatCapacityLabel(used, limit)} · ${percent}%` : `${formatResource(used, 'MiB')} allocated`}
        </span>
      </div>
      {limit > 0 && (
        <div className="ds-progress">
          <div
            className={`ds-progress-fill ${fillClass}`}
            style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
          />
        </div>
      )}
    </div>
  );
}
