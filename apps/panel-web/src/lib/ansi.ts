/** Lightweight ANSI SGR parser for console output. */

export type AnsiStyle = {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
  italic?: boolean;
};

export type AnsiSegment = {
  text: string;
  style: AnsiStyle;
};

const FG: Record<number, string> = {
  30: '#6b7280',
  31: '#f87171',
  32: '#4ade80',
  33: '#fbbf24',
  34: '#60a5fa',
  35: '#c084fc',
  36: '#22d3ee',
  37: '#e5e7eb',
  90: '#9ca3af',
  91: '#fca5a5',
  92: '#86efac',
  93: '#fde047',
  94: '#93c5fd',
  95: '#d8b4fe',
  96: '#67e8f9',
  97: '#ffffff',
};

const BG: Record<number, string> = {
  40: '#374151',
  41: '#7f1d1d',
  42: '#14532d',
  43: '#78350f',
  44: '#1e3a8a',
  45: '#581c87',
  46: '#164e63',
  47: '#6b7280',
  100: '#4b5563',
  101: '#991b1b',
  102: '#166534',
  103: '#a16207',
  104: '#1d4ed8',
  105: '#7e22ce',
  106: '#0e7490',
  107: '#d1d5db',
};

const ESC_TOKEN =
  /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b\[[\d;?]*[ -/]*[@-~]|\u001b./g;

function applySgr(style: AnsiStyle, codes: number[]): AnsiStyle {
  let next: AnsiStyle = { ...style };
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i] ?? 0;
    if (code === 0) {
      next = {};
      continue;
    }
    if (code === 1) {
      next.bold = true;
      continue;
    }
    if (code === 2) {
      next.dim = true;
      continue;
    }
    if (code === 3) {
      next.italic = true;
      continue;
    }
    if (code === 4) {
      next.underline = true;
      continue;
    }
    if (code === 22) {
      next.bold = false;
      next.dim = false;
      continue;
    }
    if (code === 23) {
      next.italic = false;
      continue;
    }
    if (code === 24) {
      next.underline = false;
      continue;
    }
    if (code === 39) {
      delete next.color;
      continue;
    }
    if (code === 49) {
      delete next.backgroundColor;
      continue;
    }
    if (code === 38 || code === 48) {
      const isFg = code === 38;
      const mode = codes[i + 1];
      if (mode === 5 && codes[i + 2] !== undefined) {
        const color = xterm256(codes[i + 2]!);
        if (isFg) next.color = color;
        else next.backgroundColor = color;
        i += 2;
        continue;
      }
      if (mode === 2 && codes[i + 4] !== undefined) {
        const color = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`;
        if (isFg) next.color = color;
        else next.backgroundColor = color;
        i += 4;
        continue;
      }
      continue;
    }
    if (FG[code]) {
      next.color = FG[code];
      continue;
    }
    if (BG[code]) {
      next.backgroundColor = BG[code];
    }
  }
  return next;
}

function xterm256(n: number): string {
  if (n < 0 || n > 255) return '#e5e7eb';
  if (n < 16) {
    const map = [
      '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
      '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
    ];
    return map[n]!;
  }
  if (n < 232) {
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const to = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `rgb(${to(r)},${to(g)},${to(b)})`;
  }
  const gray = 8 + (n - 232) * 10;
  return `rgb(${gray},${gray},${gray})`;
}

function stylesEqual(a: AnsiStyle, b: AnsiStyle): boolean {
  return (
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.dim) === Boolean(b.dim) &&
    Boolean(a.underline) === Boolean(b.underline) &&
    Boolean(a.italic) === Boolean(b.italic)
  );
}

function pushText(segments: AnsiSegment[], text: string, style: AnsiStyle) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && stylesEqual(last.style, style)) {
    last.text += text;
    return;
  }
  segments.push({ text, style: { ...style } });
}

/** Parse text containing ANSI sequences into styled segments (non-SGR escapes dropped). */
export function parseAnsi(input: string): AnsiSegment[] {
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const segments: AnsiSegment[] = [];
  let style: AnsiStyle = {};
  let cursor = 0;
  ESC_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ESC_TOKEN.exec(text)) !== null) {
    if (match.index > cursor) {
      pushText(segments, text.slice(cursor, match.index), style);
    }
    const token = match[0];
    if (token.startsWith('\u001b[') && token.endsWith('m')) {
      const params = token.slice(2, -1);
      const codes = params
        ? params.split(';').map((part) => {
            const n = Number(part);
            return Number.isFinite(n) ? n : 0;
          })
        : [0];
      style = applySgr(style, codes);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    pushText(segments, text.slice(cursor), style);
  }

  if (segments.length === 0) return [{ text: '', style: {} }];
  return segments;
}

/** Plain text with ANSI codes removed (for downloads / clipboard). */
export function stripAnsi(input: string): string {
  return parseAnsi(input)
    .map((s) => s.text)
    .join('');
}

/**
 * Drop cursor/clear/OSC noise but keep SGR color codes (`ESC[...m`)
 * so the console UI can render colors.
 */
export function keepAnsiColors(input: string): string {
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '');
  let out = '';
  let cursor = 0;
  ESC_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ESC_TOKEN.exec(text)) !== null) {
    out += text.slice(cursor, match.index);
    const token = match[0];
    if (token.startsWith('\u001b[') && token.endsWith('m')) {
      out += token;
    }
    cursor = match.index + token.length;
  }

  out += text.slice(cursor);
  return out;
}
