import { useRef } from 'react';
import { Send } from 'lucide-react';

export function ConsoleInputBar({
  command,
  onCommandChange,
  onSubmit,
  onKeyDown,
  disabled,
  placeholder,
}: {
  command: string;
  onCommandChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <form className="ds-con-compose" onSubmit={onSubmit}>
      <label className="ds-con-sr-only" htmlFor="console-command-input">
        Server command
      </label>
      <div className="ds-con-compose-inner">
        <span className="ds-con-prompt" aria-hidden>
          ❯
        </span>
        <input
          id="console-command-input"
          className="ds-con-input"
          value={command}
          onChange={(e) => onCommandChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="ds-con-send"
          disabled={disabled || !command.trim()}
          title="Send command (Enter)"
          aria-label="Send command"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

export function useCommandHistory() {
  const historyRef = useRef<string[]>([]);
  const historyCursorRef = useRef(-1);

  function pushHistory(entry: string) {
    const trimmed = entry.trim();
    if (!trimmed) return;
    const h = historyRef.current;
    if (h[h.length - 1] === trimmed) return;
    historyRef.current = [...h.slice(-49), trimmed];
    historyCursorRef.current = -1;
  }

  function resetCursor() {
    historyCursorRef.current = -1;
  }

  function navigateHistory(direction: 'up' | 'down', setCommand: (value: string) => void) {
    const h = historyRef.current;
    if (direction === 'up' && h.length > 0) {
      const next = Math.min(historyCursorRef.current + 1, h.length - 1);
      historyCursorRef.current = next;
      setCommand(h[h.length - 1 - next] ?? '');
      return true;
    }
    if (direction === 'down') {
      if (historyCursorRef.current <= 0) {
        historyCursorRef.current = -1;
        setCommand('');
        return true;
      }
      const next = historyCursorRef.current - 1;
      historyCursorRef.current = next;
      setCommand(h[h.length - 1 - next] ?? '');
      return true;
    }
    return false;
  }

  return { pushHistory, resetCursor, navigateHistory };
}
