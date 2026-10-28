import { RotateCcw } from 'lucide-react';

export function StartupRecoveryPanel({
  crashDetectionEnabled,
  autoStartEnabled,
  canUpdate,
  onCrashDetectionChange,
  onAutoStartChange,
}: {
  crashDetectionEnabled: boolean;
  autoStartEnabled: boolean;
  canUpdate: boolean;
  onCrashDetectionChange: (value: boolean) => void;
  onAutoStartChange: (value: boolean) => void;
}) {
  return (
    <section className="ds-srv-stu-recovery">
      <div className="ds-srv-stu-command-header">
        <RotateCcw className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-stu-command-title">Recovery</h3>
          <p className="ds-srv-stu-command-meta">
            Used by FeatherWings 1.4.3 when the node reconnects or the process crashes
          </p>
        </div>
      </div>
      <div className="ds-srv-stu-recovery-body">
        <button
          type="button"
          className="ds-srv-stu-recovery-row"
          disabled={!canUpdate}
          onClick={() => onAutoStartChange(!autoStartEnabled)}
        >
          <span>
            <span className="ds-srv-stu-recovery-label">Start after node reconnect</span>
            <span className="ds-srv-stu-recovery-hint">
              If this server was running, bring it back when FeatherWings starts. A manual Stop or Kill skips the next restore.
            </span>
          </span>
          <span className={`ds-nd-st-toggle${autoStartEnabled ? ' ds-nd-st-toggle--on' : ''}`} aria-hidden>
            <span className="ds-nd-st-toggle-knob" />
          </span>
        </button>
        <button
          type="button"
          className="ds-srv-stu-recovery-row"
          disabled={!canUpdate}
          onClick={() => onCrashDetectionChange(!crashDetectionEnabled)}
        >
          <span>
            <span className="ds-srv-stu-recovery-label">Restart after a crash</span>
            <span className="ds-srv-stu-recovery-hint">
              FeatherWings restarts this server if it stops unexpectedly. The node can still turn crash detection off for every server.
            </span>
          </span>
          <span
            className={`ds-nd-st-toggle${crashDetectionEnabled ? ' ds-nd-st-toggle--on' : ''}`}
            aria-hidden
          >
            <span className="ds-nd-st-toggle-knob" />
          </span>
        </button>
      </div>
    </section>
  );
}
