import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import { formatBytes, percentOf } from '../../../lib/stats';
import { formatResource } from '../../../lib/server-theme';
import { usageTone } from '../../../lib/node-capacity';
import type { StatPoint } from '../../../lib/api';

export function AnalyticsLiveStrip({
  current,
  limits,
  memoryLimitBytes,
  diskLimitBytes,
}: {
  current: StatPoint | null;
  limits: { memory: number; disk: number; cpu: number };
  memoryLimitBytes: number;
  diskLimitBytes: number;
}) {
  const cpuPct = limits.cpu > 0 ? percentOf(current?.cpu ?? 0, limits.cpu) : current?.cpu ?? 0;
  const ramPct = memoryLimitBytes > 0 ? percentOf(current?.memoryBytes ?? 0, memoryLimitBytes) : 0;
  const diskPct = diskLimitBytes > 0 ? percentOf(current?.diskBytes ?? 0, diskLimitBytes) : 0;

  const tiles: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    sub: string;
    pct: number;
    tone: 'cpu' | 'ram' | 'disk' | 'net';
    status?: 'success' | 'warning' | 'danger';
  }> = [
    {
      icon: Cpu,
      label: 'CPU',
      value: `${(current?.cpu ?? 0).toFixed(1)}%`,
      sub: limits.cpu > 0 ? `${limits.cpu}% limit` : 'Unlimited',
      pct: limits.cpu > 0 ? cpuPct : Math.min(100, current?.cpu ?? 0),
      tone: 'cpu',
      status: limits.cpu > 0 ? usageTone(cpuPct) : undefined,
    },
    {
      icon: MemoryStick,
      label: 'Memory',
      value: formatBytes(current?.memoryBytes ?? 0),
      sub: memoryLimitBytes > 0 ? `${formatResource(limits.memory, 'MiB')} limit` : 'Unlimited',
      pct: ramPct,
      tone: 'ram',
      status: memoryLimitBytes > 0 ? usageTone(ramPct) : undefined,
    },
    {
      icon: HardDrive,
      label: 'Disk',
      value: formatBytes(current?.diskBytes ?? 0),
      sub: diskLimitBytes > 0 ? `${formatResource(limits.disk, 'MiB')} · files + backups` : 'Unlimited',
      pct: diskPct,
      tone: 'disk',
      status: diskLimitBytes > 0 ? usageTone(diskPct) : undefined,
    },
    {
      icon: Network,
      label: 'Network',
      value: formatBytes(current?.networkRxBytes ?? 0),
      sub: `↑ ${formatBytes(current?.networkTxBytes ?? 0)} total`,
      pct: 0,
      tone: 'net',
    },
  ];

  return (
    <div className="ds-srv-an-live-strip" role="list" aria-label="Current resource usage">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`ds-srv-an-live-tile ds-srv-an-live-tile--${tile.tone}${tile.status ? ` ds-srv-an-live-tile--${tile.status}` : ''}`}
          role="listitem"
        >
          <span className={`ds-srv-an-live-tile-icon ds-srv-an-live-tile-icon--${tile.tone}`} aria-hidden>
            <tile.icon className="h-3.5 w-3.5" />
          </span>
          <span className="ds-srv-an-live-tile-copy">
            <span className="ds-srv-an-live-tile-label">{tile.label}</span>
            <span className="ds-srv-an-live-tile-value">{tile.value}</span>
            <span className="ds-srv-an-live-tile-sub">{tile.sub}</span>
          </span>
          {tile.tone === 'net' ? (
            <span className="ds-srv-an-live-net" aria-hidden>
              <ArrowDown className="h-3 w-3 text-sky-400" />
              <ArrowUp className="h-3 w-3 text-violet-400" />
            </span>
          ) : (
            <span className="ds-srv-an-live-tile-bar" aria-hidden>
              <span className="ds-srv-an-live-tile-fill" style={{ width: `${Math.min(100, tile.pct)}%` }} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
