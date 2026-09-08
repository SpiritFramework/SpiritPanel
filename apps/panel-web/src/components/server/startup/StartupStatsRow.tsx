import { Braces, Cpu, HardDrive, MemoryStick, Variable } from 'lucide-react';

export function StartupStatsRow({
  variableCount,
  editableCount,
  placeholderCount,
  memory,
  disk,
  cpu,
}: {
  variableCount: number;
  editableCount: number;
  placeholderCount: number;
  memory: number;
  disk: number;
  cpu: number;
}) {
  return (
    <div className="ds-srv-stu-stats">
      <div className="ds-srv-stu-stat">
        <span className="ds-srv-stu-stat-icon ds-srv-stu-stat-icon--vars" aria-hidden>
          <Variable className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-stu-stat-value">{variableCount}</p>
          <p className="ds-srv-stu-stat-label">Variables</p>
        </div>
      </div>
      <div className="ds-srv-stu-stat">
        <span className="ds-srv-stu-stat-icon ds-srv-stu-stat-icon--editable" aria-hidden>
          <Braces className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-stu-stat-value">{editableCount}</p>
          <p className="ds-srv-stu-stat-label">Editable</p>
        </div>
      </div>
      <div className="ds-srv-stu-stat">
        <span className="ds-srv-stu-stat-icon ds-srv-stu-stat-icon--memory" aria-hidden>
          <MemoryStick className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-stu-stat-value">{memory} MiB</p>
          <p className="ds-srv-stu-stat-label">Memory · {disk} MiB disk</p>
        </div>
      </div>
      <div className="ds-srv-stu-stat ds-srv-stu-stat--capacity">
        <span className="ds-srv-stu-stat-icon ds-srv-stu-stat-icon--cpu" aria-hidden>
          <Cpu className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="ds-srv-stu-capacity-bar-wrap">
            <div className="ds-srv-stu-capacity-bar">
              <div className="ds-srv-stu-capacity-fill" style={{ width: `${Math.min(100, cpu)}%` }} />
            </div>
            <span className="ds-srv-stu-capacity-label">{cpu}%</span>
          </div>
          <p className="ds-srv-stu-stat-label">
            CPU limit · {placeholderCount} placeholder{placeholderCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </div>
  );
}
