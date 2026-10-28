import { useEffect, useRef, useState } from 'react';
import type { ConsoleLine } from '../../lib/console-buffer';
import type { StatPoint } from '../../lib/api';
import type { ConsoleStatusSummary } from '../../lib/server-runtime';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleInputBar, useCommandHistory } from './ConsoleInputBar';
import { ConsoleOutputPane, useConsoleScroll } from './ConsoleOutputPane';
import { applyConsoleSuggestion, type ConsoleSuggestResponse } from '../../lib/console-suggest';

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
  suggestCommand,
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
  suggestCommand?: (line: string, cursor: number) => Promise<ConsoleSuggestResponse | null>;
  emptyMessage: string;
  liveStats: StatPoint;
  limits: { memory: number; disk: number; cpu: number };
}) {
  const [command, setCommand] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const suggestSession = useRef<{
    original: string;
    start: number;
    end: number;
    suggestions: string[];
    index: number;
  } | null>(null);
  const { pushHistory, resetCursor, navigateHistory } = useCommandHistory();
  const { outputRef, showJump, scrollToLatest, updateJumpVisibility, markUserScrollIntent } =
    useConsoleScroll({
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
        : 'Enter command…  Tab completes';

  useEffect(() => {
    if (caretRef.current == null || !inputRef.current) return;
    const pos = caretRef.current;
    caretRef.current = null;
    inputRef.current.setSelectionRange(pos, pos);
  }, [command]);

  function applySuggestion(index: number) {
    const session = suggestSession.current;
    if (!session || session.suggestions.length === 0) return;
    const nextIndex = ((index % session.suggestions.length) + session.suggestions.length) % session.suggestions.length;
    const applied = applyConsoleSuggestion(
      session.original,
      session.start,
      session.end,
      session.suggestions[nextIndex] ?? '',
    );
    session.index = nextIndex;
    caretRef.current = applied.cursor;
    setActiveSuggestion(nextIndex);
    setSuggestions(session.suggestions);
    setCommand(applied.line);
  }

  async function completeCommand(shift: boolean) {
    const session = suggestSession.current;
    if (session && session.suggestions.length > 0) {
      const current = applyConsoleSuggestion(
        session.original,
        session.start,
        session.end,
        session.suggestions[session.index] ?? '',
      ).line;
      if (current === command) {
        applySuggestion(session.index + (shift ? -1 : 1));
        return;
      }
    }

    const cursor = inputRef.current?.selectionStart ?? command.length;
    const requested = command;
    const response = await suggestCommand?.(requested, cursor);
    const latest = inputRef.current?.value ?? requested;
    if (!response || response.line !== requested || latest !== requested || response.suggestions.length === 0) {
      suggestSession.current = null;
      setSuggestions([]);
      return;
    }
    suggestSession.current = {
      original: command,
      start: response.start,
      end: response.end,
      suggestions: response.suggestions,
      index: 0,
    };
    applySuggestion(0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || commandDisabled) return;
    pushHistory(command);
    sendCommand(command);
    setCommand('');
    setSuggestions([]);
    suggestSession.current = null;
    resetCursor();
    onFollowScrollChange(true);
  }

  function handleCommandKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab' && !commandDisabled && suggestCommand) {
      e.preventDefault();
      void completeCommand(e.shiftKey);
      return;
    }
    if (e.key === 'Escape' && suggestions.length > 0) {
      setSuggestions([]);
      suggestSession.current = null;
      return;
    }
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
          if (followScroll) {
            onFollowScrollChange(false);
            return;
          }
          scrollToLatest();
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
        onUserScrollIntent={markUserScrollIntent}
        onJumpToLatest={scrollToLatest}
      />

      <ConsoleInputBar
        command={command}
        onCommandChange={(value) => {
          resetCursor();
          suggestSession.current = null;
          setSuggestions([]);
          setCommand(value);
        }}
        onSubmit={handleSubmit}
        onKeyDown={handleCommandKeyDown}
        disabled={commandDisabled}
        placeholder={commandPlaceholder}
        inputRef={inputRef}
        suggestions={suggestions}
        activeSuggestion={activeSuggestion}
        onPickSuggestion={applySuggestion}
      />
    </div>
  );
}
