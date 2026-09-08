import { memo } from 'react';
import type { ConsoleLineKind } from '../../lib/console-buffer';
import { renderConsoleText } from '../../lib/console-links';
import { LINE_KIND_CLASS } from './console-types';

function formatLineTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export const ConsoleLineRow = memo(function ConsoleLineRow({
  text,
  kind,
  at,
}: {
  lineNumber?: number;
  text: string;
  kind: ConsoleLineKind;
  at: number;
}) {
  return (
    <div className="ds-con-line group" data-kind={kind}>
      <time
        className="ds-con-line-time"
        dateTime={new Date(at).toISOString()}
        title={new Date(at).toLocaleString()}
      >
        {formatLineTime(at)}
      </time>
      <div className={`ds-con-line-body whitespace-pre-wrap break-words ${LINE_KIND_CLASS[kind]}`}>
        {renderConsoleText(text)}
      </div>
    </div>
  );
});
