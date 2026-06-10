import { memo, useEffect, useRef, useState } from 'react';
import { Download, Eraser, RefreshCw, ScrollText, Send } from 'lucide-react';
import { useAdminSupport } from '../../context/AdminSupportContext';
import { useServer } from '../../context/ServerContext';
import { useServerLive } from '../../context/ServerLiveContext';
import { getServerAccess } from '../../lib/server-access';
import { renderConsoleText } from '../../lib/console-links';
import { getConsoleStatusSummary } from '../../lib/server-runtime';
import { Button } from '../../components/Layout';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { ServerPage, ServerPageHeader, ServerToolbarButton } from '../../components/server/ServerPage';
import { StatusPill, type Tone } from '../../components/ui';
import { CONSOLE_VISIBLE_LINES, type ConsoleLineKind } from '../../lib/console-buffer';

const LINE_STYLES: Record<ConsoleLineKind, string> = {
  stdout: 'console-line-stdout',
  install: 'console-line-install',
  system: 'console-line-system',
  error: 'console-line-error',
};

const ConsoleLineRow = memo(function ConsoleLineRow({
  text,
  kind,
}: {
  text: string;
  kind: ConsoleLineKind;
}) {
  return (
    <div className={`console-line whitespace-pre-wrap break-words ${LINE_STYLES[kind]}`}>
      {renderConsoleText(text)}
    </div>
  );
});

export function ServerConsolePage() {
  const { server } = useServer();
  const adminSupport = useAdminSupport();
  const access = getServerAccess(server);
  const {
    connectionStatus,
    runtimeState,
    installPhase,
    consoleLines,
    consoleLineCount,
    followScroll,
    setFollowScroll,
    clearConsole,
    downloadConsole,
    sendCommand,
    reconnect,
  } = useServerLive();

  const [command, setCommand] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const connected = connectionStatus === 'connected';
  const truncated = consoleLineCount > CONSOLE_VISIBLE_LINES;

  const status = getConsoleStatusSummary(server, connectionStatus, runtimeState);
  const installing =
    installPhase === 'installing' ||
    server.installStatus === 'installing' ||
    server.status === 'installing';

  useEffect(() => {
    if (!followScroll) return;
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [consoleLines, followScroll]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    sendCommand(command);
    setCommand('');
  }

  return (
    <ServerPage fullHeight className="gap-3">
      <PanelAnnouncementBanner location="console" />

      <ServerPageHeader
        title="Console"
        description={
          adminSupport
            ? `${adminSupport.owner.username}'s server · ${adminSupport.serverName}`
            : installing
              ? 'Installation in progress — output appears below as the egg script runs'
              : truncated
                ? `Showing last ${CONSOLE_VISIBLE_LINES} lines · download for full log`
                : 'Live server output · history restored when you reconnect'
        }
        actions={<ConsoleStatusBadge status={status} />}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <ServerToolbarButton icon={RefreshCw} label="Reconnect" onClick={reconnect} />
        <ServerToolbarButton icon={Eraser} label="Clear" onClick={clearConsole} />
        <ServerToolbarButton icon={Download} label="Download" onClick={downloadConsole} />
        <ServerToolbarButton
          icon={ScrollText}
          label={followScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          onClick={() => setFollowScroll(!followScroll)}
          active={followScroll}
        />
      </div>

      <div
        ref={outputRef}
        onWheel={(e) => e.stopPropagation()}
        className="server-panel console-output min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] p-4 shadow-inner"
      >
        {consoleLines.length === 0 ? (
          <span className="text-[var(--muted)]">
            {connectionStatus === 'connecting'
              ? 'Connecting to daemon and loading recent logs…'
              : installing
                ? 'Waiting for install output…'
                : 'No output yet. Start the server to see logs here.'}
          </span>
        ) : (
          <>
            {truncated && (
              <div className="mb-2 border-b border-[var(--border)]/40 pb-2 text-[10px] text-[var(--muted)]">
                {consoleLineCount - CONSOLE_VISIBLE_LINES} earlier line
                {consoleLineCount - CONSOLE_VISIBLE_LINES === 1 ? '' : 's'} hidden · use Download for the full log
              </div>
            )}
            {consoleLines.map((line) => (
              <ConsoleLineRow key={line.id} text={line.text} kind={line.kind} />
            ))}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--muted)]">&gt;</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 pl-8 pr-3 font-mono text-sm outline-none accent-border focus:ring-1 focus:ring-[var(--accent-muted)] disabled:opacity-50"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              installing
                ? 'Commands unavailable while installing'
                : access.canConsole
                  ? 'Type a command and press Enter…'
                  : 'You do not have console permission'
            }
            disabled={!connected || !access.canConsole || installing}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" disabled={!connected || !command.trim() || !access.canConsole || installing}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </ServerPage>
  );
}

function ConsoleStatusBadge({
  status,
}: {
  status: ReturnType<typeof getConsoleStatusSummary>;
}) {
  const tone: Tone =
    status.tone === 'muted' ? 'neutral' : status.tone === 'info' ? 'info' : status.tone;

  return (
    <div className="flex flex-col items-end gap-1">
      <StatusPill label={status.label} tone={tone} pulse={status.pulse} />
      {status.hint && (
        <span className="max-w-[12rem] truncate text-right text-[10px] text-[var(--muted)]">{status.hint}</span>
      )}
    </div>
  );
}
