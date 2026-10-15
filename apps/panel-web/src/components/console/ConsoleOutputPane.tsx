import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Terminal } from 'lucide-react';
import type { ConsoleLine } from '../../lib/console-buffer';
import { ConsoleLineRow } from './ConsoleLineRow';
import type { NodeConnectionStatus } from '../../context/ServerLiveContext';

const NEAR_BOTTOM_PX = 56;

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
}

export function ConsoleOutputPane({
  outputRef,
  consoleLines,
  followScroll,
  showJump,
  connectionStatus,
  emptyMessage,
  onScroll,
  onUserScrollIntent,
  onJumpToLatest,
}: {
  outputRef: React.RefObject<HTMLDivElement | null>;
  consoleLines: ConsoleLine[];
  followScroll: boolean;
  showJump: boolean;
  connectionStatus: NodeConnectionStatus;
  emptyMessage: string;
  onScroll: () => void;
  onUserScrollIntent: () => void;
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
        onWheel={(e) => {
          e.stopPropagation();
          onUserScrollIntent();
        }}
        onTouchMove={onUserScrollIntent}
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
  const userScrollIntentRef = useRef(false);
  const programmaticScrollRef = useRef(false);

  const markUserScrollIntent = useCallback(() => {
    userScrollIntentRef.current = true;
  }, []);

  const scrollToLatest = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    userScrollIntentRef.current = false;
    el.scrollTop = el.scrollHeight;
    onFollowScrollChange(true);
    setShowJump(false);
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [onFollowScrollChange]);

  const updateJumpVisibility = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    const atLatest = isNearBottom(el);
    setShowJump(!atLatest);

    if (programmaticScrollRef.current) return;

    // Only detach auto-scroll when the user scrolled away from the bottom
    if (!atLatest && followScroll && userScrollIntentRef.current) {
      onFollowScrollChange(false);
      userScrollIntentRef.current = false;
      return;
    }

    if (atLatest) {
      userScrollIntentRef.current = false;
    }
  }, [followScroll, onFollowScrollChange]);

  return {
    outputRef,
    showJump,
    scrollToLatest,
    updateJumpVisibility,
    markUserScrollIntent,
  };
}
