import { Cpu, HardDrive, MemoryStick, Network, type LucideIcon } from 'lucide-react';
import type { StatPoint } from '../../lib/api';
import { formatBytes, percentOf } from '../../lib/stats';
import { isServerRunning } from '../../lib/ws-stats';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';

export function ConsoleMetricsStrip({
  stats,
  limits,
  connectionStatus,
}: {
  stats: StatPoint;
  limits: { memory: number; disk: number; cpu: number };
  connectionStatus: NodeConnectionStatus;
}) {
  const online = connectionStatus === 'connected' && isServerRunning(stats.state);
  const memoryLimit = limits.memory * 1024 * 1024;
  const diskLimit = limits.disk * 1024 * 1024;

  if (!online) return null;

  return (
    <div className="ds-con-metrics" role="list" aria-label="Live resource usage">
      <ResourcePill
        icon={Cpu}
        label="CPU"
        value={`${stats.cpu.toFixed(1)}%`}
        pct={limits.cpu > 0 ? percentOf(stats.cpu, limits.cpu) : Math.min(100, stats.cpu)}
        tone="cpu"
      />
      <ResourcePill
        icon={MemoryStick}
        label="RAM"
        value={formatBytes(stats.memoryBytes)}
        pct={memoryLimit > 0 ? percentOf(stats.memoryBytes, memoryLimit) : 0}
        tone="ram"
      />
      <ResourcePill
        icon={HardDrive}
        label="Disk"
        value={formatBytes(stats.diskBytes)}
        pct={diskLimit > 0 ? percentOf(stats.diskBytes, diskLimit) : 0}
        tone="disk"
      />
      <ResourcePill
        icon={Network}
        label="Net"
        value={`${formatBytes(stats.networkRxBytes)}↓ ${formatBytes(stats.networkTxBytes)}↑`}
        title={`↓ ${formatBytes(stats.networkRxBytes)} · ↑ ${formatBytes(stats.networkTxBytes)}`}
        pct={0}
        tone="net"
      />
    </div>
  );
}

function ResourcePill({
  icon: Icon,
  label,
  value,
  pct,
  tone,
  title,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  pct: number;
  tone: 'cpu' | 'ram' | 'disk' | 'net';
  title?: string;
}) {
  const fill =
    tone === 'cpu' ? '#818cf8' : tone === 'ram' ? '#34d399' : tone === 'disk' ? '#fbbf24' : '#38bdf8';

  return (
    <div className={`ds-con-metric-pill ds-con-metric-pill--${tone}`} role="listitem" title={title}>
      <span className={`ds-con-metric-pill-icon ds-con-metric-pill-icon--${tone}`} aria-hidden>
        <Icon className="h-3 w-3" />
      </span>
      <span className="ds-con-metric-pill-label">{label}</span>
      <span className="ds-con-metric-pill-bar" aria-hidden>
        <span className="ds-con-metric-pill-fill" style={{ width: `${Math.min(100, pct)}%`, background: fill }} />
      </span>
      <span className="ds-con-metric-pill-value">{value}</span>
    </div>
  );
}
