import type { CSSProperties, ReactNode } from 'react';
import { parseAnsi, type AnsiStyle } from './ansi';
import { sanitizeLinkHref } from './safe-url';

const URL_PATTERN = /(https?:\/\/[^\s<>"')\]]+)/g;

function styleToCss(style: AnsiStyle): CSSProperties | undefined {
  if (
    !style.color &&
    !style.backgroundColor &&
    !style.bold &&
    !style.dim &&
    !style.underline &&
    !style.italic
  ) {
    return undefined;
  }
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontWeight: style.bold ? 600 : undefined,
    opacity: style.dim ? 0.72 : undefined,
    textDecoration: style.underline ? 'underline' : undefined,
    fontStyle: style.italic ? 'italic' : undefined,
  };
}

/** Split plain text into plain spans and clickable external links. */
function renderLinkedText(text: string, keyPrefix: string): ReactNode[] {
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
    const safeHref = sanitizeLinkHref(href);
    const trailing = match[1].slice(href.length);
    if (safeHref) {
      parts.push(
        <a
          key={`${keyPrefix}-link-${key++}`}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="console-link"
          onClick={(e) => e.stopPropagation()}
        >
          {safeHref}
        </a>,
      );
    } else {
      parts.push(match[1]);
    }
    if (trailing) parts.push(trailing);
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/** Render console text with ANSI colors + clickable links. */
export function renderConsoleText(text: string): ReactNode[] {
  const segments = parseAnsi(text);
  const nodes: ReactNode[] = [];

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    if (!segment.text) continue;
    const css = styleToCss(segment.style);
    nodes.push(
      <span key={`ansi-${index}`} className={css ? 'console-ansi' : undefined} style={css}>
        {renderLinkedText(segment.text, `s${index}`)}
      </span>,
    );
  }

  return nodes.length > 0 ? nodes : [''];
}
