import { useState } from 'react';
import type { ConsoleLine } from '../../lib/console-buffer';
import type { StatPoint } from '../../lib/api';
import type { ConsoleStatusSummary } from '../../lib/server-runtime';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleInputBar, useCommandHistory } from './ConsoleInputBar';
import { ConsoleOutputPane, useConsoleScroll } from './ConsoleOutputPane';

export function ConsoleTerminal({
  serverName,
  eggName,
  eggLogoUrl,
  subtitle,
  status,
  connectionStatus,
  consoleLines,
  installing,
  canCommand,
  followScroll,
  onFollowScrollChange,
  onReconnect,
  onClear,
  downloadLog,
  sendCommand,
  emptyMessage,
  liveStats,
  limits,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  subtitle?: string;
  status: ConsoleStatusSummary;
  connectionStatus: NodeConnectionStatus;
  consoleLines: ConsoleLine[];
  installing: boolean;
  canCommand: boolean;
  followScroll: boolean;
  onFollowScrollChange: (value: boolean) => void;
  onReconnect: () => void;
  onClear: () => void;
  downloadLog: () => void;
  sendCommand: (command: string) => void;
  emptyMessage: string;
  liveStats: StatPoint;
  limits: { memory: number; disk: number; cpu: number };
}) {
  const [command, setCommand] = useState('');
  const { pushHistory, resetCursor, navigateHistory } = useCommandHistory();
  const { outputRef, showJump, scrollToLatest, updateJumpVisibility } = useConsoleScroll({
    followScroll,
    onFollowScrollChange,
  });

  const connected = connectionStatus === 'connected';

  const commandDisabled = !connected || !canCommand || installing;
  const commandPlaceholder = installing
    ? 'Commands unavailable during installation'
    : !canCommand
      ? 'Console permission required'
      : !connected
        ? 'Waiting for connection…'
        : 'Enter command…';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || commandDisabled) return;
    pushHistory(command);
    sendCommand(command);
    setCommand('');
    resetCursor();
    onFollowScrollChange(true);
  }

  function handleCommandKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      if (navigateHistory('up', setCommand)) e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      if (navigateHistory('down', setCommand)) e.preventDefault();
      return;
    }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onClear();
    }
  }

  return (
    <div className="ds-con-shell flex min-h-0 flex-1 flex-col">
      <ConsoleHeader
        serverName={serverName}
        eggName={eggName}
        eggLogoUrl={eggLogoUrl}
        subtitle={subtitle}
        status={status}
        connectionStatus={connectionStatus}
        followScroll={followScroll}
        liveStats={liveStats}
        limits={limits}
        onReconnect={onReconnect}
        onClear={onClear}
        onDownload={downloadLog}
        onToggleFollow={() => {
          if (followScroll) onFollowScrollChange(false);
          else scrollToLatest();
        }}
      />

      <ConsoleOutputPane
        outputRef={outputRef}
        consoleLines={consoleLines}
        followScroll={followScroll}
        showJump={showJump}
        connectionStatus={connectionStatus}
        emptyMessage={emptyMessage}
        onScroll={updateJumpVisibility}
        onJumpToLatest={scrollToLatest}
      />

      <ConsoleInputBar
        command={command}
        onCommandChange={(value) => {
          resetCursor();
          setCommand(value);
        }}
        onSubmit={handleSubmit}
        onKeyDown={handleCommandKeyDown}
        disabled={commandDisabled}
        placeholder={commandPlaceholder}
      />
    </div>
  );
}
