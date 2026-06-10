import type { StatPoint } from '../lib/api';
import { formatBytes, percentOf } from '../lib/stats';
import { isServerRunning, formatRuntimeStateLabel } from '../lib/ws-stats';

export type NodeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface LiveUsageStripProps {
  stats: StatPoint;
  limits: { memory: number; disk: number; cpu: number };
  connectionStatus: NodeConnectionStatus;
  /** When true, only show live resource meters (status lives in the page header). */
  metricsOnly?: boolean;
}

export function LiveUsageStrip({ stats, limits, connectionStatus, metricsOnly = false }: LiveUsageStripProps) {
  const online = connectionStatus === 'connected' && isServerRunning(stats.state);
  const memoryLimit = limits.memory * 1024 * 1024;
  const diskLimit = limits.disk * 1024 * 1024;

  const statusLabel =
    connectionStatus === 'connecting'
      ? 'Connecting to node'
      : connectionStatus === 'disconnected'
        ? 'Node offline'
        : formatRuntimeStateLabel(stats.state);

  const statusColor =
    online
      ? 'var(--success-fg)'
      : connectionStatus === 'connecting' || stats.state === 'starting' || stats.state === 'stopping'
        ? 'var(--warning-fg)'
        : stats.state === 'crashed'
          ? 'var(--danger-fg)'
          : 'var(--muted)';

  const dotPulse =
    online ? 'status-pulse' : connectionStatus === 'connecting' ? 'animate-pulse' : '';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
      {!metricsOnly && (
        <>
          <span className="inline-flex items-center gap-1.5 font-medium capitalize" style={{ color: statusColor }}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotPulse}`} style={{ background: statusColor }} />
            {statusLabel}
          </span>
          <span className="hidden h-3 w-px bg-[var(--border)] sm:block" />
        </>
      )}

      {online ? (
        <>
          <MiniMeter label="CPU" value={`${stats.cpu.toFixed(1)}%`} pct={percentOf(stats.cpu, limits.cpu)} color="#818cf8" />
          <MiniMeter
            label="RAM"
            value={formatBytes(stats.memoryBytes)}
            pct={percentOf(stats.memoryBytes, memoryLimit)}
            color="#34d399"
          />
          <MiniMeter
            label="Disk"
            value={formatBytes(stats.diskBytes)}
            pct={percentOf(stats.diskBytes, diskLimit)}
            color="#fbbf24"
          />
          <span className="hidden font-mono text-[var(--muted)] sm:inline">
            ↓{formatBytes(stats.networkRxBytes)} ↑{formatBytes(stats.networkTxBytes)}
          </span>
        </>
      ) : (
        <span className="text-[var(--muted)]">
          {connectionStatus === 'disconnected'
            ? 'Live stats unavailable — reconnect from the console toolbar'
            : stats.state === 'starting' || stats.state === 'stopping'
              ? 'Container is starting up…'
              : 'Start the server for live resource usage'}
        </span>
      )}
    </div>
  );
}

function MiniMeter({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <span className="inline-flex min-w-[4.5rem] items-center gap-1.5">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="w-12 overflow-hidden rounded-full bg-[var(--border)]">
        <span
          className="block h-1 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </span>
      <span className="font-mono font-medium">{value}</span>
    </span>
  );
}
