import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Circle,
  Download,
  Eraser,
  RefreshCw,
  ScrollText,
  Send,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import type { ConsoleLine, ConsoleLineKind } from '../../lib/console-buffer';
import { CONSOLE_VISIBLE_LINES } from '../../lib/console-buffer';
import { renderConsoleText } from '../../lib/console-links';
import type { ConsoleStatusSummary } from '../../lib/server-runtime';
import { StatusPill, type Tone } from '../../components/ui';

type LineFilter = 'all' | 'output' | 'system' | 'error';

const FILTERS: { id: LineFilter; label: string; match: (kind: ConsoleLineKind) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'output', label: 'Output', match: (k) => k === 'stdout' || k === 'install' },
  { id: 'system', label: 'System', match: (k) => k === 'system' },
  { id: 'error', label: 'Errors', match: (k) => k === 'error' },
];

const LINE_KIND_CLASS: Record<ConsoleLineKind, string> = {
  stdout: 'console-line-stdout',
  install: 'console-line-install',
  system: 'console-line-system',
  error: 'console-line-error',
};

function formatLineTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const ConsoleLineRow = memo(function ConsoleLineRow({
  lineNumber,
  text,
  kind,
  at,
}: {
  lineNumber: number;
  text: string;
  kind: ConsoleLineKind;
  at: number;
}) {
  return (
    <div className="console-line-row group" data-kind={kind}>
      <span className="console-line-gutter console-line-num" aria-hidden>
        {lineNumber}
      </span>
      <time
        className="console-line-gutter console-line-time"
        dateTime={new Date(at).toISOString()}
        title={new Date(at).toLocaleString()}
      >
        {formatLineTime(at)}
      </time>
      <div className={`console-line-body whitespace-pre-wrap break-words ${LINE_KIND_CLASS[kind]}`}>
        {renderConsoleText(text)}
      </div>
    </div>
  );
});

export function ConsoleTerminal({
  serverName,
  subtitle,
  status,
  connectionStatus,
  consoleLines,
  consoleLineCount,
  truncated,
  installing,
  canCommand,
  followScroll,
  onFollowScrollChange,
  onReconnect,
  onClear,
  downloadLog,
  sendCommand,
  emptyMessage,
}: {
  serverName: string;
  subtitle?: string;
  status: ConsoleStatusSummary;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  consoleLines: ConsoleLine[];
  consoleLineCount: number;
  truncated: boolean;
  installing: boolean;
  canCommand: boolean;
  followScroll: boolean;
  onFollowScrollChange: (value: boolean) => void;
  onReconnect: () => void;
  onClear: () => void;
  downloadLog: () => void;
  sendCommand: (command: string) => void;
  emptyMessage: string;
}) {
  const [command, setCommand] = useState('');
  const [filter, setFilter] = useState<LineFilter>('all');
  const [showJump, setShowJump] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyCursorRef = useRef(-1);
  const connected = connectionStatus === 'connected';

  const lineOffset = truncated ? consoleLineCount - consoleLines.length : 0;
  const activeFilter = FILTERS.find((f) => f.id === filter)!;

  const filteredLines = useMemo(
    () => consoleLines.filter((line) => activeFilter.match(line.kind)),
    [consoleLines, activeFilter],
  );

  const scrollToLatest = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    onFollowScrollChange(true);
    setShowJump(false);
  }, [onFollowScrollChange]);

  const updateJumpVisibility = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    const atLatest = el.scrollHeight - el.scrollTop - el.clientHeight < 56;
    setShowJump(!atLatest);
    if (!atLatest && followScroll) onFollowScrollChange(false);
  }, [followScroll, onFollowScrollChange]);

  useEffect(() => {
    if (!followScroll) return;
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowJump(false);
  }, [filteredLines, followScroll]);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateJumpVisibility, { passive: true });
    return () => el.removeEventListener('scroll', updateJumpVisibility);
  }, [updateJumpVisibility]);

  function pushHistory(entry: string) {
    const trimmed = entry.trim();
    if (!trimmed) return;
    const h = historyRef.current;
    if (h[h.length - 1] === trimmed) return;
    historyRef.current = [...h.slice(-49), trimmed];
    historyCursorRef.current = -1;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || !connected || !canCommand || installing) return;
    pushHistory(command);
    sendCommand(command);
    setCommand('');
    historyCursorRef.current = -1;
    onFollowScrollChange(true);
  }

  function handleCommandKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const h = historyRef.current;
    if (e.key === 'ArrowUp' && h.length > 0) {
      e.preventDefault();
      const next = Math.min(historyCursorRef.current + 1, h.length - 1);
      historyCursorRef.current = next;
      setCommand(h[h.length - 1 - next] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursorRef.current <= 0) {
        historyCursorRef.current = -1;
        setCommand('');
        return;
      }
      const next = historyCursorRef.current - 1;
      historyCursorRef.current = next;
      setCommand(h[h.length - 1 - next] ?? '');
      return;
    }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onClear();
    }
  }

  const commandDisabled = !connected || !canCommand || installing;
  const commandPlaceholder = installing
    ? 'Commands unavailable during installation'
    : !canCommand
      ? 'Console permission required'
      : !connected
        ? 'Waiting for connection…'
        : 'Enter command…';

  return (
    <div className="console-terminal flex min-h-0 flex-1 flex-col">
      <header className="console-terminal-header">
        <div className="console-terminal-title">
          <span className="console-window-dots" aria-hidden>
            <span className="console-dot console-dot-red" />
            <span className="console-dot console-dot-amber" />
            <span className="console-dot console-dot-green" />
          </span>
          <div className="console-terminal-heading min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Terminal className="console-terminal-icon h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium">{serverName}</span>
              <span className="text-[var(--muted)]">/</span>
              <span className="shrink-0 text-[var(--muted)]">console</span>
            </div>
            {subtitle && <p className="console-terminal-sub truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="console-terminal-meta">
          <ConnectionIndicator status={status} connection={connectionStatus} />
          <span className="console-stat hidden sm:inline">
            {filteredLines.length}
            {filter !== 'all' ? ` / ${consoleLines.length}` : ''} lines
          </span>
        </div>

        <div className="console-terminal-actions">
          <ConsoleIconButton icon={RefreshCw} label="Reconnect" onClick={onReconnect} />
          <ConsoleIconButton icon={Eraser} label="Clear (Ctrl+L)" onClick={onClear} />
          <ConsoleIconButton icon={Download} label="Download log" onClick={downloadLog} />
          <ConsoleIconButton
            icon={ScrollText}
            label={followScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
            onClick={() => {
              if (followScroll) onFollowScrollChange(false);
              else scrollToLatest();
            }}
            active={followScroll}
          />
        </div>
      </header>

      <div className="console-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`console-filter-chip ${filter === f.id ? 'console-filter-chip-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="console-terminal-body">
        <div
          ref={outputRef}
          onWheel={(e) => e.stopPropagation()}
          className="console-output console-output-v2 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {truncated && filter === 'all' && (
            <div className="console-truncation-banner">
              <span className="console-line-gutter console-line-num">…</span>
              <span className="console-line-gutter console-line-time" />
              <p className="console-line-body console-line-system">
                {lineOffset} earlier line{lineOffset === 1 ? '' : 's'} hidden · download for full log
              </p>
            </div>
          )}

          {filteredLines.length === 0 ? (
            <ConsoleEmptyState
              connection={connectionStatus}
              message={
                consoleLines.length === 0
                  ? emptyMessage
                  : `No ${activeFilter.label.toLowerCase()} lines match this filter`
              }
            />
          ) : (
            filteredLines.map((line, index) => (
              <ConsoleLineRow
                key={line.id}
                lineNumber={lineOffset + index + 1}
                text={line.text}
                kind={line.kind}
                at={line.at}
              />
            ))
          )}
        </div>

        {showJump && (
          <button type="button" className="console-jump-btn" onClick={scrollToLatest}>
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </button>
        )}
      </div>

      <form className="console-command-bar" onSubmit={handleSubmit}>
        <label className="console-sr-only" htmlFor="console-command-input">
          Server command
        </label>
        <span className="console-prompt" aria-hidden>
          &gt;
        </span>
        <input
          id="console-command-input"
          className="console-command-input"
          value={command}
          onChange={(e) => {
            historyCursorRef.current = -1;
            setCommand(e.target.value);
          }}
          onKeyDown={handleCommandKeyDown}
          placeholder={commandPlaceholder}
          disabled={commandDisabled}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="console-send-btn"
          disabled={commandDisabled || !command.trim()}
          title="Send command"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <footer className="console-terminal-footer">
        <span>Enter to send</span>
        <span className="console-footer-sep" aria-hidden>
          ·
        </span>
        <span>Up/down command history</span>
        <span className="console-footer-sep hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="hidden sm:inline">Ctrl+L clear</span>
        {truncated && (
          <>
            <span className="console-footer-sep hidden md:inline" aria-hidden>
              ·
            </span>
            <span className="hidden md:inline">Showing last {CONSOLE_VISIBLE_LINES} lines</span>
          </>
        )}
      </footer>
    </div>
  );
}

function ConnectionIndicator({
  status,
  connection,
}: {
  status: ConsoleStatusSummary;
  connection: 'connecting' | 'connected' | 'disconnected';
}) {
  const tone: Tone =
    status.tone === 'muted' ? 'neutral' : status.tone === 'info' ? 'info' : status.tone;

  const dotTone =
    connection === 'connected'
      ? 'console-conn-dot-live'
      : connection === 'connecting'
        ? 'console-conn-dot-pending'
        : 'console-conn-dot-off';

  return (
    <div className="console-connection">
      <Circle className={`console-conn-dot h-2 w-2 fill-current ${dotTone}`} />
      <StatusPill label={status.label} tone={tone} pulse={status.pulse} />
      {status.hint && <span className="console-connection-hint hidden lg:inline">{status.hint}</span>}
    </div>
  );
}

function ConsoleIconButton({
  icon: BtnIcon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`console-toolbar-btn ${active ? 'console-toolbar-btn-active' : ''}`}
    >
      <BtnIcon className="h-3.5 w-3.5" />
    </button>
  );
}

function ConsoleEmptyState({
  connection,
  message,
}: {
  connection: 'connecting' | 'connected' | 'disconnected';
  message: string;
}) {
  return (
    <div className="console-empty">
      <div className="console-empty-icon-wrap">
        <Terminal className="h-6 w-6" />
        {connection === 'connecting' && <span className="console-empty-pulse" aria-hidden />}
      </div>
      <p className="console-empty-title">
        {connection === 'connecting' ? 'Connecting…' : 'No output yet'}
      </p>
      <p className="console-empty-text">{message}</p>
    </div>
  );
}
