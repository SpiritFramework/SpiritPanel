import type { ReactNode } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Split console text into plain spans and clickable external links. */
export function renderConsoleText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  URL_PATTERN.lastIndex = 0;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const href = match[1].replace(/[.,;:!?)]+$/, '');
    const trailing = match[1].slice(href.length);
    parts.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="console-link"
        onClick={(e) => e.stopPropagation()}
      >
        {href}
      </a>,
    );
    if (trailing) parts.push(trailing);
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
