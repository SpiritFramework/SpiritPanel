import { Cpu, HardDrive, MemoryStick, Server } from 'lucide-react';

export function SettingsStatsRow({
  memory,
  disk,
  cpu,
  eggName,
  nodeName,
}: {
  memory: number;
  disk: number;
  cpu: number;
  eggName: string;
  nodeName: string;
}) {
  return (
    <div className="ds-srv-set-stats">
      <div className="ds-srv-set-stat">
        <span className="ds-srv-set-stat-icon ds-srv-set-stat-icon--memory" aria-hidden>
          <MemoryStick className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-set-stat-value">{memory} MiB</p>
          <p className="ds-srv-set-stat-label">Memory limit</p>
        </div>
      </div>
      <div className="ds-srv-set-stat">
        <span className="ds-srv-set-stat-icon ds-srv-set-stat-icon--disk" aria-hidden>
          <HardDrive className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-set-stat-value">{disk} MiB</p>
          <p className="ds-srv-set-stat-label">Disk limit</p>
        </div>
      </div>
      <div className="ds-srv-set-stat ds-srv-set-stat--capacity">
        <span className="ds-srv-set-stat-icon ds-srv-set-stat-icon--cpu" aria-hidden>
          <Cpu className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-set-capacity-bar-wrap">
            <div className="ds-srv-set-capacity-bar">
              <div className="ds-srv-set-capacity-fill" style={{ width: `${Math.min(100, cpu)}%` }} />
            </div>
            <span className="ds-srv-set-capacity-label">{cpu}%</span>
          </div>
          <p className="ds-srv-set-stat-label">CPU limit</p>
        </div>
      </div>
      <div className="ds-srv-set-stat">
        <span className="ds-srv-set-stat-icon ds-srv-set-stat-icon--meta" aria-hidden>
          <Server className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-set-stat-value truncate">{eggName}</p>
          <p className="ds-srv-set-stat-label truncate">{nodeName}</p>
        </div>
      </div>
    </div>
  );
}
