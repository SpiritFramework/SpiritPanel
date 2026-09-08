import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Terminal } from 'lucide-react';
import type { ConsoleLine } from '../../lib/console-buffer';
import { ConsoleLineRow } from './ConsoleLineRow';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';

export function ConsoleOutputPane({
  outputRef,
  consoleLines,
  followScroll,
  showJump,
  connectionStatus,
  emptyMessage,
  onScroll,
  onJumpToLatest,
}: {
  outputRef: React.RefObject<HTMLDivElement | null>;
  consoleLines: ConsoleLine[];
  followScroll: boolean;
  showJump: boolean;
  connectionStatus: NodeConnectionStatus;
  emptyMessage: string;
  onScroll: () => void;
  onJumpToLatest: () => void;
}) {
  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll, outputRef]);

  useEffect(() => {
    if (!followScroll) return;
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [consoleLines, followScroll, outputRef]);

  return (
    <div className="ds-con-viewport-wrap">
      <div
        ref={outputRef}
        onWheel={(e) => e.stopPropagation()}
        className="ds-con-viewport"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {consoleLines.length === 0 ? (
          <ConsoleEmptyState connection={connectionStatus} message={emptyMessage} />
        ) : (
          consoleLines.map((line) => (
            <ConsoleLineRow key={line.id} text={line.text} kind={line.kind} at={line.at} />
          ))
        )}
      </div>

      {showJump ? (
        <button type="button" className="ds-con-jump" onClick={onJumpToLatest}>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}

function ConsoleEmptyState({
  connection,
  message,
}: {
  connection: NodeConnectionStatus;
  message: string;
}) {
  return (
    <div className="ds-con-empty">
      <div className={`ds-con-empty-icon${connection === 'connecting' ? ' is-connecting' : ''}`} aria-hidden>
        <Terminal className="h-5 w-5" />
      </div>
      <p className="ds-con-empty-title">{connection === 'connecting' ? 'Connecting…' : 'No output yet'}</p>
      <p className="ds-con-empty-text">{message}</p>
    </div>
  );
}

export function useConsoleScroll({
  followScroll,
  onFollowScrollChange,
}: {
  followScroll: boolean;
  onFollowScrollChange: (value: boolean) => void;
}) {
  const outputRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

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

  return {
    outputRef,
    showJump,
    scrollToLatest,
    updateJumpVisibility,
  };
}
