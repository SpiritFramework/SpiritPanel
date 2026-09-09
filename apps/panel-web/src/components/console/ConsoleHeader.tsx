import {
  Download,
  Eraser,
  RefreshCw,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { StatusPill } from '../ui';
import { ServerEggIcon } from '../ServerEggIcon';
import type { ConsoleStatusSummary } from '../../lib/server-runtime';
import type { StatPoint } from '../../lib/api';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';
import { isServerRunning } from '../../lib/ws-stats';
import { ConsoleMetricsStrip } from './ConsoleMetricsStrip';

export function ConsoleHeader({
  serverName,
  eggName,
  eggLogoUrl,
  subtitle,
  status,
  connectionStatus,
  followScroll,
  liveStats,
  limits,
  onReconnect,
  onClear,
  onDownload,
  onToggleFollow,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  subtitle?: string;
  status: ConsoleStatusSummary;
  connectionStatus: NodeConnectionStatus;
  followScroll: boolean;
  liveStats: StatPoint;
  limits: { memory: number; disk: number; cpu: number };
  onReconnect: () => void;
  onClear: () => void;
  onDownload: () => void;
  onToggleFollow: () => void;
}) {
  const connecting = connectionStatus === 'connecting';
  const connected = connectionStatus === 'connected';
  const tone = connecting ? 'info' : status.tone === 'muted' ? 'neutral' : status.tone;
  const accentTone = connecting ? 'info' : status.tone;
  const statusLabel = connecting ? 'Connecting…' : status.label;
  const showLiveMetrics = connected && isServerRunning(liveStats.state);

  return (
    <div className={`ds-con-toolbar ds-con-toolbar--${accentTone}`}>
      <div className="ds-con-toolbar-row">
        <div className="ds-con-toolbar-identity">
          <div className={`ds-con-toolbar-mark ds-con-toolbar-mark--${accentTone}`} aria-hidden>
            <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-4 w-4" iconClassName="h-4 w-4 text-white/90" />
          </div>
          <div className="ds-con-toolbar-copy min-w-0">
            <div className="ds-con-toolbar-title-row">
              <span className="ds-con-toolbar-label">Console</span>
              <span className="ds-con-toolbar-server truncate" title={serverName}>
                {serverName}
              </span>
              <StatusPill
                label={statusLabel}
                tone={tone}
                pulse={connecting || Boolean(status.pulse && connected)}
                compact
              />
            </div>
            {subtitle ? <p className="ds-con-toolbar-meta truncate">{subtitle}</p> : null}
          </div>
        </div>

        {showLiveMetrics ? (
          <div className="ds-con-toolbar-metrics" role="list" aria-label="Live resource usage">
            <ConsoleMetricsStrip stats={liveStats} limits={limits} connectionStatus={connectionStatus} />
          </div>
        ) : null}

        <div className="ds-con-toolbar-actions" role="toolbar" aria-label="Console actions">
          <ConsoleActionBtn icon={RefreshCw} label="Reconnect" onClick={onReconnect} priority />
          <ConsoleActionBtn icon={Eraser} label="Clear (Ctrl+L)" onClick={onClear} />
          <ConsoleActionBtn icon={Download} label="Download log" onClick={onDownload} />
          <ConsoleActionBtn
            icon={ScrollText}
            label={followScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
            onClick={onToggleFollow}
            active={followScroll}
          />
        </div>
      </div>
    </div>
  );
}

function ConsoleActionBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  priority,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`ds-con-action-btn${active ? ' ds-con-action-btn--active' : ''}${priority ? ' ds-con-action-btn--priority' : ' ds-con-action-btn--secondary'}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
